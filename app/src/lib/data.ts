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
	{ id: 'sandy', name: 'Sandy, Utah', city: 'Sandy', note: 'Real Salt Lake County parcels and footprints. Imagery is the 10 m Sentinel-2 fallback until NAIP access is unblocked, so per-parcel numbers are indicative.', utah: true },
	{ id: 'philly', name: 'Philadelphia (pipeline test)', city: 'Philadelphia', note: '23 cm 4-band NAIP with real parcels and footprints. Used to validate the 60 cm code path; not a Utah neighborhood.', utah: false }
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
