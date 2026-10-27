import { DATASETS, loadParcels } from '#lib/data.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const dataset = url.searchParams.get('d') ?? 'sandy';
	const data = await loadParcels(fetch, dataset);
	return { dataset, datasets: DATASETS, ...data };
};
