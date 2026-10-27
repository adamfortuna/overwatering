<script lang="ts">
	// Little pictures for the watering-plan choices. 80 x 80 viewBox.
	let { kind }: { kind: 'spray' | 'rotor' | 'rotary' | 'hose' | 'timer' | 'smart' | 'manual' } = $props();
	const grass = 'M6 66 Q10 58 12 66 Q16 56 18 66 Q22 58 26 66 Q30 55 32 66 Q36 58 40 66 Q44 56 46 66 Q50 58 54 66 Q58 55 60 66 Q64 58 68 66 Q72 57 74 66 V74 H6 Z';
</script>

<svg viewBox="0 0 80 80" aria-hidden="true">
	{#if kind === 'spray' || kind === 'rotor' || kind === 'rotary'}
		<path d={grass} fill="#8fd18a" />
		<rect x="34" y="48" width="12" height="20" rx="4" fill="#2f86d6" />
		<rect x="31" y="44" width="18" height="7" rx="3.5" fill="#ffc93c" />
		{#if kind === 'spray'}
			<g fill="#4cc3f0">{#each [-60, -40, -20, 0, 20, 40, 60] as a}<circle cx={40 + Math.sin((a * Math.PI) / 180) * 26} cy={44 - Math.cos((a * Math.PI) / 180) * 26} r="3" />{/each}</g>
			<g stroke="#7fd6f5" stroke-width="2" stroke-linecap="round">{#each [-60, -30, 0, 30, 60] as a}<line x1="40" y1="42" x2={40 + Math.sin((a * Math.PI) / 180) * 20} y2={42 - Math.cos((a * Math.PI) / 180) * 20} />{/each}</g>
		{:else if kind === 'rotor'}
			<path d="M44 42 Q60 6 78 30" fill="none" stroke="#4cc3f0" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 7" />
			<path d="M50 30 a12 12 0 0 1 10 -4" fill="none" stroke="#12324a" stroke-width="2" stroke-linecap="round" />
			<path d="M60 26 l-4 -2 m4 2 l-2 4" stroke="#12324a" stroke-width="2" stroke-linecap="round" />
		{:else}
			<g fill="none" stroke="#4cc3f0" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 5">
				<path d="M40 42 Q24 18 6 26" /><path d="M40 42 Q30 10 16 10" /><path d="M40 42 Q40 6 40 6" /><path d="M40 42 Q50 10 64 10" /><path d="M40 42 Q56 18 74 26" />
			</g>
		{/if}
	{:else if kind === 'hose'}
		<path d={grass} fill="#8fd18a" />
		<path d="M4 72 Q20 60 28 66" fill="none" stroke="#3fae5a" stroke-width="4" stroke-linecap="round" />
		<rect x="26" y="58" width="34" height="8" rx="4" fill="#ffc93c" />
		<rect x="30" y="52" width="26" height="6" rx="3" fill="#2f86d6" />
		<g fill="none" stroke="#4cc3f0" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 5"><path d="M34 52 Q30 24 14 18" /><path d="M43 52 Q43 20 43 12" /><path d="M52 52 Q56 24 72 18" /></g>
	{:else if kind === 'timer'}
		<rect x="12" y="14" width="56" height="52" rx="10" fill="#e4eef6" stroke="#a9c3d8" stroke-width="3" />
		<circle cx="40" cy="40" r="16" fill="#fff" stroke="#2f86d6" stroke-width="4" />
		<path d="M40 40 V30 M40 40 L48 44" stroke="#12324a" stroke-width="3" stroke-linecap="round" />
		<circle cx="22" cy="58" r="3" fill="#ff6f61" />
	{:else if kind === 'smart'}
		<rect x="12" y="14" width="56" height="52" rx="10" fill="#2f86d6" />
		<rect x="18" y="20" width="44" height="26" rx="5" fill="#dff3fd" />
		<path d="M30 34 a14 14 0 0 1 20 0 M34 38 a8 8 0 0 1 12 0" fill="none" stroke="#1f86d6" stroke-width="3" stroke-linecap="round" />
		<circle cx="40" cy="41" r="2" fill="#1f86d6" />
		<circle cx="26" cy="56" r="3" fill="#ffc93c" /><circle cx="40" cy="56" r="3" fill="#8fd18a" /><circle cx="54" cy="56" r="3" fill="#fff" />
	{:else}
		<path d="M6 70 Q24 54 40 58" fill="none" stroke="#3fae5a" stroke-width="5" stroke-linecap="round" />
		<rect x="38" y="50" width="16" height="12" rx="4" fill="#ffc93c" transform="rotate(-20 46 56)" />
		<g fill="#4cc3f0"><circle cx="62" cy="42" r="3" /><circle cx="68" cy="50" r="3" /><circle cx="70" cy="36" r="3" /><circle cx="74" cy="44" r="2.5" /></g>
		<path d="M44 40 q6 -14 16 -10" fill="none" stroke="#f2b98a" stroke-width="7" stroke-linecap="round" />
	{/if}
</svg>

<style>
	svg { width: 100%; height: 100%; display: block; }
</style>
