import type { RegionCls } from './data';
export type Label = { dataset: string; parcel_id: string; region_index: number; cls: RegionCls; original_cls: RegionCls; created_at?: string };

const key = (d: string, p: string) => `labels:${d}:${p}`;

export function loadLocal(dataset: string, parcelId: string): Label[] {
	try {
		return JSON.parse(localStorage.getItem(key(dataset, parcelId)) ?? '[]');
	} catch {
		return [];
	}
}

export async function saveLabel(l: Label) {
	try {
		const all = loadLocal(l.dataset, l.parcel_id).filter((x) => x.region_index !== l.region_index);
		all.push({ ...l, created_at: new Date().toISOString() });
		localStorage.setItem(key(l.dataset, l.parcel_id), JSON.stringify(all));
	} catch {}
	try {
		const r = await fetch('/api/labels', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(l) });
		return r.ok ? 'd1' : 'local';
	} catch {
		return 'local';
	}
}

export async function loadLabels(dataset: string, parcelId: string): Promise<Label[]> {
	try {
		const r = await fetch(`/api/labels?dataset=${dataset}&parcel_id=${parcelId}`);
		if (r.ok) return (await r.json()).labels;
	} catch {}
	return loadLocal(dataset, parcelId);
}
