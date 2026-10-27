import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Corrections ("not lawn anymore", "I converted", "grass under those trees") stored as labels.
// Works without D1 (returns 501; the client keeps a localStorage copy).
export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;
	const b = await request.json();
	for (const k of ['dataset', 'parcel_id', 'cls', 'original_cls']) if (typeof b[k] !== 'string') return json({ error: `bad ${k}` }, { status: 400 });
	if (!Number.isInteger(b.region_index)) return json({ error: 'bad region_index' }, { status: 400 });
	if (!db) return json({ stored: 'none', reason: 'no D1 binding' }, { status: 501 });
	await db.prepare('INSERT INTO labels (dataset, parcel_id, region_index, cls, original_cls) VALUES (?1, ?2, ?3, ?4, ?5)').bind(b.dataset, b.parcel_id, b.region_index, b.cls, b.original_cls).run();
	return json({ stored: 'd1' });
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;
	if (!db) return json({ error: 'no D1 binding' }, { status: 501 });
	const dataset = url.searchParams.get('dataset');
	const parcel = url.searchParams.get('parcel_id');
	if (!dataset || !parcel) return json({ error: 'dataset and parcel_id required' }, { status: 400 });
	const { results } = await db.prepare('SELECT dataset, parcel_id, region_index, cls, original_cls, created_at FROM labels WHERE dataset = ?1 AND parcel_id = ?2 ORDER BY created_at ASC').bind(dataset, parcel).all();
	const latest = new Map<number, unknown>();
	for (const r of results as { region_index: number }[]) latest.set(r.region_index, r);
	return json({ labels: [...latest.values()] });
};
