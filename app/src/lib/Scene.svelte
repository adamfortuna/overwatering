<script lang="ts">
	// Full-bleed SVG scenery. hero: home page (lawn vs. desert, Delicate Arch); strip: thin
	// water band under the nav on inner pages; footer: Wasatch, the arch, a sleepy sprinkler.
	import Sprinkler from './art/Sprinkler.svelte';
	import Grass from './art/Grass.svelte';
	import Drop from './art/Drop.svelte';
	import Sun from './art/Sun.svelte';
	import Arch from './art/Arch.svelte';
	let { variant = 'hero' }: { variant?: 'hero' | 'strip' | 'footer' } = $props();
	// Utah's outline (the notch is the NE corner), in a 60 x 70 box.
	const UTAH = '0,0 38,0 38,16 60,16 60,70 0,70';
</script>

{#if variant === 'hero'}
	<svg class="scene hero" viewBox="0 0 1200 290" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
		<g class="drift" fill="#fff">
			<ellipse cx="160" cy="46" rx="56" ry="18" /><ellipse cx="196" cy="34" rx="34" ry="20" /><ellipse cx="128" cy="38" rx="26" ry="14" />
			<ellipse cx="560" cy="28" rx="44" ry="14" /><ellipse cx="588" cy="20" rx="26" ry="14" />
		</g>
		<Sun x={1110} y={64} scale={0.85} />
		<Arch x={760} y={22} />
		<!-- ground: thirsty lawn on the left, native landscape on the right -->
		<path d="M0 238 C180 226 380 230 590 240 L590 290 L0 290 Z" fill="#8fd18a" />
		<path d="M40 258 H560 M70 272 H540" stroke="#7cc377" stroke-width="6" stroke-linecap="round" />
		<path d="M560 242 C760 230 980 232 1200 238 L1200 290 L560 290 Z" fill="#f7dcae" />
		<g fill="#e9c48c"><ellipse cx="700" cy="268" rx="14" ry="6" /><ellipse cx="1010" cy="276" rx="18" ry="7" /><ellipse cx="1140" cy="262" rx="10" ry="5" /></g>
		<!-- penstemon -->
		<g stroke="#5b8f4e" stroke-width="3" stroke-linecap="round"><path d="M880 262 V226 M900 264 V234" /></g>
		<g fill="#6f7ff0"><circle cx="880" cy="226" r="4" /><circle cx="880" cy="235" r="4" /><circle cx="880" cy="244" r="4" /><circle cx="900" cy="234" r="4" /><circle cx="900" cy="243" r="4" /></g>
		<Sprinkler x={130} y={86} scale={0.95} />
		<Drop x={410} y={196} scale={0.8} />
		<Drop x={466} y={204} scale={0.7} delay={-0.5} color="#7fd6f5" />
		<Grass x={600} y={124} scale={0.95} />
		<Grass x={950} y={156} scale={0.72} delay={-1.2} />
		<Grass x={1090} y={170} scale={0.6} delay={-2} />
	</svg>
{:else if variant === 'strip'}
	<svg class="scene strip" viewBox="0 0 1200 56" preserveAspectRatio="none" aria-hidden="true">
		<path d="M0 30 C150 10 300 46 450 28 C600 10 750 46 900 28 C1050 10 1150 36 1200 26 V56 H0 Z" fill="#cdeefd" />
		<path d="M0 40 C200 26 350 54 520 40 C700 26 850 54 1020 40 C1100 34 1160 44 1200 40 V56 H0 Z" fill="#a9e1f8" />
	</svg>
{:else}
	<svg class="scene footer" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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
	.hero { height: clamp(170px, 26vw, 290px); }
	.strip { height: 40px; }
	.footer { height: clamp(150px, 20vw, 220px); }
	.drift { animation: drift 40s ease-in-out infinite alternate; }
	@keyframes drift { to { transform: translateX(80px); } }
	@media (prefers-reduced-motion: reduce) { .drift { animation: none; } }
</style>
