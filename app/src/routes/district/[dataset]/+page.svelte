<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import eto from '#lib/eto_sandy_ut.json';
	import { acreFeet, annualTurfNeedGal, conversionSavingsGal, depthToGallons, fmt } from '#lib/water.ts';
	let { data }: PageProps = $props();
	let el: HTMLDivElement;

	const lawnTotal = data.parcels.reduce((s, p) => s + p.lawn_sqft, 0);
	const need = annualTurfNeedGal(lawnTotal, eto);
	const over = depthToGallons(9, lawnTotal); // DWR: Utahns overwater 0.5–1 ft/yr; 9 in midpoint
	const conv = conversionSavingsGal(lawnTotal, eto);
	const bins = [0, 0.15, 0.3, 0.45, 0.6];
	const colors = ['#1f2937', '#365314', '#4d7c0f', '#65a30d', '#a3e635'];

	onMount(async () => {
		const _ml = await import('maplibre-gl');
		const maplibregl = ((_ml as { default?: typeof _ml }).default ?? _ml) as typeof _ml;
		maplibregl.setWorkerUrl('/ml/maplibre-gl-worker.mjs'); // bundler-safe worker (copied from node_modules)
		const map = new maplibregl.Map({ container: el, style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0f1413' } }] }, attributionControl: false, dragRotate: false });
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

<h1>{data.ds.name}: where the savings are</h1>
<p class="muted">Aggregated by parcel, no household rankings. Imagery {data.imagery.source} {data.imagery.date}. Tap a parcel to open it.</p>
<div class="grid">
	<div class="card"><div class="big">{(lawnTotal / 43560).toFixed(1)} ac</div><div class="muted">lawn across {fmt(data.parcels.length)} parcels</div></div>
	<div class="card"><div class="big">{acreFeet(need.gal).toFixed(0)} af/yr</div><div class="muted">water these lawns need</div></div>
	<div class="card"><div class="big">{acreFeet(over).toFixed(0)} af/yr</div><div class="muted">likely overwatering (DWR 0.5–1 ft/yr estimate)</div></div>
	<div class="card"><div class="big">{acreFeet(conv).toFixed(0)} af/yr</div><div class="muted">left in the system if all converted</div></div>
</div>
<div class="map" bind:this={el}></div>
<p class="legend muted">Lawn share of lot: {#each bins as b, i}<span><i style="background:{colors[i]}"></i>{i === bins.length - 1 ? `≥${Math.round(b * 100)}%` : `${Math.round(b * 100)}–${Math.round(bins[i + 1] * 100)}%`}</span>{/each}</p>

<style>
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 12px 0; }
	.map { width: 100%; height: 70vh; border-radius: 12px; overflow: hidden; }
	.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.85rem; }
	.legend i { display: inline-block; width: 12px; height: 12px; margin-right: 5px; vertical-align: -1px; border-radius: 2px; }
</style>
