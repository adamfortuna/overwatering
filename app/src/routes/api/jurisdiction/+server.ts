import { error, json } from '@sveltejs/kit';
import { COUNTIES, getJson } from '#lib/server/ugrc.ts';
import type { RequestHandler } from './$types';

// Who governs and waters a point: municipality (UGRC), retail culinary water provider and the
// wholesale districts behind it (Utah Division of Water Resources). Rebate eligibility follows
// the municipality; the provider and districts explain where the money comes from.
const MUNI = 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahMunicipalBoundaries/FeatureServer/0';
const RETAIL = 'https://services.arcgis.com/ZzrwjTRez6FJiOq4/arcgis/rest/services/CulinaryWaterServiceAreas/FeatureServer/0';
const WHOLESALE = 'https://services.arcgis.com/ZzrwjTRez6FJiOq4/arcgis/rest/services/WholesaleCulinaryWaterSuppliers/FeatureServer/0';

export type Jurisdiction = { municipality: string | null; county: string | null; provider: string | null; wholesalers: string[] };

export const GET: RequestHandler = async ({ url }) => {
	const lon = Number(url.searchParams.get('lon'));
	const lat = Number(url.searchParams.get('lat'));
	if (!(lon > -114.1 && lon < -109 && lat > 36.9 && lat < 42.1)) error(400, 'outside Utah');
	const at = (layer: string, fields: string) =>
		getJson(`${layer}/query?${new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: fields, returnGeometry: 'false', f: 'json' })}`, 8000)
			.then((j) => (j.features ?? []).map((f: { attributes: Record<string, string> }) => f.attributes))
			.catch(() => []);
	const [muni, retail, whole] = await Promise.all([at(MUNI, 'NAME,COUNTYNBR'), at(RETAIL, 'WRENAME,DWNAME,WHOLESALER,COUNTY,STATUS'), at(WHOLESALE, 'SYSTEMNAME,STATUS')]);
	const m = muni[0];
	const r = retail.find((x: Record<string, string>) => x.STATUS === 'A') ?? retail[0];
	const tidy = (s: string) => s.split('/')[0].replace(/\s+-\s+.*$/, '').replace(/\bWCD\b/, 'Water Conservancy District').trim();
	const wholesalers = [...new Set([r?.WHOLESALER, ...whole.filter((w: Record<string, string>) => w.STATUS === 'A').map((w: Record<string, string>) => w.SYSTEMNAME)].filter(Boolean).map(tidy))]
		// Districts and public water systems only (drops e.g. an industrial supplier's zone).
		.filter((n) => /district|water|city|town/i.test(n)) as string[];
	const out: Jurisdiction = {
		municipality: m?.NAME ?? null,
		county: m ? (COUNTIES[Number(m.COUNTYNBR) - 1] ?? null) : (r?.COUNTY ?? null),
		provider: r ? (r.WRENAME || r.DWNAME) : null,
		wholesalers
	};
	return json(out, { headers: { 'cache-control': 'public, max-age=86400' } });
};
