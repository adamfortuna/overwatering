<svelte:options namespace="svg" />

<script lang="ts">
	// Rebate the coin. Centered at (x, y), radius 30.
	let { x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
	<g class="flip">
		<circle r="30" fill="#ffc93c" />
		<circle r="23" fill="none" stroke="#f0a92a" stroke-width="3" />
		<text y="-4" text-anchor="middle" font-family="var(--display)" font-weight="700" font-size="17" fill="#c27c00">$</text>
		<circle cx="-9" cy="6" r="3" fill="#12324a" />
		<circle cx="9" cy="6" r="3" fill="#12324a" />
		<path d="M-6 13 Q0 18 6 13" stroke="#12324a" stroke-width="2.2" fill="none" stroke-linecap="round" />
	</g>
</g>

<style>
	.flip { animation: flip 3s ease-in-out infinite; }
	@keyframes flip { 0%, 70%, 100% { transform: scaleX(1); } 80% { transform: scaleX(0.15); } 90% { transform: scaleX(1); } }
	@media (prefers-reduced-motion: reduce) { .flip { animation: none; } }
</style>
