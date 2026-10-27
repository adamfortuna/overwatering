<script lang="ts">
	// The three savings layers, framed as doors. Values are optional (home page shows the teaser).
	type Door = { kicker: string; title: string; body: string; value?: string };
	let { doors }: { doors?: Door[] } = $props();
	const DEFAULT: Door[] = [
		{ kicker: 'Door 1 · free, today', title: 'Water what it needs', body: 'Most Utah lawns get 6–12 inches more a year than they use. Add your bill and we show your gap.' },
		{ kicker: 'Door 2 · one time', title: 'Take the rebate', body: 'Salt Lake City and Sandy pay $3 per square foot of lawn you replace, up to $50,000. Get approved first.' },
		{ kicker: 'Door 3 · every year', title: 'Convert it', body: 'Water-wise landscape needs roughly a third of what turf does, every summer after.' }
	];
	let list = $derived(doors ?? DEFAULT);
</script>

<section class="doors">
	{#each list as d, i}
		<article class="door card">
			<span class="num" aria-hidden="true">{i + 1}</span>
			<p class="kicker">{d.kicker}</p>
			<h3>{d.title}</h3>
			{#if d.value}<div class="big">{d.value}</div>{/if}
			<p class="muted small">{d.body}</p>
		</article>
	{/each}
</section>

<style>
	.doors { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 34px; }
	.door { position: relative; overflow: hidden; padding-top: 22px; }
	.num { position: absolute; right: 12px; top: -14px; font-family: var(--display); font-weight: 800; font-size: 6rem; line-height: 1; color: transparent; -webkit-text-stroke: 1.5px rgba(255, 201, 64, 0.35); pointer-events: none; }
	h3 { font-size: 1.25rem; }
</style>
