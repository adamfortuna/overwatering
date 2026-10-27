import { error } from '@sveltejs/kit';
import { DATASETS, loadParcels, loadRegions } from '#lib/data';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const ds = DATASETS.find((d) => d.id === params.dataset);
	if (!ds) error(404, 'unknown dataset');
	const [{ parcels, imagery }, regions] = await Promise.all([loadParcels(fetch, params.dataset), loadRegions(fetch, params.dataset, params.id)]);
	const parcel = parcels.find((p) => p.parcel_id === params.id);
	if (!parcel) error(404, 'unknown parcel');
	return { ds, parcel, regions, imagery };
};
