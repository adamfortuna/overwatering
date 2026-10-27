<script lang="ts">
	// The three ways to save, each with its character. Values are optional (home shows a teaser).
	import Sprinkler from './art/Sprinkler.svelte';
	import Coin from './art/Coin.svelte';
	import Grass from './art/Grass.svelte';
	type Way = { kicker: string; title: string; body: string; href?: string; cta?: string };
	let { ways }: { ways?: Way[] } = $props();
	const DEFAULT: Way[] = [
		{ kicker: '1 · Today', title: 'Water what it needs', body: 'Most Utah lawns get 6–12 inches more water a year than they use. Add your bill and we show your gap.', href: '/watering', cta: 'Dial in your sprinklers' },
		{ kicker: '2 · One time', title: 'Take the rebate', body: "Utah Water Savers pays $1.50–$3 per square foot of lawn you replace in most Wasatch Front cities. Get approved first." },
		{ kicker: '3 · Every year', title: 'Go native', body: 'Water-wise Utah landscape needs roughly a third of the water turf does, every summer after.', href: '/native', cta: 'What going native looks like' }
	];
	let list = $derived(ways ?? DEFAULT);
</script>

<section class="ways">
	{#each list as w, i}
		<article class="card way">
			<svg class="icon" viewBox="0 0 130 130" aria-hidden="true">
				{#if i === 0}<Sprinkler x={20} y={-26} scale={0.92} spray={false} />
				{:else if i === 1}<Coin x={65} y={68} scale={1.5} />
				{:else}<Grass x={6} y={-6} scale={1.05} />{/if}
			</svg>
			<div>
				<p class="kicker">{w.kicker}</p>
				<h3>{w.title}</h3>
				<p class="muted small">{w.body}</p>
				{#if w.href}<a class="small" href={w.href}>{w.cta} →</a>{/if}
			</div>
		</article>
	{/each}
</section>

<style>
	.ways { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 26px; }
	.way { display: grid; grid-template-columns: 84px 1fr; gap: 12px; align-items: start; }
	.icon { width: 84px; height: 84px; background: var(--aqua); border-radius: 20px; }
	h3 { font-size: 1.3rem; margin-bottom: 2px; }
	.way p:last-child { margin: 4px 0 0; }
</style>
