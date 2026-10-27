<svelte:options namespace="svg" />

<script lang="ts">
	// A water droplet with legs. Local box ~44 x 64, feet at y = 64.
	let { x = 0, y = 0, scale = 1, delay = 0, color = '#4cc3f0' }: { x?: number; y?: number; scale?: number; delay?: number; color?: string } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
	<g class="hop" style="animation-delay:{delay}s">
		<path d="M16 50 v10 M28 50 v10" stroke="#1b5e9e" stroke-width="4" stroke-linecap="round" />
		<path d="M22 0 C22 0 2 24 2 36 a20 20 0 0 0 40 0 C42 24 22 0 22 0 Z" fill={color} />
		<ellipse cx="14" cy="30" rx="4" ry="7" fill="#fff" opacity=".45" />
		<circle cx="16" cy="36" r="5" fill="#fff" />
		<circle cx="29" cy="36" r="5" fill="#fff" />
		<circle cx="17" cy="37" r="2.4" fill="#12324a" />
		<circle cx="30" cy="37" r="2.4" fill="#12324a" />
		<path d="M18 45 Q22.5 49 27 45" stroke="#12324a" stroke-width="2" fill="none" stroke-linecap="round" />
	</g>
</g>

<style>
	.hop { animation: hop 1.4s ease-in-out infinite; }
	@keyframes hop { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-9px); } }
	@media (prefers-reduced-motion: reduce) { .hop { animation: none; } }
</style>
