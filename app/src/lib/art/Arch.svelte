<svelte:options namespace="svg" />

<script lang="ts">
	// Delicate Arch on its slickrock bowl, with the La Sal Mountains behind.
	// Local box ~360 x 220 with the slickrock base at y = 220.
	let { x = 0, y = 0, scale = 1, mountains = true }: { x?: number; y?: number; scale?: number; mountains?: boolean } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
	{#if mountains}
		<!-- La Sals: soft lavender with snow caps -->
		<path d="M-20 168 L40 96 L70 120 L112 66 L150 108 L176 88 L226 138 L262 104 L320 160 L380 168 Z" fill="#c9cfee" />
		<path d="M112 66 L100 82 L108 80 L114 88 L122 79 L127 84 Z M176 88 L168 98 L176 97 L182 103 L186 98 Z" fill="#ffffff" />
	{/if}
	<!-- slickrock bowl -->
	<path d="M-30 220 C10 180 90 168 180 170 C270 172 340 186 390 220 Z" fill="#f2b98a" />
	<path d="M10 220 C60 196 120 190 180 191 C250 192 300 202 340 220 Z" fill="#eaa274" />
	<!-- the arch: pinched left leg, thick lintel, heavier right leg -->
	<path
		d="M150 188 C147 172 142 150 136 128 C129 104 128 80 140 60 C152 42 176 34 200 36 C224 38 240 54 244 80 C248 106 244 140 246 168 C247 177 249 183 252 188 L222 188 C221 170 224 140 223 114 C222 90 210 70 190 68 C170 66 158 82 154 104 C151 126 158 156 164 188 Z"
		fill="#e0784e"
	/>
	<path d="M138 118 C132 96 134 72 150 54 C142 72 140 96 144 120 Z" fill="#f2a072" opacity=".8" />
	<path d="M156 46 C176 38 204 38 222 46 C204 42 178 42 156 50 Z" fill="#f2a072" opacity=".7" />
	<path d="M234 70 C242 92 242 130 240 160 C236 134 236 100 228 80 Z" fill="#c45e38" opacity=".55" />
	<!-- the arch's foot ledges -->
	<ellipse cx="157" cy="189" rx="14" ry="4" fill="#d36d45" />
	<ellipse cx="238" cy="189" rx="20" ry="5" fill="#d36d45" />
</g>
