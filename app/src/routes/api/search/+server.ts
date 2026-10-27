import { error, json } from '@sveltejs/kit';
import { SEARCH_GROUPS, getJson, parcelLayer, parseAddress, sqlString } from '#lib/server/ugrc.ts';
import type { RequestHandler } from './$types';

export type SearchHit = { address: string; city: string; county: string; parcel_id: string; prop_class: string };

// Address search over UGRC's county parcel layers (Parcels_<County>_LIR). Statewide
// address-point layers skip Salt Lake County, so parcels are the reliable index.
// ?group=0..4 picks a slice of counties (see SEARCH_GROUPS); the client queries all five.
export const GET: RequestHandler = async ({ url }) => {
	const group = Number(url.searchParams.get('group') ?? '0');
	if (!Number.isInteger(group) || !SEARCH_GROUPS[group]) error(400, 'bad group');
	const { street, city } = parseAddress(url.searchParams.get('q') ?? '');
	if (street.length < 4 || !/\d/.test(street)) return json({ hits: [] });
	let where = `PARCEL_ADD LIKE ${sqlString(street + '%')}`;
	if (city) where += ` AND UPPER(PARCEL_CITY) LIKE ${sqlString('%' + city + '%')}`;
	const settled = await Promise.allSettled(
		SEARCH_GROUPS[group].map(async (county) => {
			const q = new URLSearchParams({ where, outFields: 'PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PROP_CLASS', returnGeometry: 'false', resultRecordCount: '8', f: 'json' });
			const j = await getJson(`${parcelLayer(county)}/query?${q}`, 8000);
			return (j.features ?? []).map((f: { attributes: Record<string, string> }) => ({
				address: f.attributes.PARCEL_ADD,
				city: f.attributes.PARCEL_CITY ?? '',
				county,
				parcel_id: String(f.attributes.PARCEL_ID),
				prop_class: f.attributes.PROP_CLASS ?? ''
			}));
		})
	);
	const seen = new Set<string>();
	const hits: SearchHit[] = settled
		.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
		.filter((h: SearchHit) => !seen.has(h.county + h.parcel_id) && seen.add(h.county + h.parcel_id));
	const rank = (h: SearchHit) => (/resid/i.test(h.prop_class) ? 0 : 1);
	hits.sort((a, b) => rank(a) - rank(b) || a.address.localeCompare(b.address));
	const failed = settled.filter((s) => s.status === 'rejected').length;
	return json({ hits: hits.slice(0, 10), failed }, { headers: { 'cache-control': 'public, max-age=3600' } });
};
