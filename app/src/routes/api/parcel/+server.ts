import { error, json } from '@sveltejs/kit';
import { getJson, isCounty, parcelLayer, sqlString } from '#lib/server/ugrc.ts';
import type { RequestHandler } from './$types';

// One parcel (polygon in WGS84 + tax-roll attributes) from the county's UGRC LIR layer.
export const GET: RequestHandler = async ({ url }) => {
	const county = url.searchParams.get('county');
	const id = url.searchParams.get('id') ?? '';
	if (!isCounty(county)) error(400, 'unknown county');
	if (!/^[A-Za-z0-9:.\-]{1,40}$/.test(id)) error(400, 'bad parcel id');
	const q = new URLSearchParams({
		where: `PARCEL_ID = ${sqlString(id)}`,
		outFields: 'PARCEL_ID,PARCEL_ADD,PARCEL_CITY,PROP_CLASS,PARCEL_ACRES,BUILT_YR,BLDG_SQFT',
		outSR: '4326',
		f: 'geojson'
	});
	const fc = await getJson(`${parcelLayer(county)}/query?${q}`);
	const f = fc.features?.[0];
	if (!f) error(404, 'parcel not found');
	return json({ county, feature: f }, { headers: { 'cache-control': 'public, max-age=86400' } });
};
