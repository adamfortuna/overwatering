import { error, json } from '@sveltejs/kit';
import { BUILDINGS, getJson } from '#lib/server/ugrc.ts';
import type { RequestHandler } from './$types';

// Building footprints (UGRC statewide Buildings layer) for a lot-sized WGS84 envelope.
export const GET: RequestHandler = async ({ url }) => {
	const b = (url.searchParams.get('bbox') ?? '').split(',').map(Number);
	if (b.length !== 4 || b.some((v) => !Number.isFinite(v))) error(400, 'bad bbox');
	const [x0, y0, x1, y1] = b;
	if (!(x1 > x0 && y1 > y0) || x1 - x0 > 0.02 || y1 - y0 > 0.02 || x0 < -114.1 || x1 > -109 || y0 < 36.9 || y1 > 42.1) error(400, 'bad bbox');
	const q = new URLSearchParams({
		geometry: b.join(','),
		geometryType: 'esriGeometryEnvelope',
		inSR: '4326',
		spatialRel: 'esriSpatialRelIntersects',
		outFields: 'OBJECTID',
		outSR: '4326',
		f: 'geojson'
	});
	const fc = await getJson(`${BUILDINGS}/query?${q}`);
	return json({ type: 'FeatureCollection', features: fc.features ?? [] }, { headers: { 'cache-control': 'public, max-age=86400' } });
};
