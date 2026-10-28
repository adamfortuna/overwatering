// On-demand lawn detection for any Utah parcel, in the browser. A port of the Python pipeline
// (pipeline/lawn.py + export_app.py) for one lot:
//   parcel (UGRC LIR) -> 0.6 m UTM grid -> 2024 NAIP RGB + NIR (USDA, via /api/naip)
//   -> haze-corrected NDVI -> minus buildings (UGRC footprints, +0.5 m) and tree canopy
//   (Meta CHM >= 2.5 m) -> per-class areas + tappable regions.
import { decode } from 'fast-png';
import type { Parcel, RegionCls, RegionFeature } from './data.ts';
import type { EtoTable } from './water.ts';
import etoUtah from './eto_utah.json';

const GSD = 0.6;
const MARGIN_M = 6;
const NDVI_THR = 0.3;
const CANOPY_MIN_M = 2.5;
const BUILDING_BUFFER_M = 0.5;
const SQFT_PER_SQM = 10.763910416709722;
const UTM12 = '+proj=utm +zone=12 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const CHM = (qk: string) => `https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/tge-labs/meta-chm-v2/chm/${qk}.tif`;
const CLS_CODE: Record<number, RegionCls> = { 0: 'other', 1: 'lawn', 2: 'canopy', 3: 'building' };

type Ring = [number, number][];
type Poly = Ring[];
export type LiveResult = {
	parcel: Parcel;
	regions: { type: 'FeatureCollection'; features: RegionFeature[] };
	imageUrl: string;
	imagery: { source: string; date: string; gsd_m: number };
	city: string;
	county: string;
	propClass: string;
	eto: EtoTable & { annual_eto_in: number; place: string };
	canopyMissing: boolean;
};

export class LiveError extends Error {}

export async function analyzeParcel(county: string, id: string, step: (msg: string) => void = () => {}): Promise<LiveResult> {
	step('Finding the lot');
	const pr = await fetch(`/api/parcel?county=${encodeURIComponent(county)}&id=${encodeURIComponent(id)}`);
	if (!pr.ok) throw new LiveError(pr.status === 404 ? "We couldn't find that parcel." : 'The parcel service is not answering right now.');
	const { feature } = await pr.json();
	const attrs = feature.properties as Record<string, string | number | null>;

	const proj4 = (await import('proj4')).default;
	const toUtm = proj4('EPSG:4326', UTM12);
	const lonlatPolys: Poly[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
	const utmPolys: Poly[] = lonlatPolys.map((p) => p.map((ring) => ring.map((c) => toUtm.forward(c as [number, number]) as [number, number])));
	const all = utmPolys.flat(2);
	const minx = Math.min(...all.map((c) => c[0])), maxx = Math.max(...all.map((c) => c[0]));
	const miny = Math.min(...all.map((c) => c[1])), maxy = Math.max(...all.map((c) => c[1]));
	const parcelSqm = utmPolys.reduce((s, p) => s + Math.abs(ringArea(p[0])) - p.slice(1).reduce((h, r) => h + Math.abs(ringArea(r)), 0), 0);

	// Pixel grid snapped to 0.6 m, with the same 6 m margin the pipeline's crops use.
	const x0 = Math.floor((minx - MARGIN_M) / GSD) * GSD, x1 = Math.ceil((maxx + MARGIN_M) / GSD) * GSD;
	const y0 = Math.floor((miny - MARGIN_M) / GSD) * GSD, y1 = Math.ceil((maxy + MARGIN_M) / GSD) * GSD;
	const w = Math.round((x1 - x0) / GSD), h = Math.round((y1 - y0) / GSD);
	if (w > 1300 || h > 1300) throw new LiveError('This parcel is too big for a quick scan (over ~750 m across).');
	const toPx = ([x, y]: [number, number]): [number, number] => [(x - x0) / GSD, (y1 - y) / GSD];
	const toLonLat = (x: number, y: number) => toUtm.inverse([x, y]) as [number, number];
	const corners = [toLonLat(x0, y1), toLonLat(x1, y1), toLonLat(x1, y0), toLonLat(x0, y0)];
	const lons = corners.map((c) => c[0]), lats = corners.map((c) => c[1]);
	const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
	const [clon, clat] = toLonLat(cx, cy);

	step('Fetching 2024 aerial imagery');
	const bbox = [x0, y0, x1, y1].map((v) => v.toFixed(2)).join(',');
	const ctx = [cx - 800, cy - 800, cx + 800, cy + 800].map((v) => v.toFixed(2)).join(',');
	const [rgbBuf, nrgBuf, ctxBuf, bldg, info] = await Promise.all([
		fetchBuf(`/api/naip?bbox=${bbox}&size=${w},${h}&bands=rgb`),
		fetchBuf(`/api/naip?bbox=${bbox}&size=${w},${h}&bands=nrg`),
		fetchBuf(`/api/naip?bbox=${ctx}&size=400,400&bands=nrg&interp=nearest`),
		fetch(`/api/buildings?bbox=${[Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)].map((v) => v.toFixed(6)).join(',')}`).then((r) => (r.ok ? r.json() : { features: [] })),
		naipInfo(clon, clat)
	]);
	const rgb = decode(rgbBuf), nrg = decode(nrgBuf), ctxImg = decode(ctxBuf);

	step('Spotting the grass');
	// Haze: dark-object subtraction (0.1th percentile per band) like the pipeline, which uses its
	// whole 2-4 km scene. Here: a 1.6 km window sampled nearest-neighbour at 4 m (raw pixels, so
	// shadows aren't averaged away); this lands within a few DN of the scene value.
	const dark = darkObject(ctxImg.data as Uint8Array, ctxImg.channels);
	const n = w * h;
	const ndvi = new Float32Array(n);
	const nodata = new Uint8Array(n);
	for (let i = 0; i < n; i++) {
		const nir = Math.max(nrg.data[i * nrg.channels] - dark.nir, 0);
		const red = Math.max(nrg.data[i * nrg.channels + 1] - dark.red, 0);
		ndvi[i] = nir + red > 0 ? (nir - red) / (nir + red) : 0;
		const o = i * rgb.channels;
		nodata[i] = Math.max(rgb.data[o], rgb.data[o + 1], rgb.data[o + 2]) === 0 ? 1 : 0;
	}

	const inParcel = rasterize(w, h, utmPolys.map((p) => p.map((r) => r.map(toPx))), 0);
	const bPolys: Poly[] = (bldg.features ?? []).flatMap((f: { geometry: { type: string; coordinates: unknown } }) =>
		f.geometry.type === 'Polygon' ? [f.geometry.coordinates as Poly] : f.geometry.type === 'MultiPolygon' ? (f.geometry.coordinates as Poly[]) : []
	);
	const building = rasterize(w, h, bPolys.map((p) => p.map((r) => r.map((c) => toPx(toUtm.forward(c) as [number, number])))), BUILDING_BUFFER_M / GSD);

	step('Checking for trees');
	let canopyMissing = false;
	let chm: Float32Array;
	try {
		chm = await canopyHeights(w, h, x0, y1, toLonLat);
	} catch {
		chm = new Float32Array(n);
		canopyMissing = true;
	}

	step('Measuring');
	const cls = new Uint8Array(n);
	let total = 0, lawnN = 0, greenN = 0, treeN = 0, bldgN = 0, loN = 0, hiN = 0, ambN = 0, nodataN = 0;
	for (let i = 0; i < n; i++) {
		const tree = chm[i] >= CANOPY_MIN_M;
		const b = building[i] === 1;
		const green = ndvi[i] > NDVI_THR && !nodata[i];
		cls[i] = b ? 3 : tree ? 2 : green ? 1 : 0;
		if (!inParcel[i]) continue;
		total++;
		if (green && !b && !tree) lawnN++;
		if (green && !b) greenN++;
		if (tree && !b) treeN++;
		if (b) bldgN++;
		if (ndvi[i] > NDVI_THR + 0.05 && !b && !tree) loN++;
		if (ndvi[i] > NDVI_THR - 0.05 && !b && !tree) hiN++;
		if (Math.abs(ndvi[i] - NDVI_THR) < 0.05 && !b && !tree && !nodata[i]) ambN++;
		if (nodata[i]) nodataN++;
	}
	const parcelSqft = Math.round(parcelSqm * SQFT_PER_SQM);
	const frac = (k: number) => (total ? k / total : 0);
	const sqft = (k: number) => Math.round(frac(k) * parcelSqft);
	const ambiguous = frac(ambN);
	const confidence: Parcel['confidence'] =
		total < 30 || frac(nodataN) > 0.2 ? 'low' : ambiguous < 0.08 && total >= 200 ? 'high' : ambiguous < 0.2 ? 'medium' : 'low';

	const regions = await traceRegions(cls, inParcel, w, h, (px, py) => toLonLat(x0 + px * GSD, y1 - py * GSD));

	const lonlatAll = lonlatPolys.flat(2);
	const pl = lonlatAll.map((c) => c[0]), pt = lonlatAll.map((c) => c[1]);
	const ringCentroid = lonlatPolys[0][0].reduce((a, c) => [a[0] + c[0] / lonlatPolys[0][0].length, a[1] + c[1] / lonlatPolys[0][0].length], [0, 0]);
	const date = (info as { date?: string }).date ?? '2024';
	const parcel: Parcel = {
		parcel_id: String(attrs.PARCEL_ID),
		address: String(attrs.PARCEL_ADD ?? 'Address unknown'),
		prop_type: String(attrs.PROP_CLASS ?? ''),
		parcel_sqft: parcelSqft,
		lawn_sqft: sqft(lawnN),
		lawn_lo_sqft: sqft(loN),
		lawn_hi_sqft: sqft(hiN),
		canopy_sqft: sqft(treeN),
		building_sqft: sqft(bldgN),
		green_sqft: sqft(greenN),
		lawn_frac: frac(lawnN),
		canopy_frac: frac(treeN),
		building_frac: frac(bldgN),
		confidence,
		imagery_source: 'naip-usda',
		imagery_date: date,
		gsd_m: GSD,
		crop_corners: corners,
		bounds: [Math.min(...pl), Math.min(...pt), Math.max(...pl), Math.max(...pt)],
		centroid: [ringCentroid[0], ringCentroid[1]],
		n_regions: regions.features.length
	};
	const rgbBlob = new Blob([rgbBuf], { type: 'image/png' });
	return {
		parcel,
		regions,
		imageUrl: URL.createObjectURL(rgbBlob),
		imagery: { source: 'naip-usda', date, gsd_m: GSD },
		city: String(attrs.PARCEL_CITY ?? ''),
		county,
		propClass: String(attrs.PROP_CLASS ?? ''),
		eto: etoForPoint(county, clon, clat),
		canopyMissing
	};
}

// USDA's image service, called straight from the browser when our proxy can't reach it (it allows
// CORS from overwater.ing). In Oct 2026 usda.gov's DNSSEC broke: validating resolvers, Cloudflare's
// included, can't look the host up, but many home and office resolvers still can.
const USDA_NAIP = 'https://apps.geo.fpac.usda.gov/geo-imagery/rest/services/naip/conus_naip/ImageServer';
const BAND_IDS: Record<string, string> = { rgb: '0,1,2', nrg: '3,0,1' };

async function fetchBuf(url: string) {
	let r = await fetch(url).catch(() => null);
	if (!r?.ok && url.startsWith('/api/naip?')) {
		const p = new URL(url, location.href).searchParams;
		const q = new URLSearchParams({ bbox: p.get('bbox')!, bboxSR: '26912', imageSR: '26912', size: p.get('size')!, format: 'png', bandIds: BAND_IDS[p.get('bands')!], interpolation: p.get('interp') === 'nearest' ? 'RSP_NearestNeighbor' : 'RSP_BilinearInterpolation', f: 'image' });
		r = await fetch(`${USDA_NAIP}/exportImage?${q}`).catch(() => null);
	}
	if (!r?.ok) throw new LiveError('The 2024 aerial imagery service is not answering right now. Try again in a minute.');
	return new Uint8Array(await r.arrayBuffer());
}

async function naipInfo(lon: number, lat: number): Promise<{ year?: number; date?: string; item?: string }> {
	const r = await fetch(`/api/naip-info?lon=${lon.toFixed(6)}&lat=${lat.toFixed(6)}`).catch(() => null);
	if (r?.ok) return r.json();
	try {
		const q = new URLSearchParams({ geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryPoint', returnCatalogItems: 'true', returnGeometry: 'false', f: 'json' });
		const j = await (await fetch(`${USDA_NAIP}/identify?${q}`)).json();
		const best = (j.catalogItems?.features ?? []).map((f: { attributes: Record<string, number> }) => f.attributes).filter((a: Record<string, number>) => a.QQDATE).sort((a: Record<string, number>, b: Record<string, number>) => b.year_ts - a.year_ts)[0];
		return best ? { year: best.year_ts, date: new Date(best.QQDATE).toISOString().slice(0, 10), item: String(best.Name) } : {};
	} catch {
		return {};
	}
}

function ringArea(r: Ring) {
	let a = 0;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
	return a / 2;
}

/** 0.1th percentile of NIR (channel 0) and red (channel 1) over non-empty pixels. */
function darkObject(data: Uint8Array, channels: number) {
	const hn = new Uint32Array(256), hr = new Uint32Array(256);
	let count = 0;
	for (let i = 0; i < data.length; i += channels) {
		if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) continue;
		hn[data[i]]++;
		hr[data[i + 1]]++;
		count++;
	}
	const pct = (hist: Uint32Array) => {
		const target = Math.max(1, count * 0.001);
		let c = 0;
		for (let v = 0; v < 256; v++) if ((c += hist[v]) >= target) return v;
		return 0;
	};
	return { nir: pct(hn), red: pct(hr) };
}

/** Polygons (pixel coords) -> 0/1 mask at pixel centers, optionally grown by `buffer` px. */
function rasterize(w: number, h: number, polys: Poly[], buffer: number) {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const g = canvas.getContext('2d', { willReadFrequently: true })!;
	g.fillStyle = '#000';
	g.strokeStyle = '#000';
	g.lineJoin = 'round';
	g.lineWidth = buffer * 2;
	for (const p of polys) {
		g.beginPath();
		for (const ring of p) {
			ring.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
			g.closePath();
		}
		g.fill('evenodd');
		if (buffer > 0) g.stroke();
	}
	const a = g.getImageData(0, 0, w, h).data;
	const out = new Uint8Array(w * h);
	for (let i = 0; i < out.length; i++) out[i] = a[i * 4 + 3] > 127 ? 1 : 0;
	return out;
}

// Meta CHM v2 tiles: zoom-10 web-mercator quadkeys, 32768 px of ~1.19 m, uint8 metres.
const WORLD = 40075016.685578488;
function quadkey(x: number, y: number, z = 10) {
	let q = '';
	for (let i = z; i > 0; i--) {
		const m = 1 << (i - 1);
		q += String((x & m ? 1 : 0) + (y & m ? 2 : 0));
	}
	return q;
}
const merc = (lon: number, lat: number): [number, number] => [(lon * Math.PI * 6378137) / 180, 6378137 * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];

async function canopyHeights(w: number, h: number, x0: number, y1: number, toLonLat: (x: number, y: number) => [number, number]) {
	const { fromUrl } = await import('geotiff');
	// UTM -> web mercator is effectively affine across one lot: fit it from three corners.
	const p00 = merc(...toLonLat(x0, y1)), p10 = merc(...toLonLat(x0 + w * GSD, y1)), p01 = merc(...toLonLat(x0, y1 - h * GSD));
	const at = (px: number, py: number): [number, number] => [
		p00[0] + ((p10[0] - p00[0]) * px) / w + ((p01[0] - p00[0]) * py) / h,
		p00[1] + ((p10[1] - p00[1]) * px) / w + ((p01[1] - p00[1]) * py) / h
	];
	const tileSize = WORLD / 1024, res = tileSize / 32768;
	const tileOf = ([mx, my]: [number, number]) => [Math.floor((mx + WORLD / 2) / tileSize), Math.floor((WORLD / 2 - my) / tileSize)];
	const cornersM = [at(0, 0), at(w, 0), at(0, h), at(w, h)];
	const tiles = new Map(cornersM.map((c) => [tileOf(c).join(','), tileOf(c)]));
	const out = new Float32Array(w * h);
	for (const [tx, ty] of tiles.values()) {
		const minX = -WORLD / 2 + tx * tileSize, maxY = WORLD / 2 - ty * tileSize;
		const cols = cornersM.map((c) => Math.floor((c[0] - minX) / res)), rows = cornersM.map((c) => Math.floor((maxY - c[1]) / res));
		const c0 = Math.max(0, Math.min(...cols) - 2), c1 = Math.min(32767, Math.max(...cols) + 2);
		const r0 = Math.max(0, Math.min(...rows) - 2), r1 = Math.min(32767, Math.max(...rows) + 2);
		if (c1 < c0 || r1 < r0) continue;
		const tiff = await fromUrl(CHM(quadkey(tx, ty)));
		const img = await tiff.getImage();
		const [band] = (await img.readRasters({ window: [c0, r0, c1 + 1, r1 + 1], samples: [0] })) as unknown as ArrayLike<number>[];
		const ww = c1 + 1 - c0;
		for (let py = 0; py < h; py++)
			for (let px = 0; px < w; px++) {
				const [mx, my] = at(px + 0.5, py + 0.5);
				const col = Math.floor((mx - minX) / res), row = Math.floor((maxY - my) / res);
				if (col < c0 || col > c1 || row < r0 || row > r1) continue;
				out[py * w + px] = band[(row - r0) * ww + (col - c0)];
			}
	}
	return out;
}

/** Class grid -> one GeoJSON polygon per connected patch (lawn, trees, buildings, other) inside the parcel. */
async function traceRegions(cls: Uint8Array, inParcel: Uint8Array, w: number, h: number, toLonLat: (px: number, py: number) => [number, number]) {
	const { contours } = await import('d3-contour');
	const gen = contours().size([w, h]).thresholds([0.5]);
	const features: RegionFeature[] = [];
	for (const code of [1, 2, 3, 0]) {
		const values = new Float64Array(w * h);
		for (let i = 0; i < values.length; i++) values[i] = inParcel[i] && cls[i] === code ? 1 : 0;
		const [mp] = gen(values as unknown as number[]);
		for (const poly of mp.coordinates as Poly[]) {
			const areaPx = Math.abs(ringArea(poly[0])) - poly.slice(1).reduce((s, r) => s + Math.abs(ringArea(r)), 0);
			const sqft = Math.round(areaPx * GSD * GSD * SQFT_PER_SQM);
			if (sqft < 10) continue;
			features.push({
				type: 'Feature',
				properties: { cls: CLS_CODE[code], sqft },
				geometry: { type: 'Polygon', coordinates: poly.map((ring) => ring.map(([x, y]) => toLonLat(x, y))) }
			});
		}
	}
	return { type: 'FeatureCollection' as const, features };
}

function etoForPoint(county: string, lon: number, lat: number) {
	const pts = etoUtah.points;
	const same = pts.find((p) => p.county === county);
	const nearest = pts.reduce((a, b) => (Math.hypot(b.lon - lon, b.lat - lat) < Math.hypot(a.lon - lon, a.lat - lat) ? b : a));
	const p = same ?? nearest;
	return { eto_in: p.eto_in, precip_in: p.precip_in, annual_eto_in: p.annual_eto_in, place: p.place } as unknown as EtoTable & { annual_eto_in: number; place: string };
}
