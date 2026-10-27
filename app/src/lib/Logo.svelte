<script lang="ts">
	// The Overwater.ing? mark: a droplet who's asking the question, with a sprinkler-spray "?".
	// Same drawing as static/favicon.svg.
	let { size = 44, wordmark = true }: { size?: number; wordmark?: boolean } = $props();
</script>

<span class="logo">
	<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
		<defs>
			<linearGradient id="ow-drop" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#5fd0f5" />
				<stop offset="1" stop-color="#1f86d6" />
			</linearGradient>
		</defs>
		<!-- the "?" as a spray arc + droplet dot -->
		<path d="M40 14 C44 4 60 4 60 15 C60 22 52 23 51 30" fill="none" stroke="#ffc93c" stroke-width="5.5" stroke-linecap="round" />
		<circle cx="50.5" cy="38" r="3.4" fill="#ffc93c" />
		<!-- droplet -->
		<path d="M26 8 C26 8 6 32 6 44 a20 20 0 0 0 40 0 C46 32 26 8 26 8 Z" fill="url(#ow-drop)" />
		<ellipse cx="17" cy="38" rx="3.5" ry="6" fill="#fff" opacity=".45" />
		<circle cx="20" cy="44" r="4.6" fill="#fff" />
		<circle cx="32" cy="44" r="4.6" fill="#fff" />
		<circle cx="21" cy="45" r="2.3" fill="#12324a" />
		<circle cx="33" cy="45" r="2.3" fill="#12324a" />
		<circle cx="15" cy="52" r="2.4" fill="#ff8fa3" opacity=".7" />
		<circle cx="37" cy="52" r="2.4" fill="#ff8fa3" opacity=".7" />
		<path d="M22 53 Q26 57 30 53" stroke="#12324a" stroke-width="2.2" fill="none" stroke-linecap="round" />
	</svg>
	{#if wordmark}<span class="word">Overwater<span class="ing">.ing</span><span class="q">?</span></span>{/if}
</span>

<style>
	.logo { display: inline-flex; align-items: center; gap: 8px; }
	.logo svg { flex: none; transition: transform 0.3s cubic-bezier(0.3, 1.6, 0.5, 1); }
	:global(a:hover) .logo svg { transform: rotate(-8deg) translateY(-2px); }
	.word { font-family: var(--display); font-weight: 700; font-size: 1.5rem; letter-spacing: -0.01em; color: var(--ink); white-space: nowrap; }
	.ing { color: var(--water); }
	.q { color: #f0a92a; display: inline-block; transform: rotate(10deg); }
	@media (prefers-reduced-motion: reduce) { .logo svg { transition: none; } }
</style>
