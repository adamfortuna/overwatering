<script lang="ts">
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { fmt } from './water.ts';
	// Numbers roll up to their value (and roll again when an edit changes it).
	let { value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string } = $props();
	const t = new Tween(0, { duration: 900, easing: cubicOut });
	$effect(() => {
		t.set(value, { duration: prefersReducedMotion.current ? 0 : 900 });
	});
</script>

<span class="count">{prefix}{fmt(t.current)}{suffix}</span>

<style>
	.count { font-variant-numeric: tabular-nums; }
</style>
