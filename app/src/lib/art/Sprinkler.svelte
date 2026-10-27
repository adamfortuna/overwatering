<svelte:options namespace="svg" />

<script lang="ts">
	// Sprinkles, the pop-up sprinkler. Local box ~120 x 160 with feet at y = 160.
	// `spray` draws the water arcs to the right; `off` shows a sleepy, switched-off sprinkler.
	let { x = 0, y = 0, scale = 1, spray = true, off = false }: { x?: number; y?: number; scale?: number; spray?: boolean; off?: boolean } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
	{#if spray && !off}
		<g class="spray" fill="none" stroke-linecap="round">
			<path d="M84 30 Q150 -40 230 46" stroke="#4cc3f0" stroke-width="5" stroke-dasharray="2 13" />
			<path d="M84 32 Q170 -10 270 86" stroke="#7fd6f5" stroke-width="4" stroke-dasharray="2 12" style="animation-delay:-.4s" />
			<path d="M84 34 Q130 0 180 80" stroke="#4cc3f0" stroke-width="4" stroke-dasharray="2 11" style="animation-delay:-.8s" />
		</g>
	{/if}
	<!-- feet -->
	<ellipse cx="48" cy="156" rx="11" ry="6" fill="#1b5e9e" />
	<ellipse cx="74" cy="156" rx="11" ry="6" fill="#1b5e9e" />
	<!-- riser + nozzle -->
	<rect x="52" y="34" width="16" height="30" rx="6" fill="#a9c3d8" />
	<rect x="41" y="22" width="38" height="17" rx="8.5" fill="#ffc93c" />
	<circle cx="81" cy="30" r="5" fill="#f4a72a" />
	<!-- arms -->
	<path d="M37 108 Q22 104 17 90" stroke="#2f86d6" stroke-width="7" stroke-linecap="round" fill="none" />
	<circle cx="16" cy="88" r="6" fill="#2f86d6" />
	<g class={off ? '' : 'wave'}>
		<path d="M85 108 Q101 100 105 84" stroke="#2f86d6" stroke-width="7" stroke-linecap="round" fill="none" />
		<circle cx="106" cy="82" r="6" fill="#2f86d6" />
	</g>
	<!-- body -->
	<rect x="34" y="58" width="54" height="98" rx="25" fill="#2f86d6" />
	<rect x="44" y="66" width="12" height="56" rx="6" fill="#ffffff" opacity=".22" />
	<!-- face -->
	{#if off}
		<path d="M45 94 q6 5 12 0 M65 94 q6 5 12 0" stroke="#12324a" stroke-width="3" fill="none" stroke-linecap="round" />
		<text x="94" y="56" font-family="var(--display)" font-weight="700" font-size="16" fill="#12324a" opacity=".55">z</text>
		<text x="104" y="42" font-family="var(--display)" font-weight="700" font-size="12" fill="#12324a" opacity=".4">z</text>
	{:else}
		<circle cx="51" cy="92" r="9" fill="#fff" />
		<circle cx="71" cy="92" r="9" fill="#fff" />
		<circle cx="53" cy="94" r="4" fill="#12324a" />
		<circle cx="73" cy="94" r="4" fill="#12324a" />
	{/if}
	<circle cx="44" cy="108" r="4" fill="#ff8fa3" opacity=".7" />
	<circle cx="78" cy="108" r="4" fill="#ff8fa3" opacity=".7" />
	<path d="M52 110 Q61 120 70 110" stroke="#12324a" stroke-width="3" fill="none" stroke-linecap="round" />
</g>

<style>
	.spray path { animation: flow 1.1s linear infinite; }
	@keyframes flow { to { stroke-dashoffset: -30; } }
	.wave { transform-box: fill-box; transform-origin: 0% 100%; animation: wave 1.6s ease-in-out infinite; }
	@keyframes wave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-16deg); } }
	@media (prefers-reduced-motion: reduce) { .spray path, .wave { animation: none; } }
</style>
