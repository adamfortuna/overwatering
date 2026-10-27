<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import { DATASETS, etoFor } from '#lib/data.ts';
	import { acreFeet, annualTurfNeedGal, conversionSavingsGal, depthToGallons, fmt } from '#lib/water.ts';
	let { data }: PageProps = $props();
	const eto = etoFor(data.ds);
	let el: HTMLDivElement;

	const lawnTotal = data.parcels.reduce((s, p) => s + p.lawn_sqft, 0);
	const need = annualTurfNeedGal(lawnTotal, eto);
	const over = depthToGallons(9, lawnTotal); // DWR: Utahns overwater 0.5–1 ft/yr; 9 in midpoint
	const conv = conversionSavingsGal(lawnTotal, eto);
	const bins = [0, 0.15, 0.3, 0.45, 0.6];
	const colors = ['#1e2540', '#365314', '#4d7c0f', '#65a30d', '#a3e635'];

	onMount(async () => {
		const _ml = await import('maplibre-gl');
		const maplibregl = ((_ml as { default?: typeof _ml }).default ?? _ml) as typeof _ml;
		maplibregl.setWorkerUrl('/ml/maplibre-gl-worker.mjs'); // bundler-safe worker (copied from node_modules)
		const map = new maplibregl.Map({ container: el, style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#080c18' } }] }, attributionControl: false, dragRotate: false });
		map.on('load', () => {
			map.addSource('nb', { type: 'image', url: `/data/${data.ds.id}/neighborhood.png`, coordinates: data.nb.corners });
			map.addLayer({ id: 'nb', type: 'raster', source: 'nb', paint: { 'raster-opacity': 0.55 } });
			map.addSource('parcels', { type: 'geojson', data: data.geo });
			map.addLayer({ id: 'heat', type: 'fill', source: 'parcels', paint: { 'fill-color': ['step', ['get', 'lawn_frac'], colors[0], bins[1], colors[1], bins[2], colors[2], bins[3], colors[3], bins[4], colors[4]], 'fill-opacity': 0.55 } });
			map.addLayer({ id: 'outline', type: 'line', source: 'parcels', paint: { 'line-color': '#000', 'line-opacity': 0.4, 'line-width': 0.5 } });
			map.on('click', 'heat', (e) => {
				const f = e.features?.[0];
				if (f) location.href = `/p/${data.ds.id}/${f.properties.parcel_id}`;
			});
			map.on('mouseenter', 'heat', () => (map.getCanvas().style.cursor = 'pointer'));
			const c = data.nb.corners as [number, number][];
			map.fitBounds([c[3], c[1]], { padding: 10, duration: 0 });
		});
	});
</script>

<p class="kicker">Neighborhood view</p>
<h1>{data.ds.name}: where the savings are</h1>
<nav class="switch" aria-label="Neighborhoods">
	{#each data.built as id}
		{@const d = DATASETS.find((x) => x.id === id)}
		{#if d}<a href="/district/{id}" class:on={id === data.ds.id} data-sveltekit-reload>{d.short}</a>{/if}
	{/each}
</nav>
<p class="muted">Every residential parcel, shaded by how much of the lot is lawn. Totals only, no household rankings. Imagery {data.imagery.date}. Tap a parcel to open it.</p>
<div class="grid">
	<div class="card"><p class="kicker">Lawn</p><div class="big">{(lawnTotal / 43560).toFixed(1)} ac</div><div class="muted small">across {fmt(data.parcels.length)} homes</div></div>
	<div class="card"><p class="kicker">Water it needs</p><div class="big">{acreFeet(need.gal).toFixed(0)} af/yr</div><div class="muted small">at {eto.annual_eto_in} in/yr reference ET</div></div>
	<div class="card"><p class="kicker">Likely overwatered</p><div class="big over">{acreFeet(over).toFixed(0)} af/yr</div><div class="muted small">DWR: Utahns overwater 0.5–1 ft/yr</div></div>
	<div class="card"><p class="kicker">Saved if converted</p><div class="big save">{acreFeet(conv).toFixed(0)} af/yr</div><div class="muted small">every summer after</div></div>
</div>
<div class="map card" bind:this={el}></div>
<p class="legend muted">Lawn share of lot: {#each bins as b, i}<span><i style="background:{colors[i]}"></i>{i === bins.length - 1 ? `≥${Math.round(b * 100)}%` : `${Math.round(b * 100)}–${Math.round(bins[i + 1] * 100)}%`}</span>{/each}</p>

<style>
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 12px 0; }
	.map { width: 100%; height: 70vh; padding: 0; overflow: hidden; }
	.over { color: var(--coral); }
	.save { color: var(--lawn); }
	.switch { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 12px; }
	.switch a { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
	.switch a.on { background: var(--gold); border-color: var(--gold); color: var(--bg); }
	.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.85rem; }
	.legend i { display: inline-block; width: 12px; height: 12px; margin-right: 5px; vertical-align: -1px; border-radius: 2px; }
</style>
