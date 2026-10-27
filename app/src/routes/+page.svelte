<script lang="ts">
	import type { PageProps } from './$types';
	import { DATASETS, etoFor } from '#lib/data.ts';
	import { acreFeet, annualTurfNeedGal, conversionSavingsGal, fmt } from '#lib/water.ts';
	import Doors from '#lib/Doors.svelte';
	import Scene from '#lib/Scene.svelte';
	let { data }: PageProps = $props();

	let q = $state('');
	const norm = (s: string) => s.toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ').trim();
	const short = (id: string) => DATASETS.find((d) => d.id === id)?.short ?? id;
	let hits = $derived.by(() => {
		const n = norm(q);
		if (n.length < 3) return [];
		const out = [];
		const seen = new Set<string>();
		for (const a of data.addresses) {
			// The same parcel can sit in two overlapping datasets (84102 and Central City).
			if (seen.has(a[2]) || !norm(a[0]).includes(n)) continue;
			seen.add(a[2]);
			out.push(a);
			if (out.length >= 10) break;
		}
		return out;
	});

	// Anywhere in Utah: five parallel county-group searches (see /api/search), merged as they land.
	type Remote = { address: string; city: string; county: string; parcel_id: string; prop_class: string };
	let remote = $state<Remote[]>([]);
	let searching = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let seq = 0;
	$effect(() => {
		const query = q.trim();
		clearTimeout(timer);
		remote = [];
		if (query.length < 6 || !/\d/.test(query)) return;
		timer = setTimeout(() => {
			const mine = ++seq;
			searching = 5;
			for (let g = 0; g < 5; g++)
				fetch(`/api/search?group=${g}&q=${encodeURIComponent(query)}`)
					.then((r) => (r.ok ? r.json() : { hits: [] }))
					.then((j) => {
						if (mine !== seq) return;
						const local = new Set(hits.map((h) => h[2]));
						const have = new Set(remote.map((h) => h.county + h.parcel_id));
						remote = [...remote, ...j.hits.filter((h: Remote) => !local.has(h.parcel_id) && !have.has(h.county + h.parcel_id))].slice(0, 12);
					})
					.catch(() => {})
					.finally(() => mine === seq && searching--);
		}, 350);
	});
	const isResidential = (r: Remote) => /resid/i.test(r.prop_class);
	const hasNumber = (s: string) => /\d/.test(s);
	const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

	let board = $derived(
		data.datasets
			.map((d) => {
				const eto = etoFor(d.meta);
				return { ...d, acres: d.lawn_sqft / 43560, need: acreFeet(annualTurfNeedGal(d.lawn_sqft, eto).gal), conv: acreFeet(conversionSavingsGal(d.lawn_sqft, eto)) };
			})
			.sort((a, b) => b.acres - a.acres)
	);
</script>

<section class="hero">
	<p class="kicker">Any home in Utah · 2024 aerial imagery · free</p>
	<h1>Is your lawn getting more water than it needs?</h1>
	<p class="lede">Type any Utah address. We find the grass on your lot from 2024 aerial imagery, you fix anything we got wrong, and we show three ways to save: water what it needs, take Utah's rebate, or go native.</p>

	<div class="search">
		<label for="q" class="sr">Your address</label>
		<input id="q" type="search" placeholder="Your street address, e.g. 603 E South Temple" bind:value={q} autocomplete="street-address" />
		{#if hits.length || remote.length}
			<ul class="hits">
				{#each hits as [address, ds, id, lawn]}
					<li>
						<a href="/p/{ds}/{id}">
							<span class="addr">{address}</span>
							<span class="chip">{short(ds)}</span>
							<span class="muted lawn">{lawn ? `~${fmt(lawn)} sq ft of lawn` : 'no lawn detected'}</span>
						</a>
					</li>
				{/each}
				{#each remote as r}
					<li>
						<a href="/u/{encodeURIComponent(r.county)}/{encodeURIComponent(r.parcel_id)}">
							<span class="addr">{r.address}</span>
							<span class="chip alt">{r.county} Co.</span>
							<span class="muted lawn">{r.city ? title(r.city) : `${r.county} County`}{isResidential(r) ? '' : ` · ${r.prop_class || 'not residential'}`} · we'll measure it now</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
		{#if searching > 0}
			<p class="muted miss">Searching all 29 Utah counties…</p>
		{:else if norm(q).length >= 3 && !hits.length && !remote.length}
			<p class="muted miss">{hasNumber(q) ? 'No Utah parcel with that address. Try just the house number and street, like "603 E South Temple".' : 'Start with the house number, like "603 E South Temple".'}</p>
		{/if}
	</div>
</section>

<div class="bleed"><Scene variant="hero" /></div>

<Doors />

<section id="neighborhoods">
	<div class="head">
		<h2>Neighborhoods</h2>
		<p class="muted small">Totals only. We never rank households.</p>
	</div>
	<div class="board card">
		<table>
			<thead>
				<tr><th>Neighborhood</th><th class="n">Homes</th><th class="n">Lawn</th><th class="n">Water it needs</th><th class="n">Saved if all went native</th><th></th></tr>
			</thead>
			<tbody>
				{#each board as b}
					<tr>
						<td><span class="dot" aria-hidden="true"></span>{b.meta.name}</td>
						<td class="n">{fmt(b.parcels)}</td>
						<td class="n"><b>{b.acres.toFixed(1)}</b> ac</td>
						<td class="n">{b.need.toFixed(0)} af/yr</td>
						<td class="n save">{b.conv.toFixed(0)} af/yr</td>
						<td class="n"><a href="/district/{b.id}">Map →</a></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="muted small foot">af/yr = acre-feet a year. One acre-foot is about 326,000 gallons, roughly what two to three Utah households use in a year.</p>
	</div>
</section>

<style>
	.hero { padding: 26px 0 0; max-width: 820px; }
	.lede { font-size: 1.15rem; color: var(--muted); max-width: 700px; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
	.search { margin-top: 20px; position: relative; z-index: 2; }
	.search input { width: 100%; box-sizing: border-box; font-size: 1.25rem; padding: 16px 20px; border-radius: 999px; border: 3px solid var(--water-2); box-shadow: 0 6px 0 #bfe6f8; }
	.search input:focus { outline: none; border-color: var(--water); }
	.hits { list-style: none; padding: 6px; margin: 10px 0 0; background: #fff; border: 2px solid var(--line); border-radius: 20px; box-shadow: 0 6px 0 #d6ecf9; }
	.hits a { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 10px 14px; border-radius: 14px; text-decoration: none; color: var(--ink); }
	.hits a:hover, .hits a:focus-visible { background: var(--aqua); }
	.addr { font-weight: 700; }
	.lawn { grid-column: 1; font-size: 0.9rem; }
	.chip.alt { background: var(--lawn); }
	.chip { grid-row: 1 / span 2; grid-column: 2; align-self: center; font-size: 0.8rem; font-weight: 700; color: #fff; background: var(--water); border-radius: 999px; padding: 3px 12px; }
	.miss { margin-top: 10px; }
	.bleed { width: 100vw; margin-left: calc(50% - 50vw); margin-top: -10px; }
	#neighborhoods { margin-top: 44px; }
	.head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
	.board { padding: 8px 8px 14px; overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
	th { text-align: left; font-family: var(--display); font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 10px 12px; }
	td { padding: 12px; border-top: 2px solid #eaf4fb; white-space: nowrap; }
	.n { text-align: right; }
	.dot { display: inline-block; width: 12px; height: 15px; margin-right: 10px; background: var(--water-2); border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; vertical-align: -1px; }
	.save { color: var(--lawn); font-weight: 700; }
	.foot { padding: 6px 12px 0; white-space: normal; }
</style>
