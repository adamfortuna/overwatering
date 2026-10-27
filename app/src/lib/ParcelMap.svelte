<script lang="ts">
	import { onMount } from 'svelte';
	import type { Parcel, RegionFeature, RegionCls } from './data';

	let { parcel, regions, dataset, ontoggle }: { parcel: Parcel; regions: { type: 'FeatureCollection'; features: RegionFeature[] }; dataset: string; ontoggle: (idx: number) => void } = $props();
	let el: HTMLDivElement;
	let map: import('maplibre-gl').Map | undefined;

	export const COLORS: Record<RegionCls, string> = { lawn: '#4ade80', canopy: '#15803d', building: '#f87171', other: '#9ca3af', converted: '#38bdf8' };
	const OPACITY: Record<RegionCls, number> = { lawn: 0.5, canopy: 0.45, building: 0.35, other: 0.12, converted: 0.55 };

	onMount(async () => {
		const _ml = await import('maplibre-gl');
		const maplibregl = ((_ml as { default?: typeof _ml }).default ?? _ml) as typeof _ml;
		maplibregl.setWorkerUrl('/ml/maplibre-gl-worker.mjs'); // bundler-safe worker (copied from node_modules)
		map = new maplibregl.Map({
			container: el,
			style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0f1413' } }] },
			attributionControl: false,
			dragRotate: false,
			pitchWithRotate: false
		});
		map.touchZoomRotate.disableRotation();
		map.on('load', () => {
			map!.addSource('crop', { type: 'image', url: `/data/${dataset}/crops/${parcel.parcel_id}.png`, coordinates: parcel.crop_corners });
			map!.addLayer({ id: 'crop', type: 'raster', source: 'crop', paint: { 'raster-resampling': 'nearest' } });
			map!.addSource('regions', { type: 'geojson', data: regions });
			map!.addLayer({
				id: 'regions-fill',
				type: 'fill',
				source: 'regions',
				paint: {
					'fill-color': ['match', ['get', 'cls'], ...Object.entries(COLORS).flat(), '#fff'],
					'fill-opacity': ['match', ['get', 'cls'], ...Object.entries(OPACITY).flat(), 0.2]
				}
			});
			map!.addLayer({ id: 'regions-line', type: 'line', source: 'regions', paint: { 'line-color': '#ffffff', 'line-opacity': 0.35, 'line-width': 1 } });
			map!.addLayer({ id: 'changed', type: 'line', source: 'regions', filter: ['!=', ['get', 'cls'], ['get', 'original']], paint: { 'line-color': '#fff', 'line-width': 2.5 } });
			map!.on('click', 'regions-fill', (e) => {
				const f = e.features?.[0];
				if (f && f.properties.cls !== 'building') ontoggle(f.properties.idx);
			});
			map!.on('mouseenter', 'regions-fill', () => (map!.getCanvas().style.cursor = 'pointer'));
			map!.on('mouseleave', 'regions-fill', () => (map!.getCanvas().style.cursor = ''));
			const [w, s, e2, n] = parcel.bounds;
			map!.fitBounds([[w, s], [e2, n]], { padding: 24, duration: 0 });
		});
	});

	$effect(() => {
		// push edited classes to the map. Read `regions` first so the effect tracks it even
		// before the map has finished loading.
		const snap = $state.snapshot(regions) as GeoJSON.FeatureCollection;
		const src = map?.getSource('regions') as import('maplibre-gl').GeoJSONSource | undefined;
		src?.setData(snap);
	});
</script>

<div class="map" bind:this={el}></div>

<style>
	.map { width: 100%; aspect-ratio: 1 / 1; max-height: 70vh; border-radius: 12px; overflow: hidden; background: #0f1413; }
</style>
