<script lang="ts">
	// A Utah bungalow, before (lawn + sprinkler + runoff) and after (native plants, mulch, drip).
	import Sprinkler from './Sprinkler.svelte';
	import Grass from './Grass.svelte';
	import Drop from './Drop.svelte';
	let { mode }: { mode: 'lawn' | 'native' } = $props();
	const stripes = [214, 230, 246, 262];
</script>

<svg viewBox="0 0 520 320" role="img" aria-label={mode === 'lawn' ? 'A house with a front lawn and a sprinkler spraying the sidewalk' : 'The same house with native plants, boulders, mulch and drip irrigation'}>
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
		<rect x="0" y="212" width="520" height="70" fill="#f1d3a1" />
		<g fill="#e3b97f">{#each [[30, 230], [90, 262], [150, 240], [380, 236], [440, 266], [500, 228], [200, 270]] as [x, y]}<circle cx={x} cy={y} r="2.5" />{/each}</g>
		<!-- drip line with emitters -->
		<path d="M10 272 C80 266 140 276 228 268 M292 268 C360 276 430 264 512 272" fill="none" stroke="#7a5638" stroke-width="2.5" stroke-dasharray="10 4" />
		{#each [[60, 271], [170, 272], [350, 273], [470, 268]] as [x, y]}<circle cx={x} cy={y + 5} r="2.6" fill="#4cc3f0" />{/each}
		<!-- boulders -->
		<ellipse cx="120" cy="246" rx="22" ry="13" fill="#b9b2a8" /><ellipse cx="114" cy="242" rx="8" ry="4" fill="#d3cdc4" />
		<ellipse cx="440" cy="254" rx="18" ry="11" fill="#b9b2a8" />
		<!-- sage shrubs, rabbitbrush, penstemon -->
		<g fill="#a7c4a0"><circle cx="40" cy="236" r="16" /><circle cx="56" cy="240" r="12" /><circle cx="470" cy="236" r="15" /></g>
		<g fill="#f2c94c">{#each [[396, 222], [404, 216], [412, 222], [408, 228], [400, 228]] as [x, y]}<circle cx={x} cy={y} r="5" />{/each}</g>
		<path d="M398 232 l6 -8 m6 8 l-6 -8 m0 0 v12" stroke="#6aa357" stroke-width="2" />
		<g stroke="#5b8f4e" stroke-width="2.5" stroke-linecap="round"><path d="M190 258 V226 M204 260 V232 M494 258 V230" /></g>
		<g fill="#ff6f61">{#each [226, 234, 242] as y}<circle cx="190" cy={y} r="3.4" />{/each}</g>
		<g fill="#7a7ff0">{#each [232, 240, 248] as y}<circle cx="204" cy={y} r="3.4" /><circle cx="494" cy={y - 2} r="3.4" />{/each}</g>
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
		<rect x="0" y="296" width="520" height="16" fill="#f1d3a1" />
		<g fill="#d8cfc3">{#each [40, 120, 200, 320, 400, 480] as x}<ellipse cx={x} cy="304" rx="16" ry="5" />{/each}</g>
	{/if}
	<rect x="0" y="312" width="520" height="8" fill="#c9cfd8" />

	<!-- characters -->
	{#if mode === 'lawn'}
		<Sprinkler x={64} y={168} scale={0.5} />
		<Drop x={380} y={256} scale={0.55} />
	{:else}
		<Grass x={300} y={182} scale={0.68} />
		<Grass x={70} y={196} scale={0.52} delay={-1.3} />
		<Drop x={150} y={268} scale={0.5} delay={-0.4} />
	{/if}
</svg>

<style>
	svg { width: 100%; height: auto; display: block; }
</style>
