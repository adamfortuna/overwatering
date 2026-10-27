<svelte:options namespace="svg" />

<script lang="ts">
	// Gramma, a friendly native bunchgrass (blue grama, with its eyelash seed heads).
	// Local box ~110 x 130 with the mound's base at y = 130.
	let { x = 0, y = 0, scale = 1, delay = 0 }: { x?: number; y?: number; scale?: number; delay?: number } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
	<ellipse cx="55" cy="122" rx="44" ry="10" fill="#e3b97f" />
	<g class="sway" style="animation-delay:{delay}s">
		<!-- seed stems with eyelash flags -->
		<path d="M48 82 Q40 40 24 14" stroke="#c99a3c" stroke-width="3" fill="none" stroke-linecap="round" />
		<path d="M24 14 l10 -3 M27 20 l10 -3 M30 26 l10 -3" stroke="#e0ae45" stroke-width="4" stroke-linecap="round" />
		<path d="M64 82 Q74 38 94 20" stroke="#c99a3c" stroke-width="3" fill="none" stroke-linecap="round" />
		<path d="M94 20 l-9 -5 M90 26 l-9 -5 M86 32 l-9 -5" stroke="#e0ae45" stroke-width="4" stroke-linecap="round" />
		<!-- blades -->
		<path d="M40 92 C28 66 16 52 6 46 C24 50 38 64 50 86 Z" fill="#6aa357" />
		<path d="M46 86 C42 58 36 40 30 30 C44 42 52 60 56 84 Z" fill="#83bb6c" />
		<path d="M55 84 C55 56 58 36 62 22 C66 40 64 62 62 86 Z" fill="#6aa357" />
		<path d="M62 86 C68 60 78 46 90 38 C82 54 74 70 68 92 Z" fill="#83bb6c" />
		<path d="M68 94 C80 74 94 64 106 60 C94 72 84 84 76 100 Z" fill="#6aa357" />
	</g>
	<!-- body -->
	<ellipse cx="56" cy="100" rx="32" ry="23" fill="#8cc474" />
	<ellipse cx="46" cy="92" rx="10" ry="6" fill="#fff" opacity=".2" />
	<!-- face -->
	<circle cx="47" cy="98" r="7.5" fill="#fff" />
	<circle cx="65" cy="98" r="7.5" fill="#fff" />
	<circle cx="48.5" cy="99.5" r="3.6" fill="#12324a" />
	<circle cx="66.5" cy="99.5" r="3.6" fill="#12324a" />
	<circle cx="40" cy="110" r="3.5" fill="#ff8fa3" opacity=".7" />
	<circle cx="72" cy="110" r="3.5" fill="#ff8fa3" opacity=".7" />
	<path d="M49 110 Q56 117 63 110" stroke="#12324a" stroke-width="2.6" fill="none" stroke-linecap="round" />
</g>

<style>
	.sway { transform-box: fill-box; transform-origin: 50% 100%; animation: sway 3.2s ease-in-out infinite; }
	@keyframes sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
	@media (prefers-reduced-motion: reduce) { .sway { animation: none; } }
</style>
