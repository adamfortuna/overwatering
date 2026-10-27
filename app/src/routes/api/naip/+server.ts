import { error } from '@sveltejs/kit';
import { USDA_NAIP } from '#lib/server/ugrc.ts';
import type { RequestHandler } from './$types';

// Proxy for a small window of 2024 NAIP as lossless PNG (UTM 12N / NAD83).
//   bands=rgb -> true color for display; bands=nrg -> NIR, red, green for NDVI.
// Limits keep this to lot-sized requests inside Utah.
const BANDS = { rgb: '0,1,2', nrg: '3,0,1' } as const;

export const GET: RequestHandler = async ({ url, request }) => {
	const bbox = (url.searchParams.get('bbox') ?? '').split(',').map(Number);
	const size = (url.searchParams.get('size') ?? '').split(',').map(Number);
	const bands = url.searchParams.get('bands') as keyof typeof BANDS;
	if (bbox.length !== 4 || bbox.some((v) => !Number.isFinite(v))) error(400, 'bad bbox');
	if (size.length !== 2 || size.some((v) => !Number.isInteger(v) || v < 8 || v > 1400)) error(400, 'bad size');
	if (!BANDS[bands]) error(400, 'bad bands');
	const [x0, y0, x1, y1] = bbox;
	if (!(x1 > x0 && y1 > y0) || x0 < 150_000 || x1 > 800_000 || y0 < 4_000_000 || y1 > 4_700_000) error(400, 'outside Utah');
	if ((x1 - x0) * (y1 - y0) > 4_000_000) error(400, 'window too large');
	// nearest: raw pixel samples (used for the haze estimate over a wider area); default bilinear.
	const interp = url.searchParams.get('interp') === 'nearest' ? 'RSP_NearestNeighbor' : 'RSP_BilinearInterpolation';

	const q = new URLSearchParams({
		bbox: bbox.join(','),
		bboxSR: '26912',
		imageSR: '26912',
		size: size.join(','),
		format: 'png',
		bandIds: BANDS[bands],
		interpolation: interp,
		f: 'image'
	});
	const upstream = `${USDA_NAIP}/exportImage?${q}`;
	const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
	const key = new Request(new URL(`/naip-cache?${q}`, request.url));
	const hit = await cache?.match(key);
	if (hit) return hit;
	const r = await fetch(upstream, { signal: AbortSignal.timeout(20000) });
	if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) error(502, 'imagery service unavailable');
	const res = new Response(r.body, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=604800' } });
	if (cache) await cache.put(key, res.clone());
	return res;
};
