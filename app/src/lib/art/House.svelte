<script lang="ts">
	// A Utah bungalow, before (lawn + sprinkler + runoff) and after (native plants, mulch, drip).
	import Sprinkler from './Sprinkler.svelte';
	import Grass from './Grass.svelte';
	import Drop from './Drop.svelte';
	let { mode }: { mode: 'lawn' | 'native' } = $props();
	const stripes = [214, 230, 246, 262];
</script>

<svg viewBox="0 0 520 320" role="img" aria-label={mode === 'lawn' ? 'A house with a front lawn and a sprinkler spraying the sidewalk' : 'The same house with a flowering tree, shrubs, perennials and a small patch of lawn on drip and low water'}>
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
		<!-- bark mulch beds -->
		<rect x="0" y="212" width="520" height="70" fill="#c9a274" />
		<g fill="#b78d5f">{#each [[30, 268], [130, 276], [210, 262], [350, 276], [480, 270], [70, 250]] as [x, y]}<ellipse cx={x} cy={y} rx="7" ry="2.5" />{/each}</g>
		<!-- the lawn they kept: a small, easy-to-mow patch by the walk -->
		<path d="M296 222 H452 Q462 222 462 232 V252 Q462 262 452 262 H296 Z" fill="#8fd18a" />
		{#each [230, 242, 254] as y}<path d="M298 {y} H460" stroke="#7cc377" stroke-width="4" />{/each}
		<!-- drip line -->
		<path d="M8 276 C70 270 150 280 226 272" fill="none" stroke="#7a5638" stroke-width="2.5" stroke-dasharray="10 4" />
		{#each [[52, 279], [118, 281], [190, 280]] as [x, y]}<circle cx={x} cy={y} r="2.4" fill="#4cc3f0" />{/each}
		<!-- a small flowering tree (serviceberry) -->
		<rect x="62" y="186" width="8" height="40" rx="3" fill="#8a5a3b" />
		<g fill="#6aa84f"><circle cx="50" cy="176" r="22" /><circle cx="82" cy="172" r="22" /><circle cx="66" cy="156" r="24" /></g>
		<g fill="#8cc474"><circle cx="58" cy="160" r="10" /><circle cx="80" cy="166" r="8" /></g>
		<g fill="#fff">{#each [[44, 168], [62, 148], [86, 160], [74, 178], [52, 184], [92, 176]] as [x, y]}<circle cx={x} cy={y} r="3" />{/each}</g>
		<!-- layered shrubs along the house -->
		<g fill="#5b9a45"><circle cx="160" cy="216" r="16" /><circle cx="214" cy="218" r="14" /><circle cx="310" cy="212" r="12" /><circle cx="448" cy="212" r="13" /></g>
		<g fill="#7fb86a"><circle cx="182" cy="220" r="15" /><circle cx="330" cy="214" r="11" /><circle cx="428" cy="214" r="12" /></g>
		<!-- right border: sage, ornamental grass, rabbitbrush -->
		<g fill="#a7c4a0"><circle cx="492" cy="236" r="18" /><circle cx="474" cy="250" r="12" /></g>
		<g stroke="#8db87a" stroke-width="3" stroke-linecap="round" fill="none"><path d="M500 268 q-6 -20 -16 -30 M504 268 q0 -22 2 -34 M508 268 q8 -18 18 -26" /></g>
		<g fill="#f2c94c">{#each [[476, 268], [484, 262], [492, 268], [484, 274]] as [x, y]}<circle cx={x} cy={y} r="4.5" />{/each}</g>
		<!-- catmint mounds -->
		<g fill="#8f8be0">{#each [[120, 262], [134, 256], [148, 264], [326, 270], [340, 266], [420, 270]] as [x, y]}<circle cx={x} cy={y} r="8" />{/each}</g>
		<g fill="#b9b6f0">{#each [[126, 256], [142, 258], [334, 264]] as [x, y]}<circle cx={x} cy={y} r="3" />{/each}</g>
		<!-- yarrow -->
		<g stroke="#6aa357" stroke-width="2"><path d="M100 268 v-16 M110 270 v-20 M220 266 v-16 M230 268 v-18" /></g>
		<g fill="#fff6d6">{#each [[100, 250], [110, 248], [220, 248], [230, 248]] as [x, y]}<ellipse cx={x} cy={y} rx="7" ry="4" />{/each}</g>
		<!-- penstemon spikes -->
		<g stroke="#5b8f4e" stroke-width="2.5" stroke-linecap="round"><path d="M200 266 V236 M380 270 V242 M392 272 V246" /></g>
		<g fill="#ff6f61">{#each [238, 246, 254] as y}<circle cx="200" cy={y} r="3.4" />{/each}</g>
		<g fill="#e86aa6">{#each [244, 252, 260] as y}<circle cx="380" cy={y} r="3.2" /><circle cx="392" cy={y + 4} r="3.2" />{/each}</g>
		<!-- low groundcover along the front -->
		<g fill="#7fb86a">{#each [[44, 276], [86, 278], [176, 278], [214, 276], [318, 278], [372, 279], [446, 278]] as [x, y]}<ellipse cx={x} cy={y} rx="16" ry="5" />{/each}</g>
		<g fill="#e86aa6">{#each [[40, 274], [90, 276], [210, 274], [444, 276]] as [x, y]}<circle cx={x} cy={y} r="2.2" />{/each}</g>
		<!-- a boulder for structure -->
		<ellipse cx="150" cy="276" rx="16" ry="8" fill="#b9b2a8" /><ellipse cx="146" cy="273" rx="6" ry="3" fill="#d3cdc4" />
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
		<Grass x={10} y={206} scale={0.5} delay={-1.3} />
		<Drop x={360} y={216} scale={0.5} delay={-0.4} />
	{/if}
</svg>

<style>
	svg { width: 100%; height: auto; display: block; }
</style>
