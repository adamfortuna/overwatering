<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import 'maplibre-gl/dist/maplibre-gl.css';
	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav>
	<a href="/" class="brand">Utah Lawn Water Lens</a>
	<a href="/district/sandy">District view</a>
</nav>
<main>{@render children()}</main>

<style>
	:global(:root) { --bg: #0f1413; --panel: #182220; --ink: #e8efec; --muted: #9bb0a8; --lawn: #4ade80; --accent: #7dd3fc; --warn: #fbbf24; --danger: #f87171; color-scheme: dark; }
	:global(body) { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.45 system-ui, -apple-system, Segoe UI, sans-serif; }
	:global(a) { color: var(--accent); }
	:global(h1, h2, h3) { line-height: 1.2; margin: 0 0 0.5rem; }
	:global(button) { font: inherit; cursor: pointer; }
	:global(.card) { background: var(--panel); border-radius: 12px; padding: 16px; }
	:global(.muted) { color: var(--muted); }
	:global(.big) { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; }
	nav { display: flex; gap: 18px; align-items: center; padding: 12px 16px; border-bottom: 1px solid #243230; }
	.brand { font-weight: 700; color: var(--ink); text-decoration: none; }
	main { max-width: 1100px; margin: 0 auto; padding: 16px; }
</style>
