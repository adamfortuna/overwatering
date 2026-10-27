<script lang="ts">
	// A Utah bungalow, before (lawn + sprinkler + runoff) and after (native plants, mulch, drip).
	import Sprinkler from './Sprinkler.svelte';
	import Grass from './Grass.svelte';
	import Drop from './Drop.svelte';
	let { mode }: { mode: 'lawn' | 'native' } = $props();
	const stripes = [214, 230, 246, 262];

	// The native pollinator garden: a fixed pseudo-random planting (same picture every load),
	// back rows taller, drawn back to front.
	type Plant = { t: 'grass' | 'spike' | 'daisy' | 'yarrow' | 'mallow'; x: number; y: number; h: number; c: string };
	let seed = 11;
	const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
	const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
	const GRASS = ['#7fb86a', '#a7c46c', '#c9b46a', '#8fb9a8'];
	const SPIKE = ['#ff6f61', '#e86aa6', '#8f6fe0', '#5f7ff0'];
	const DAISY = ['#a98bea', '#e2553f', '#ffd23f', '#f49ac1'];
	const plants: Plant[] = [];
	for (const [x0, x1] of [[6, 224], [296, 516]])
		for (const [row, y] of [226, 238, 250, 262, 274].entries())
			for (let x = x0 + rnd() * 8; x < x1; x += 10 + rnd() * 8) {
				const h = (30 - row * 4) * (0.8 + rnd() * 0.5);
				const r = rnd();
				const t: Plant['t'] = r < 0.34 ? 'grass' : r < 0.56 ? 'spike' : r < 0.76 ? 'daisy' : r < 0.88 ? 'yarrow' : 'mallow';
				const c = t === 'grass' ? pick(GRASS) : t === 'spike' ? pick(SPIKE) : t === 'daisy' ? pick(DAISY) : t === 'yarrow' ? pick(['#fff6d6', '#fde68a']) : '#f6894e';
				plants.push({ t, x, y: y + rnd() * 6, h, c });
			}
	plants.sort((a, b) => a.y - b.y);
	// Low leafy mounds under everything, so the beds read as green rather than mulch.
	const mounds: [number, number, number, string][] = [];
	for (const [x0, x1] of [[0, 228], [292, 520]])
		for (const y of [230, 246, 262, 276])
			for (let x = x0 + rnd() * 6; x < x1; x += 16 + rnd() * 6) mounds.push([x, y + rnd() * 4, 9 + rnd() * 5, pick(['#7fb86a', '#6aa84f', '#94c47c', '#a3c98c'])]);
	const tuft = (x: number, y: number, h: number) =>
		[-1, -0.5, 0, 0.5, 1].map((d, i) => `M${x + d * 2} ${y} Q${x + d * 5} ${y - h * 0.55} ${x + d * 12} ${y - h * (i % 2 ? 0.8 : 1)}`).join(' ');
</script>

<svg viewBox="0 0 520 320" role="img" aria-label={mode === 'lawn' ? 'A house with a front lawn and a sprinkler spraying the sidewalk' : 'The same house with a native pollinator garden: a serviceberry and a redbud in bloom, shrubs, grasses and wildflowers, with butterflies and a bee'}>
	<!-- mountains + house -->
	<path d="M0 150 L70 96 L120 124 L190 70 L250 110 L300 86 L380 132 L440 100 L520 140 V210 H0 Z" fill="#dcefff" />
	<path d="M190 70 L178 80 L188 80 L194 88 L202 79 Z M440 100 L432 108 L440 108 L446 114 L450 108 Z" fill="#fff" />
	<rect x="324" y="64" width="16" height="34" rx="3" fill="#b65b3e" />
	<polygon points="132,122 260,58 388,122" fill="#5b7fa6" />
	<polygon points="132,122 260,58 388,122 380,128 260,68 140,128" fill="#4a6a8f" />
	<rect x="150" y="118" width="220" height="92" fill="#f6e6cc" />
	<rect x="150" y="118" width="220" height="8" fill="#ead6b6" />
	<rect x="176" y="140" width="48" height="38" rx="4" fill="#dff3fd" stroke="#fff" stroke-width="4" />
	<rect x="296" y="140" width="48" height="38" rx="4" fill="#dff3fd" stroke="#fff" stroke-width="4" />
	<path d="M200 140 V178 M176 159 H224 M320 140 V178 M296 159 H344" stroke="#fff" stroke-width="3" />
	<path d="M244 210 V158 a16 16 0 0 1 32 0 V210 Z" fill="#2f86d6" />
	<circle cx="270" cy="186" r="2.5" fill="#ffc93c" />
	<rect x="236" y="208" width="48" height="6" rx="2" fill="#d9cdbd" />

	<!-- yard -->
	{#if mode === 'lawn'}
		<rect x="0" y="212" width="520" height="70" fill="#8fd18a" />
		{#each stripes as y}<path d="M0 {y} H236 M284 {y} H520" stroke="#7cc377" stroke-width="5" />{/each}
	{:else}
		<!-- mulch, mostly hidden by plants -->
		<rect x="0" y="212" width="520" height="70" fill="#b98f62" />
		<!-- a small flowering tree (serviceberry) -->
		<rect x="62" y="186" width="8" height="40" rx="3" fill="#8a5a3b" />
		<g fill="#6aa84f"><circle cx="50" cy="176" r="22" /><circle cx="82" cy="172" r="22" /><circle cx="66" cy="156" r="24" /></g>
		<g fill="#8cc474"><circle cx="58" cy="160" r="10" /><circle cx="80" cy="166" r="8" /></g>
		<g fill="#fff">{#each [[44, 168], [62, 148], [86, 160], [74, 178], [52, 184], [92, 176]] as [x, y]}<circle cx={x} cy={y} r="3" />{/each}</g>
		<!-- a western redbud on the right: multi-trunk, magenta spring blossoms -->
		<path d="M466 228 Q464 204 452 186 M468 228 Q470 200 482 182 M467 228 V190" stroke="#7a4a35" stroke-width="5" stroke-linecap="round" fill="none" />
		<g fill="#7cae5a"><circle cx="446" cy="172" r="18" /><circle cx="490" cy="170" r="19" /><circle cx="468" cy="152" r="23" /><circle cx="470" cy="178" r="17" /></g>
		<g fill="#d1559b"><circle cx="452" cy="160" r="14" /><circle cx="484" cy="158" r="13" /><circle cx="468" cy="140" r="12" /><circle cx="462" cy="176" r="10" /><circle cx="490" cy="176" r="10" /></g>
		<g fill="#f08ac0">{#each [[446, 154], [458, 166], [472, 134], [480, 150], [492, 164], [466, 180], [438, 170], [478, 172], [456, 142]] as [x, y]}<circle cx={x} cy={y} r="3.4" />{/each}</g>
		<!-- shrubs against the house -->
		<g fill="#5b9a45"><circle cx="160" cy="216" r="16" /><circle cx="214" cy="218" r="14" /><circle cx="312" cy="214" r="14" /><circle cx="448" cy="212" r="14" /><circle cx="500" cy="218" r="16" /></g>
		<g fill="#7fb86a"><circle cx="182" cy="220" r="15" /><circle cx="334" cy="216" r="12" /><circle cx="426" cy="214" r="12" /></g>
		<!-- leafy base -->
		{#each mounds as [x, y, r, c]}<ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill={c} />{/each}
		<!-- the planting -->
		{#each plants as p}
			{#if p.t === 'grass'}
				<path d={tuft(p.x, p.y, p.h * 1.1)} stroke={p.c} stroke-width="2.4" stroke-linecap="round" fill="none" />
				{#if p.c === '#c9b46a'}<g fill="#e0c46c">{#each [-12, 0, 12] as d}<ellipse cx={p.x + d} cy={p.y - p.h * 1.1 + 2} rx="2" ry="4" />{/each}</g>{/if}
			{:else if p.t === 'spike'}
				<line x1={p.x} y1={p.y} x2={p.x} y2={p.y - p.h} stroke="#5b8f4e" stroke-width="2.2" stroke-linecap="round" />
				<g fill={p.c}>{#each [0.45, 0.62, 0.79, 0.96] as f}<circle cx={p.x} cy={p.y - p.h * f} r={3.4 - f} />{/each}</g>
			{:else if p.t === 'daisy'}
				<line x1={p.x} y1={p.y} x2={p.x} y2={p.y - p.h * 0.8} stroke="#5b8f4e" stroke-width="2" />
				<g fill={p.c}>{#each [0, 60, 120, 180, 240, 300] as a}<ellipse cx={p.x + Math.cos((a * Math.PI) / 180) * 4} cy={p.y - p.h * 0.8 + Math.sin((a * Math.PI) / 180) * 4} rx="3" ry="2" transform="rotate({a} {p.x + Math.cos((a * Math.PI) / 180) * 4} {p.y - p.h * 0.8 + Math.sin((a * Math.PI) / 180) * 4})" />{/each}</g>
				<circle cx={p.x} cy={p.y - p.h * 0.8} r="2.4" fill={p.c === '#ffd23f' ? '#8a5a3b' : '#ffc93c'} />
			{:else if p.t === 'yarrow'}
				<path d="M{p.x} {p.y} v{-p.h * 0.7} M{p.x} {p.y - p.h * 0.4} l-5 -6 M{p.x} {p.y - p.h * 0.4} l5 -6" stroke="#6aa357" stroke-width="2" fill="none" />
				<ellipse cx={p.x} cy={p.y - p.h * 0.7} rx="8" ry="4.5" fill={p.c} />
			{:else}
				<g fill="#9fb98f"><circle cx={p.x - 4} cy={p.y - 4} r="5" /><circle cx={p.x + 4} cy={p.y - 5} r="5" /></g>
				<g fill={p.c}>{#each [[-4, -10], [3, -13], [6, -6]] as [dx, dy]}<circle cx={p.x + dx} cy={p.y + dy} r="3" />{/each}</g>
			{/if}
		{/each}
		<!-- pollinators -->
		<g class="flutter" style="--d:0s"><g transform="translate(120 196)"><ellipse cx="-5" cy="0" rx="6" ry="4.5" fill="#f28c28" /><ellipse cx="5" cy="0" rx="6" ry="4.5" fill="#f28c28" /><ellipse cx="-4" cy="5" rx="4" ry="3" fill="#e2553f" /><ellipse cx="4" cy="5" rx="4" ry="3" fill="#e2553f" /><rect x="-1" y="-5" width="2" height="12" rx="1" fill="#12324a" /></g></g>
		<g class="flutter" style="--d:-1.1s"><g transform="translate(400 200)"><ellipse cx="-4.5" cy="0" rx="5" ry="4" fill="#6f8ff0" /><ellipse cx="4.5" cy="0" rx="5" ry="4" fill="#6f8ff0" /><ellipse cx="-3.5" cy="4.5" rx="3.4" ry="2.6" fill="#a9b8ff" /><ellipse cx="3.5" cy="4.5" rx="3.4" ry="2.6" fill="#a9b8ff" /><rect x="-1" y="-4" width="2" height="11" rx="1" fill="#12324a" /></g></g>
		<g class="bob"><g transform="translate(470 236)"><ellipse cx="0" cy="0" rx="6" ry="4.5" fill="#ffc93c" /><path d="M-2 -4 v8 M2 -4 v8" stroke="#12324a" stroke-width="1.6" /><ellipse cx="-2" cy="-6" rx="4" ry="3" fill="#ffffff" opacity=".85" /><ellipse cx="3" cy="-6" rx="4" ry="3" fill="#ffffff" opacity=".85" /></g></g>
	{/if}
	<!-- front walk -->
	<path d="M240 214 H280 L292 282 H228 Z" fill="#e3ddd4" />

	<!-- sidewalk, park strip, curb -->
	<rect x="0" y="282" width="520" height="14" fill="#e6e9ee" />
	{#if mode === 'lawn'}
		<rect x="0" y="296" width="520" height="16" fill="#8fd18a" />
		<ellipse cx="186" cy="290" rx="36" ry="5" fill="#9fdcf7" opacity=".9" />
		<path d="M120 292 q-20 6 -40 2" stroke="#9fdcf7" stroke-width="4" fill="none" stroke-linecap="round" />
	{:else}
		<rect x="0" y="296" width="520" height="16" fill="#c9a274" />
		<g fill="#7fb86a">{#each [20, 70, 150, 200, 300, 350, 430, 490] as x}<ellipse cx={x} cy="304" rx="22" ry="6" />{/each}</g>
		<g fill="#e86aa6">{#each [30, 160, 310, 440] as x}<circle cx={x} cy="302" r="2.4" /><circle cx={x + 10} cy="306" r="2.4" />{/each}</g>
		<g fill="#d8cfc3">{#each [110, 250, 390] as x}<ellipse cx={x} cy="304" rx="13" ry="4.5" />{/each}</g>
	{/if}
	<rect x="0" y="312" width="520" height="8" fill="#c9cfd8" />

	<!-- characters -->
	{#if mode === 'lawn'}
		<Sprinkler x={64} y={168} scale={0.5} />
		<Drop x={380} y={256} scale={0.55} />
	{:else}
		<Grass x={150} y={204} scale={0.5} delay={-1.3} />
		<Drop x={300} y={250} scale={0.45} delay={-0.4} />
	{/if}
</svg>

<style>
	svg { width: 100%; height: auto; display: block; }
	.flutter { animation: drift 6s ease-in-out infinite alternate; animation-delay: var(--d); }
	.flutter ellipse { transform-box: fill-box; transform-origin: center; animation: flap 0.5s ease-in-out infinite alternate; }
	.bob { animation: bob 1.8s ease-in-out infinite; }
	@keyframes drift { to { transform: translate(26px, -10px); } }
	@keyframes flap { to { transform: scaleX(0.35); } }
	@keyframes bob { 50% { transform: translate(-6px, -5px); } }
	@media (prefers-reduced-motion: reduce) { .flutter, .flutter ellipse, .bob { animation: none; } }
</style>
