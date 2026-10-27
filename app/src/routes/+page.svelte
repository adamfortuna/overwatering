<script lang="ts">
	import type { PageProps } from './$types';
	import { fmt } from '#lib/water';
	let { data }: PageProps = $props();
	let q = $state('');
	const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
	let hits = $derived(q.length < 2 ? [] : data.parcels.filter((p) => norm(p.address).includes(norm(q))).slice(0, 12));
	let totals = $derived({
		n: data.parcels.length,
		lawnAcres: data.parcels.reduce((s, p) => s + p.lawn_sqft, 0) / 43560,
		highConf: data.parcels.filter((p) => p.confidence !== 'low').length
	});
	let ds = $derived(data.datasets.find((d) => d.id === data.dataset)!);
</script>

<h1>How much lawn is on your lot, and what is it worth to stop watering it?</h1>
<p class="muted">Type an address. We detect the lawn from aerial imagery, you fix what we got wrong, and the savings card updates live.</p>

<div class="card">
	<label>Neighborhood
		<select value={data.dataset} onchange={(e) => (location.href = `/?d=${(e.target as HTMLSelectElement).value}`)}>
			{#each data.datasets as d}<option value={d.id}>{d.name}</option>{/each}
		</select>
	</label>
	<p class="muted small">{ds.note} Imagery: {data.imagery.source}, {data.imagery.date}, {data.imagery.gsd_m} m/px.</p>
	<input type="search" placeholder="Search an address, e.g. 10118 S PEONY" bind:value={q} autofocus />
	{#if hits.length}
		<ul class="hits">
			{#each hits as p}
				<li><a href="/p/{data.dataset}/{p.parcel_id}">{p.address}</a> <span class="muted">~{fmt(p.lawn_sqft)} sq ft lawn, {p.confidence} confidence</span></li>
			{/each}
		</ul>
	{:else if q.length >= 2}
		<p class="muted">No match in this neighborhood.</p>
	{/if}
</div>

<div class="grid">
	<div class="card"><div class="big">{fmt(totals.n)}</div><div class="muted">parcels analysed</div></div>
	<div class="card"><div class="big">{totals.lawnAcres.toFixed(1)}</div><div class="muted">acres of lawn detected</div></div>
	<div class="card"><div class="big">{totals.highConf}</div><div class="muted">parcels at medium or high confidence</div></div>
</div>
<p><a href="/district/{data.dataset}">Open the district map →</a></p>

<style>
	.card { margin: 12px 0; }
	label { display: block; margin-bottom: 8px; }
	select, input { font: inherit; padding: 10px 12px; border-radius: 8px; border: 1px solid #2d3d3a; background: #0f1413; color: var(--ink); width: 100%; box-sizing: border-box; }
	select { width: auto; margin-left: 8px; }
	.small { font-size: 0.9rem; }
	.hits { list-style: none; padding: 0; margin: 8px 0 0; }
	.hits li { padding: 8px 0; border-top: 1px solid #243230; }
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
</style>
