<script lang="ts">
	let { size = '1.35rem' }: { size?: string } = $props();
</script>

<span class="brand" style="font-size:{size}">Overwater<span class="ing">.ing</span><span class="q">?</span></span>

<style>
	.brand { font-family: var(--display); font-weight: 800; letter-spacing: -0.02em; white-space: nowrap; }
	.ing { color: var(--water); }
	.q { display: inline-block; color: var(--gold); transform: rotate(10deg) translateY(-0.04em); margin-left: 0.04em; transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1); }
	:global(a:hover) .q { transform: rotate(-6deg) translateY(-0.12em) scale(1.12); }
	@media (prefers-reduced-motion: reduce) { .q { transition: none; } }
</style>
