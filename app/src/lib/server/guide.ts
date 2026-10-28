import { env } from 'cloudflare:workers';
import { GUIDE_URL, parseGuide, type Guide } from '#lib/guide.ts';

// Utah's Weekly Lawn Watering Guide changes once a week (Fridays). The parsed guide lives in D1;
// wateringindex.utah.gov often times out from Cloudflare's network, so besides the Worker's own
// fetch, a GitHub Action posts each week's page to /api/guide (see storeGuide). Reads go:
// memory -> D1 (if fetched within REFRESH) -> live fetch (stored on success) -> D1 even if older.
const REFRESH_MS = 6 * 3600_000;
const RETRY_MS = 10 * 60_000;
let memo: { at: number; guide: Guide; fetched: string } | null = null;
let failed: { at: number; error: string } | null = null;

type Result = { guide: Guide | null; fetched: string | null; error?: string };
type Row = { week: string; start: string; end: string; counties: string; fetched: string };

async function fromDb(): Promise<{ guide: Guide; fetched: string } | null> {
	const row = await env.DB?.prepare('SELECT week, start, end, counties, fetched FROM guide WHERE kind = ?').bind('traditional').first<Row>().catch(() => null);
	return row ? { guide: { week: row.week, start: row.start, end: row.end, counties: JSON.parse(row.counties) }, fetched: row.fetched } : null;
}

/** Parse a guide page and store it. Returns the parsed guide, or null if the page didn't parse. */
export async function storeGuide(html: string): Promise<Guide | null> {
	const guide = parseGuide(html);
	if (!guide) return null;
	const fetched = new Date().toISOString();
	await env.DB?.prepare('INSERT OR REPLACE INTO guide (kind, week, start, end, counties, fetched) VALUES (?, ?, ?, ?, ?, ?)')
		.bind('traditional', guide.week, guide.start, guide.end, JSON.stringify(guide.counties), fetched)
		.run();
	memo = { at: Date.now(), guide, fetched };
	failed = null;
	return guide;
}

export async function currentGuide(): Promise<Result> {
	if (memo && Date.now() - memo.at < REFRESH_MS) return { guide: memo.guide, fetched: memo.fetched };
	const db = await fromDb();
	if (db && Date.now() - Date.parse(db.fetched) < REFRESH_MS) {
		memo = { at: Date.parse(db.fetched), ...db };
		return db;
	}
	const stale = (error: string): Result => ({ guide: db?.guide ?? memo?.guide ?? null, fetched: db?.fetched ?? memo?.fetched ?? null, error });
	if (failed && Date.now() - failed.at < RETRY_MS) return stale(failed.error);
	try {
		const r = await fetch(GUIDE_URL, {
			signal: AbortSignal.timeout(5000),
			headers: { 'user-agent': 'Mozilla/5.0 (compatible; overwater.ing watering calendar; +https://overwater.ing/connect)', accept: 'text/html' }
		});
		const html = await r.text();
		if (!r.ok) throw new Error(`HTTP ${r.status} from wateringindex.utah.gov`);
		const guide = await storeGuide(html);
		if (!guide) throw new Error(`couldn't read the guide page (${html.length} bytes)`);
		return { guide, fetched: memo!.fetched };
	} catch (e) {
		failed = { at: Date.now(), error: `live fetch failed (${e instanceof Error ? e.message : String(e)}); using the copy from ${db?.fetched ?? 'nowhere'}` };
		return stale(failed.error);
	}
}
