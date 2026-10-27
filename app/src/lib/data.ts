import type * as GeoJSON from 'geojson';
export type Parcel = {
	parcel_id: string;
	address: string;
	prop_type: string;
	parcel_sqft: number;
	lawn_sqft: number;
	lawn_lo_sqft: number;
	lawn_hi_sqft: number;
	canopy_sqft: number;
	building_sqft: number;
	green_sqft: number;
	lawn_frac: number;
	canopy_frac: number;
	building_frac: number;
	confidence: 'high' | 'medium' | 'low';
	imagery_source: string;
	imagery_date: string;
	gsd_m: number;
	crop_corners: [number, number][];
	bounds: [number, number, number, number];
	centroid: [number, number];
	n_regions: number;
};
export type Dataset = { id: string; name: string; city: string; note: string; utah: boolean };
export type RegionCls = 'lawn' | 'canopy' | 'building' | 'other' | 'converted';
export type RegionFeature = { type: 'Feature'; properties: { cls: RegionCls; sqft: number; idx?: number; original?: RegionCls }; geometry: GeoJSON.Geometry };

export const DATASETS: Dataset[] = [
	{ id: 'sandy', name: 'Sandy, Utah', city: 'Sandy', note: 'Real Salt Lake County parcels and Overture footprints on 60 cm NAIP (USDA, flown July 7, 2024). Not yet validated against a tape-measured lawn.', utah: true },
	{ id: 'home', name: 'Salt Lake City (East Central, 84102)', city: 'Salt Lake City', note: 'UGRC Salt Lake County parcels on 60 cm NAIP (July 7, 2024). Older lots with heavy tree canopy: grass under trees is counted as canopy, not lawn. Park strips are public right-of-way and sit outside the parcel.', utah: true }
];

export async function loadParcels(fetchFn: typeof fetch, dataset: string) {
	const r = await fetchFn(`/data/${dataset}/parcels.json`);
	if (!r.ok) throw new Error(`no dataset ${dataset}`);
	return (await r.json()) as { imagery: { source: string; date: string; gsd_m: number }; parcels: Parcel[] };
}
export async function loadRegions(fetchFn: typeof fetch, dataset: string, parcelId: string) {
	const r = await fetchFn(`/data/${dataset}/regions/${parcelId}.geojson`);
	if (!r.ok) throw new Error('no regions');
	const fc = (await r.json()) as { type: 'FeatureCollection'; features: RegionFeature[] };
	fc.features.forEach((f, i) => {
		f.properties.idx = i;
		f.properties.original = f.properties.cls;
	});
	return fc;
}
