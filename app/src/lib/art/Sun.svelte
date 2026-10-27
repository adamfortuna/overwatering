<svelte:options namespace="svg" />

<script lang="ts">
	// A content sun. Centered at (x, y), radius ~34 before rays.
	let { x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number } = $props();
	const rays = Array.from({ length: 12 }, (_, i) => i * 30);
</script>

<g transform="translate({x} {y}) scale({scale})">
	<g class="spin">
		{#each rays as a}
			<line x1="0" y1="-44" x2="0" y2="-56" stroke="#ffc93c" stroke-width="7" stroke-linecap="round" transform="rotate({a})" />
		{/each}
	</g>
	<circle r="36" fill="#ffd54f" />
	<path d="M-15 -4 q6 -6 12 0 M3 -4 q6 -6 12 0" stroke="#12324a" stroke-width="3" fill="none" stroke-linecap="round" />
	<circle cx="-20" cy="9" r="5" fill="#ff8fa3" opacity=".6" />
	<circle cx="20" cy="9" r="5" fill="#ff8fa3" opacity=".6" />
	<path d="M-9 10 Q0 19 9 10" stroke="#12324a" stroke-width="3" fill="none" stroke-linecap="round" />
</g>

<style>
	.spin { animation: spin 30s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
