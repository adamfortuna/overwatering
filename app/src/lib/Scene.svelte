<script lang="ts">
	// SVG scenery. hero: home page island beside the search (lawn vs. native, Delicate Arch); strip: thin
	// water band under the nav on inner pages; footer: Wasatch, the arch, a sleepy sprinkler.
	import Sprinkler from './art/Sprinkler.svelte';
	import Grass from './art/Grass.svelte';
	import Drop from './art/Drop.svelte';
	import Sun from './art/Sun.svelte';
	import Arch from './art/Arch.svelte';
	let { variant = 'hero' }: { variant?: 'hero' | 'strip' | 'footer' } = $props();
	// The hero's ground: a soft rounded island so the scene can float beside the search box.
	const ISLAND = 'M24 360 C120 316 520 312 620 352 C648 410 610 476 320 486 C40 478 -4 416 24 360 Z';
	// Utah's outline (the notch is the NE corner), in a 60 x 70 box.
	const UTAH = '0,0 38,0 38,16 60,16 60,70 0,70';
</script>

{#if variant === 'hero'}
	<!-- Compact island scene that sits beside the headline (never cropped). -->
	<svg class="scene hero" viewBox="0 0 640 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
		<defs><clipPath id="hero-island"><path d={ISLAND} /></clipPath></defs>
		<g class="drift" fill="#fff">
			<ellipse cx="110" cy="70" rx="48" ry="16" /><ellipse cx="140" cy="58" rx="30" ry="18" /><ellipse cx="84" cy="62" rx="22" ry="12" />
			<ellipse cx="350" cy="44" rx="36" ry="12" /><ellipse cx="372" cy="36" rx="22" ry="12" />
		</g>
		<Sun x={560} y={80} scale={0.85} />
		<Arch x={236} y={128} bowl={false} />
		<!-- the yard: thirsty lawn on the left, native landscape on the right -->
		<path d={ISLAND} fill="#f7dcae" />
		<g clip-path="url(#hero-island)">
			<path d="M0 300 H300 C280 360 300 420 250 520 H0 Z" fill="#8fd18a" />
			<path d="M40 380 H262 M50 410 H256 M64 440 H250" stroke="#7cc377" stroke-width="6" stroke-linecap="round" />
			<g fill="#e9c48c"><ellipse cx="380" cy="438" rx="14" ry="6" /><ellipse cx="560" cy="420" rx="16" ry="6" /></g>
		</g>
		<!-- slickrock mound the arch stands on, inside the island -->
		<path d="M352 334 C380 302 470 296 530 312 C556 320 566 332 560 340 C520 350 400 352 352 334 Z" fill="#f2b98a" />
		<path d="M376 336 C410 318 480 314 530 326 C520 340 420 344 376 336 Z" fill="#eaa274" />
		<g stroke="#5b8f4e" stroke-width="3" stroke-linecap="round"><path d="M470 424 V388 M490 428 V396" /></g>
		<g fill="#6f7ff0"><circle cx="470" cy="388" r="4" /><circle cx="470" cy="397" r="4" /><circle cx="470" cy="406" r="4" /><circle cx="490" cy="396" r="4" /><circle cx="490" cy="405" r="4" /></g>
		<g fill="#ff6f61"><circle cx="534" cy="392" r="4" /><circle cx="534" cy="401" r="4" /></g>
		<path d="M534 422 V392" stroke="#5b8f4e" stroke-width="3" stroke-linecap="round" />
		<Sprinkler x={44} y={214} />
		<Drop x={196} y={330} scale={0.85} />
		<Drop x={238} y={346} scale={0.7} delay={-0.5} color="#7fd6f5" />
		<Grass x={300} y={306} scale={0.92} />
		<Grass x={520} y={328} scale={0.65} delay={-1.2} />
	</svg>
{:else if variant === 'strip'}
	<svg class="scene strip" viewBox="0 0 1200 56" preserveAspectRatio="none" aria-hidden="true">
		<path d="M0 30 C150 10 300 46 450 28 C600 10 750 46 900 28 C1050 10 1150 36 1200 26 V56 H0 Z" fill="#cdeefd" />
		<path d="M0 40 C200 26 350 54 520 40 C700 26 850 54 1020 40 C1100 34 1160 44 1200 40 V56 H0 Z" fill="#a9e1f8" />
	</svg>
{:else}
	<svg class="scene footer" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
		<!-- Wasatch Front -->
		<path d="M0 150 L90 96 L150 120 L230 70 L300 110 L370 84 L460 128 L540 100 L600 140 L1200 150 V220 H0 Z" fill="#cfe8f6" />
		<path d="M230 70 L214 82 L224 82 L232 90 L240 80 Z M370 84 L360 92 L368 92 L374 98 L380 91 Z" fill="#fff" />
		<Arch x={650} y={6} scale={0.72} mountains={false} />
		<path d="M0 178 C240 166 520 170 760 174 C960 178 1100 170 1200 172 V220 H0 Z" fill="#f7dcae" />
		<Sprinkler x={70} y={46} scale={0.8} spray={false} off />
		<!-- a little "Utah" sign -->
		<g transform="translate(470 104)">
			<rect x="26" y="34" width="8" height="46" rx="3" fill="#b07a4a" />
			<rect x="0" y="0" width="60" height="44" rx="10" fill="#fff" stroke="#cfe6f5" stroke-width="3" />
			<polygon points={UTAH} transform="translate(10 7) scale(0.42)" fill="#2f86d6" />
			<text x="44" y="30" text-anchor="middle" font-family="var(--display)" font-weight="700" font-size="11" fill="#12324a">UT</text>
		</g>
		<Grass x={260} y={92} scale={0.82} />
		<Drop x={200} y={150} scale={0.7} delay={-0.7} />
		<Grass x={980} y={104} scale={0.74} delay={-1.4} />
		<Grass x={1090} y={118} scale={0.62} delay={-0.6} />
	</svg>
{/if}

<style>
	.scene { display: block; width: 100%; }
	.hero { width: 100%; height: auto; }
	.strip { height: 40px; }
	/* Scales with the width; past ~1750px it stops growing and centers, and the sand ground
	   continues to both edges via the background. */
	.footer { height: auto; aspect-ratio: 1200 / 220; max-height: 320px; background: linear-gradient(to bottom, transparent 68%, #cfe8f6 68%, #cfe8f6 79.5%, #f7dcae 79.5%); }
	.drift { animation: drift 40s ease-in-out infinite alternate; }
	@keyframes drift { to { transform: translateX(80px); } }
	@media (prefers-reduced-motion: reduce) { .drift { animation: none; } }
</style>
