import { error, json } from '@sveltejs/kit';
import { USDA_NAIP, getJson } from '#lib/server/ugrc.ts';
import type { RequestHandler } from './$types';

// Which NAIP quarter-quad (and flight date) covers a point; Utah 2024 was flown over several days.
export const GET: RequestHandler = async ({ url }) => {
	const lon = Number(url.searchParams.get('lon'));
	const lat = Number(url.searchParams.get('lat'));
	if (!(lon > -114.1 && lon < -109 && lat > 36.9 && lat < 42.1)) error(400, 'outside Utah');
	const q = new URLSearchParams({
		geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }),
		geometryType: 'esriGeometryPoint',
		returnCatalogItems: 'true',
		returnGeometry: 'false',
		f: 'json'
	});
	const j = await getJson(`${USDA_NAIP}/identify?${q}`, 10000);
	const items = (j.catalogItems?.features ?? []).map((f: { attributes: Record<string, unknown> }) => f.attributes).filter((a: Record<string, unknown>) => a.QQDATE);
	const best = items.sort((a: Record<string, number>, b: Record<string, number>) => b.year_ts - a.year_ts)[0];
	if (!best) return json({ year: null, date: null });
	return json({ year: best.year_ts, date: new Date(best.QQDATE).toISOString().slice(0, 10), item: best.Name }, { headers: { 'cache-control': 'public, max-age=604800' } });
};
