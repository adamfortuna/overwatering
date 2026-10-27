import { error } from '@sveltejs/kit';
import { DATASETS, loadParcels } from '#lib/data.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const ds = DATASETS.find((d) => d.id === params.dataset);
	if (!ds) error(404, 'unknown dataset');
	const [{ parcels, imagery }, geo, nb] = await Promise.all([
		loadParcels(fetch, params.dataset),
		fetch(`/data/${params.dataset}/parcels.geojson`).then((r) => r.json()),
		fetch(`/data/${params.dataset}/neighborhood.json`).then((r) => r.json())
	]);
	return { ds, parcels, imagery, geo, nb };
};
