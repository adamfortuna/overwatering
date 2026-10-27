<script lang="ts">
	import type { PageProps } from './$types';
	import { DATASETS, etoFor } from '#lib/data.ts';
	import { acreFeet, annualTurfNeedGal, conversionSavingsGal, fmt } from '#lib/water.ts';
	import Doors from '#lib/Doors.svelte';
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
	<p class="kicker">Salt Lake City · today's contestant: your lawn</p>
	<h1>Is your lawn getting more water than it needs?</h1>
	<p class="lede">Enter your address. We find the grass on your lot from 2024 aerial imagery, you fix anything we got wrong, and then we open three doors: water less, take the rebate, or convert.</p>

	<div class="search">
		<label for="q" class="sr">Your address</label>
		<input id="q" type="search" placeholder="Your street address, e.g. 816 S 600 E" bind:value={q} autocomplete="street-address" />
		{#if hits.length}
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
			</ul>
		{:else if norm(q).length >= 3}
			<p class="muted miss">No match. We cover {board.map((b) => b.meta.short).join(', ')} so far, and residential lots only.</p>
		{/if}
	</div>
</section>

<Doors />

<section id="scoreboard">
	<div class="head">
		<h2>Scoreboard</h2>
		<p class="muted small">Neighborhood totals only. We never rank households.</p>
	</div>
	<div class="board card">
		<table>
			<thead>
				<tr><th>Neighborhood</th><th class="n">Homes</th><th class="n">Lawn</th><th class="n">Water it needs</th><th class="n">Saved if converted</th><th></th></tr>
			</thead>
			<tbody>
				{#each board as b, i}
					<tr>
						<td><span class="rank">{i + 1}</span>{b.meta.name}</td>
						<td class="n">{fmt(b.parcels)}</td>
						<td class="n"><b>{b.acres.toFixed(1)}</b> ac</td>
						<td class="n">{b.need.toFixed(0)} af/yr</td>
						<td class="n save">{b.conv.toFixed(0)} af/yr</td>
						<td class="n"><a href="/district/{b.id}">Map →</a></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="muted small foot">af/yr = acre-feet a year; one acre-foot is about 326,000 gallons, roughly what two to three Utah households use in a year. "Saved if converted" assumes every detected lawn becomes water-wise landscape.</p>
	</div>
</section>

<style>
	.hero { padding: 28px 0 8px; max-width: 820px; }
	.lede { font-size: 1.15rem; color: var(--muted); max-width: 680px; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
	.search { margin-top: 22px; position: relative; }
	.search input { width: 100%; box-sizing: border-box; font-size: 1.25rem; padding: 16px 18px; border-radius: 14px; border: 2px solid var(--line); background: #080c18; }
	.search input:focus { border-color: var(--gold); outline: none; box-shadow: 0 0 0 4px rgba(255, 201, 64, 0.15); }
	.hits { list-style: none; padding: 6px; margin: 8px 0 0; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; }
	.hits a { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 10px 12px; border-radius: 10px; text-decoration: none; color: var(--ink); }
	.hits a:hover, .hits a:focus-visible { background: var(--panel-2); }
	.addr { font-weight: 650; }
	.lawn { grid-column: 1; font-size: 0.9rem; }
	.chip { grid-row: 1 / span 2; grid-column: 2; align-self: center; font-size: 0.78rem; font-weight: 700; color: var(--bg); background: var(--water); border-radius: 999px; padding: 3px 10px; }
	.miss { margin-top: 10px; }
	#scoreboard { margin-top: 40px; }
	.head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
	.board { padding: 6px 6px 12px; overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
	th { text-align: left; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 650; padding: 10px 12px; }
	td { padding: 12px; border-top: 1px solid var(--line); white-space: nowrap; }
	.n { text-align: right; }
	.rank { display: inline-grid; place-items: center; width: 24px; height: 24px; margin-right: 10px; border-radius: 50%; border: 1.5px solid var(--gold); color: var(--gold); font-family: var(--display); font-weight: 800; font-size: 0.8rem; }
	.save { color: var(--lawn); }
	.foot { padding: 4px 12px 0; white-space: normal; }
</style>
