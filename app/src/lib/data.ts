import type * as GeoJSON from 'geojson';
import etoSlc from './eto_slc_ut.json';
import etoSandy from './eto_sandy_ut.json';
import etoUtah from './eto_utah.json';
import type { EtoTable } from './water.ts';
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
export type Dataset = { id: string; name: string; short: string; city: string; note: string; utah: boolean; eto: 'slc' | 'sandy' };
export type RegionCls = 'lawn' | 'canopy' | 'building' | 'other' | 'converted';
export type RegionFeature = { type: 'Feature'; properties: { cls: RegionCls; sqft: number; idx?: number; original?: RegionCls }; geometry: GeoJSON.Geometry };

const SLC_NOTE = 'UGRC Salt Lake County parcels on 60 cm NAIP (USDA, flown July 7, 2024). Grass under tree canopy is counted as trees, not lawn. Park strips are city right-of-way and sit outside the parcel.';

// Every dataset the app knows how to label. Which ones are actually built comes from
// /data/index.json (written by scripts/build-data.sh), so missing ones just don't show.
export const DATASETS: Dataset[] = [
	{ id: '84102', name: '84102: East Central and Central City', short: '84102', city: 'Salt Lake City', note: SLC_NOTE, utah: true, eto: 'slc' },
	{ id: 'central-city', name: 'Central City', short: 'Central City', city: 'Salt Lake City', note: SLC_NOTE, utah: true, eto: 'slc' },
	{ id: 'liberty-wells', name: 'Liberty Wells', short: 'Liberty Wells', city: 'Salt Lake City', note: SLC_NOTE, utah: true, eto: 'slc' },
	{ id: 'downtown', name: 'Downtown', short: 'Downtown', city: 'Salt Lake City', note: SLC_NOTE + ' Downtown is mostly apartments and condos, which have no lot of their own, so only the few dozen houses and duplexes are counted.', utah: true, eto: 'slc' },
	{ id: 'avenues', name: 'The Avenues', short: 'Avenues', city: 'Salt Lake City', note: SLC_NOTE + ' Clipped to the developed blocks of the Greater Avenues council area.', utah: true, eto: 'slc' },
	{ id: 'sandy', name: 'Sandy (suburban comparison)', short: 'Sandy', city: 'Sandy', note: 'Salt Lake County Recorder parcels (2022 fabric) and Overture footprints on 60 cm NAIP (July 7, 2024).', utah: true, eto: 'sandy' }
];

export const etoFor = (ds: Dataset): EtoTable => (ds.eto === 'slc' ? etoSlc : etoSandy) as EtoTable;

/** 'slc' | 'sandy' (prebuilt datasets) or a county name (eto_utah.json points). */
export function etoByKey(key: string): EtoTable & { annual_eto_in: number; place: string } {
	if (key === 'slc') return { ...(etoSlc as unknown as EtoTable), annual_eto_in: etoSlc.annual_eto_in, place: 'Salt Lake City' };
	if (key === 'sandy') return { ...(etoSandy as unknown as EtoTable), annual_eto_in: etoSandy.annual_eto_in, place: 'Sandy' };
	const p = etoUtah.points.find((x) => x.county === key) ?? etoUtah.points.find((x) => x.county === 'Salt Lake')!;
	return { eto_in: p.eto_in, precip_in: p.precip_in, annual_eto_in: p.annual_eto_in, place: p.place } as unknown as EtoTable & { annual_eto_in: number; place: string };
}

export type IndexDataset = { id: string; imagery: { source: string; date: string; gsd_m: number }; parcels: number; lawn_sqft: number };
// [address, dataset, parcel_id, lawn_sqft]
export type AddressHit = [string, string, string, number];
export async function loadIndex(fetchFn: typeof fetch) {
	const r = await fetchFn('/data/index.json');
	if (!r.ok) return { datasets: [] as (IndexDataset & { meta: Dataset })[], addresses: [] as AddressHit[] };
	const j = (await r.json()) as { datasets: IndexDataset[]; addresses: AddressHit[] };
	const built = DATASETS.flatMap((meta) => {
		const d = j.datasets.find((x) => x.id === meta.id);
		return d ? [{ ...d, meta }] : [];
	});
	return { datasets: built, addresses: j.addresses };
}

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
