<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import Logo from '#lib/Logo.svelte';
	import Scene from '#lib/Scene.svelte';
	import { page, updated } from '$app/state';
	import { beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';
	import '@fontsource-variable/fredoka';
	import '@fontsource-variable/nunito';
	import 'maplibre-gl/dist/maplibre-gl.css';
	let { children }: LayoutProps = $props();
	let home = $derived(page.url.pathname === '/');

	// Each deploy replaces the hashed JS files, so a tab opened before a deploy can't load the
	// next page's code. Once a new version is out, make the next click a full page load, and
	// reload if a code chunk fails to load anyway.
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
	onMount(() => {
		const reload = (e: Event) => {
			e.preventDefault();
			location.reload();
		};
		window.addEventListener('vite:preloadError', reload);
		return () => window.removeEventListener('vite:preloadError', reload);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title>Overwater.ing? · Utah lawns and the water they really need</title>
	<meta name="description" content="For any Utah home: how much lawn is on the lot, how much water it actually needs, and what Utah pays you to replace it." />
</svelte:head>

<header>
	<nav>
		<a href="/" class="home" aria-label="Overwater.ing? home"><Logo /></a>
		<div class="links">
			<a href="/#neighborhoods">Neighborhoods</a>
			<a href="/how">How it works</a>
			<a href="/impact">Why it matters</a>
		</div>
	</nav>
	{#if !home}<Scene variant="strip" />{/if}
</header>
<main class:home>{@render children()}</main>
<footer>
	<Scene variant="footer" />
	<div class="foot">
		<p><b>Made in Utah, for Utah yards.</b> Utah is the second-driest state, and most of what a Utah home uses outdoors goes on grass. Overwater.ing? shows how much lawn is on a lot, what it really needs, and what the state will pay you to replace it.</p>
		<p class="small">Lawn from 2024 USDA aerial imagery; parcels, addresses and buildings from Utah's county recorders and UGRC; tree heights from Meta; weather from gridMET; rebates from Utah Water Savers. We don't keep the addresses you look up.</p>
	</div>
</footer>

<style>
	:global(:root) {
		--bg: #f3faff;
		--panel: #ffffff;
		--panel-2: #f7fbff;
		--line: #cfe6f5;
		--ink: #12324a;
		--muted: #4f6b80;
		--water: #1f86d6;
		--water-2: #4cc3f0;
		--aqua: #dff3fd;
		--lawn: #2c9a4b;
		--sun: #ffc93c;
		--gold: #b97700;
		--coral: #e5533f;
		--accent: var(--water);
		--display: 'Fredoka Variable', 'Fredoka', system-ui, sans-serif;
		--body: 'Nunito Variable', 'Nunito', system-ui, sans-serif;
		color-scheme: light;
	}
	:global(body) {
		margin: 0;
		background: linear-gradient(180deg, #dff3fd 0, #eef8ff 340px, var(--bg) 700px);
		color: var(--ink);
		font: 17px/1.55 var(--body);
	}
	:global(a) { color: var(--water); }
	:global(h1, h2, h3) { font-family: var(--display); line-height: 1.12; margin: 0 0 0.5rem; letter-spacing: -0.005em; font-weight: 650; }
	/* No one-word last lines: balance headings, avoid orphans in body text. */
	:global(h1, h2, h3, figcaption) { text-wrap: balance; }
	:global(p, li, dd) { text-wrap: pretty; }
	:global(h1) { font-size: clamp(2.1rem, 4.6vw, 3.3rem); font-weight: 700; }
	:global(h2) { font-size: 1.6rem; }
	:global(button) { font: inherit; cursor: pointer; }
	:global(.card) { background: var(--panel); border: 2px solid var(--line); border-radius: 22px; padding: 20px; box-shadow: 0 6px 0 #d6ecf9; }
	:global(.muted) { color: var(--muted); }
	:global(.big) { font-family: var(--display); font-size: 2.2rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.05; }
	:global(.kicker) { font-family: var(--display); font-size: 0.85rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--water); margin: 0 0 4px; }
	:global(.small) { font-size: 0.9rem; }
	:global(input, select) { font: inherit; color: var(--ink); background: #fff; border: 2px solid var(--line); border-radius: 14px; padding: 10px 12px; }
	/* Our own chevron: Safari ignores padding, radius and height on native select menus. */
	:global(select) { appearance: none; -webkit-appearance: none; padding-right: 40px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 6l4.5 4.5L12.5 6' fill='none' stroke='%231f86d6' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 14px center / 14px; cursor: pointer; }
	:global(select:hover) { border-color: #a9d4ef; }
	:global(input:focus-visible, select:focus-visible, a:focus-visible, button:focus-visible) { outline: 3px solid var(--water-2); outline-offset: 2px; }

	nav { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 14px 20px; max-width: 1140px; margin: 0 auto; }
	.home { text-decoration: none; color: var(--ink); }
	.links { display: flex; gap: 8px; }
	.links a { color: var(--ink); text-decoration: none; font-family: var(--display); font-weight: 600; padding: 6px 14px; border-radius: 999px; white-space: nowrap; }
	.links a:hover { background: #fff; box-shadow: 0 3px 0 #d6ecf9; }
	@media (max-width: 560px) { nav { padding: 10px 12px; } .links { gap: 0; font-size: 0.9rem; } .links a { padding: 6px 8px; } nav :global(.word) { font-size: 1.15rem; } nav :global(.logo svg) { width: 34px; height: 34px; } }
	@media (max-width: 520px) { .links a:first-child { display: none; } }
	@media (max-width: 400px) { .links a:nth-child(2) { display: none; } }

	main { max-width: 1100px; margin: 0 auto; padding: 18px 20px 40px; }
	main.home { padding-top: 0; }
	footer { margin-top: 30px; }
	.foot { background: #f7dcae; padding: 4px 20px 36px; }
	.foot p { max-width: 1060px; margin: 10px auto; color: #5b4630; }
	.foot b { color: #3d2c1a; }
</style>
