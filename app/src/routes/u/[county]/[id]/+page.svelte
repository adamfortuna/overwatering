<script lang="ts">
	// Any Utah parcel, measured on demand in the browser (see #lib/live.ts).
	import type { PageProps } from './$types';
	import ParcelView from '#lib/ParcelView.svelte';
	import Sprinkler from '#lib/art/Sprinkler.svelte';
	import Drop from '#lib/art/Drop.svelte';
	import { analyzeParcel, LiveError, type LiveResult } from '#lib/live.ts';
	import { onDestroy } from 'svelte';
	let { data }: PageProps = $props();

	let step = $state('Getting ready');
	let result = $state<LiveResult | null>(null);
	let failure = $state<string | null>(null);

	const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
	$effect(() => {
		const { county, id } = data;
		result = null;
		failure = null;
		analyzeParcel(county, id, (s) => (step = s))
			.then((r) => (result = r))
			.catch((e) => (failure = e instanceof LiveError ? e.message : 'Something went wrong measuring this lot. Try again in a minute.'));
	});
	onDestroy(() => result && URL.revokeObjectURL(result.imageUrl));
	let ds = $derived(
		result && {
			id: `ut-${data.county.toLowerCase().replaceAll(' ', '-')}`,
			name: `${result.city ? title(result.city) + ' · ' : ''}${data.county} County`,
			city: result.city,
			county: data.county,
			utah: true
		}
	);
</script>

<svelte:head><title>{result ? result.parcel.address : 'Measuring a lawn'} · Overwater.ing?</title></svelte:head>

{#if result && ds}
	<ParcelView {ds} eto={result.eto} parcel={result.parcel} regions={result.regions} imagery={result.imagery} imageUrl={result.imageUrl} etoKey={data.county} />
	<p class="muted small fine">
		Measured just now from 2024 aerial imagery{result.canopyMissing ? ' (tree-height data was unavailable, so trees may be counted as lawn)' : ''}. Water need uses {result.eto.place}'s weather ({result.eto.annual_eto_in} in/yr reference ET).
		{#if !/resid/i.test(result.propClass)}This parcel is classed "{result.propClass}", not residential.{/if}
	</p>
{:else if failure}
	<section class="card status">
		<svg viewBox="0 0 120 170" aria-hidden="true"><Sprinkler x={0} y={6} spray={false} off /></svg>
		<div>
			<h1>Hmm, that didn't work</h1>
			<p class="muted">{failure}</p>
			<p><a href="/">← Try another address</a></p>
		</div>
	</section>
{:else}
	<section class="card status" aria-live="polite">
		<svg viewBox="0 0 300 170" aria-hidden="true">
			<Sprinkler x={0} y={6} />
			<Drop x={200} y={100} scale={0.9} />
			<Drop x={250} y={108} scale={0.7} delay={-0.6} color="#7fd6f5" />
		</svg>
		<div>
			<p class="kicker">Measuring this lawn</p>
			<h1>{step}…</h1>
			<p class="muted">We're pulling the parcel from Utah's GIS, the 2024 aerial photo, building outlines and tree heights, then finding the grass. It takes a few seconds.</p>
		</div>
	</section>
{/if}

<style>
	.status { display: grid; grid-template-columns: minmax(140px, 260px) 1fr; gap: 24px; align-items: center; margin-top: 20px; }
	.status svg { width: 100%; height: auto; }
	.status h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); }
	.fine { margin-top: 18px; }
	@media (max-width: 640px) { .status { grid-template-columns: 1fr; } .status svg { max-width: 220px; } }
</style>
