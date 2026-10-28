import { GUIDE_URL, parseGuide, type Guide } from '#lib/guide.ts';

// The state's guide changes once a week (Fridays), so keep it for a few hours at the edge.
const TTL_S = 6 * 3600;
let memo: { at: number; guide: Guide | null } | null = null;

export async function currentGuide(request: Request): Promise<{ guide: Guide | null; fetched: string | null }> {
	if (memo && Date.now() - memo.at < TTL_S * 1000) return { guide: memo.guide, fetched: new Date(memo.at).toISOString() };
	const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
	const key = new Request(new URL('/guide-cache/traditional', request.url));
	let res = await cache?.match(key);
	if (!res) {
		try {
			const r = await fetch(GUIDE_URL, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'overwater.ing (watering calendar)' } });
			if (!r.ok) throw new Error(`guide ${r.status}`);
			res = new Response(await r.text(), { headers: { 'cache-control': `public, max-age=${TTL_S}`, 'x-fetched': new Date().toISOString() } });
			if (cache) await cache.put(key, res.clone());
		} catch {
			return { guide: memo?.guide ?? null, fetched: null };
		}
	}
	const guide = parseGuide(await res.text());
	const fetched = res.headers.get('x-fetched');
	memo = { at: fetched ? Date.parse(fetched) : Date.now(), guide };
	return { guide, fetched };
}
