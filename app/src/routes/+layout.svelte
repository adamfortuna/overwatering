<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import Brand from '#lib/Brand.svelte';
	import type { LayoutProps } from './$types';
	import '@fontsource-variable/bricolage-grotesque';
	import 'maplibre-gl/dist/maplibre-gl.css';
	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Overwater.ing?</title>
	<meta name="description" content="How much lawn is on your lot, how much water it actually needs, and what it's worth to stop overwatering it." />
</svelte:head>

<nav>
	<a href="/" class="home" aria-label="Overwater.ing? home"><Brand /></a>
	<div class="links">
		<a href="/#scoreboard">Scoreboard</a>
		<a href="/how">How it works</a>
	</div>
</nav>
<div class="marquee" aria-hidden="true">{#each Array(48) as _, i}<i style="--i:{i}"></i>{/each}</div>
<main>{@render children()}</main>
<footer>
	<p>Overwater.ing? estimates lawn from 2024 aerial imagery. Your address never leaves this site: there is no map provider, and the imagery is our own crop.</p>
</footer>

<style>
	:global(:root) {
		--bg: #0b1020;
		--panel: #141b33;
		--panel-2: #1b2443;
		--line: #27315a;
		--ink: #f5f1e6;
		--muted: #a4acc8;
		--water: #4cc9f0;
		--lawn: #4ade80;
		--gold: #ffc940;
		--coral: #ff7a6b;
		--warn: #ffc940;
		--danger: #ff7a6b;
		--accent: var(--water);
		--display: 'Bricolage Grotesque Variable', system-ui, sans-serif;
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: radial-gradient(1200px 500px at 50% -200px, #1a2550 0%, transparent 70%), var(--bg);
		background-attachment: fixed;
		color: var(--ink);
		font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
	:global(a) { color: var(--water); }
	:global(h1, h2, h3) { font-family: var(--display); line-height: 1.1; margin: 0 0 0.5rem; letter-spacing: -0.01em; }
	:global(h1) { font-size: clamp(2rem, 4.5vw, 3.2rem); font-weight: 800; }
	:global(h2) { font-size: 1.5rem; font-weight: 750; }
	:global(button) { font: inherit; cursor: pointer; }
	:global(.card) { background: linear-gradient(180deg, var(--panel-2), var(--panel)); border: 1px solid var(--line); border-radius: 16px; padding: 18px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04); }
	:global(.muted) { color: var(--muted); }
	:global(.big) { font-family: var(--display); font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.05; }
	:global(.kicker) { font-family: var(--display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); }
	:global(.small) { font-size: 0.9rem; }
	:global(input, select) { font: inherit; color: var(--ink); background: #0a0f1e; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
	:global(input:focus-visible, select:focus-visible, a:focus-visible, button:focus-visible) { outline: 2px solid var(--gold); outline-offset: 2px; }

	nav { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 14px 20px 10px; max-width: 1140px; margin: 0 auto; }
	.home { text-decoration: none; color: var(--ink); }
	.links { display: flex; gap: 18px; }
	@media (max-width: 520px) { nav { padding: 12px 14px 8px; } .links { gap: 12px; font-size: 0.9rem; } }
	.links a { color: var(--muted); text-decoration: none; font-weight: 600; white-space: nowrap; }
	.links a:hover { color: var(--ink); }

	/* A row of marquee bulbs: a slow chase, gone for reduced motion. */
	.marquee { display: flex; justify-content: space-between; max-width: 1100px; margin: 0 auto 8px; padding: 0 20px; height: 6px; overflow: hidden; }
	.marquee i { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); opacity: 0.18; animation: chase 4.8s linear infinite; animation-delay: calc(var(--i) * 0.1s); }
	@keyframes chase { 0%, 88%, 100% { opacity: 0.18; } 92% { opacity: 0.9; box-shadow: 0 0 6px var(--gold); } }
	@media (prefers-reduced-motion: reduce) { .marquee i { animation: none; } }

	main { max-width: 1100px; margin: 0 auto; padding: 16px 20px 40px; }
	footer { max-width: 1100px; margin: 0 auto; padding: 18px 20px 40px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.85rem; }
</style>
