import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({ county: params.county, id: params.id });
