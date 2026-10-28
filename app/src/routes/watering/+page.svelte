<script lang="ts">
	// Watering plan: pick your sprinklers and controller, get a monthly schedule for local
	// weather and the fixes ranked by gallons saved (see #lib/watering.ts).
	import type { PageProps } from './$types';
	import { etoByKey } from '#lib/data.ts';
	import etoUtah from '#lib/eto_utah.json';
	import { CONTROLS, SYSTEMS, schedule, tips, monthlyNeedIn, type ControlId, type SystemId } from '#lib/watering.ts';
	import { depthToGallons, fmt } from '#lib/water.ts';
	import SystemIcon from '#lib/art/SystemIcon.svelte';
	import Sprinkler from '#lib/art/Sprinkler.svelte';
	import CountUp from '#lib/CountUp.svelte';
	import { planKey, type Week } from '#lib/calendar.ts';
	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let lawn = $state(data.lawn);
	// svelte-ignore state_referenced_locally
	let etoKey = $state(data.etoKey);
	let system = $state<SystemId>('spray');
	let control = $state<ControlId>('timer');

	let eto = $derived(etoByKey(etoKey));
	let billTotal = $derived(data.outdoor ? Object.values(data.outdoor).reduce((a, b) => a + b, 0) : null);
	let plan = $derived(tips(lawn || 0, eto, system, control, billTotal));
	let rows = $derived(schedule(eto, system));
	let top = $derived(plan.tips[0]);
	let places = $derived([
		...(etoKey === 'slc' || etoKey === 'sandy' ? [{ key: etoKey, label: etoKey === 'slc' ? 'Salt Lake City' : 'Sandy' }] : []),
		...etoUtah.points.map((p) => ({ key: p.county, label: `${p.place} (${p.county} County)` }))
	]);

	// Bill vs. a well-run system, April-October.
	let chart = $derived.by(() => {
		if (!data.outdoor) return null;
		const s = SYSTEMS[system];
		const need = monthlyNeedIn(eto).map((m) => ({ month: m.month, use: data.outdoor![m.month] ?? 0, target: depthToGallons(m.inches / s.du, lawn || 0) }));
		const max = Math.max(1, ...need.map((n) => Math.max(n.use, n.target)));
		const step = niceStep(max / 4);
		return { need, top: Math.ceil(max / step) * step, step };
	});
	function niceStep(x: number) {
		const p = 10 ** Math.floor(Math.log10(x));
		return [1, 2, 2.5, 5, 10].map((m) => m * p).find((v) => v >= x)!;
	}
	// The subscribable calendar and this week's state guide for the chosen weather and sprinklers.
	let key = $derived(planKey(etoKey, system));
	let calUrl = $derived(`${location.origin}/api/calendar/${key}.ics`);
	let thisWeek = $state<(Week & { guideWeek?: string }) | null>(null);
	$effect(() => {
		const k = key;
		thisWeek = null;
		fetch(`/api/schedule/${k}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => {
				if (j && k === key) thisWeek = { ...j.this_week, guideWeek: j.guide?.week };
			})
			.catch(() => {});
	});
	let copied = $state(false);
	function copy() {
		navigator.clipboard?.writeText(calUrl).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 1600);
		});
	}

	const MON = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const W = 640, H = 240, L = 48, B = 26, T = 12;
	const kfmt = (g: number) => (g >= 1000 ? `${Math.round(g / 100) / 10}k` : String(Math.round(g)));
</script>

<svelte:head><title>Watering plan · Overwater.ing?</title></svelte:head>

{#if data.back}<a class="back" href={data.back}>← back to the lot</a>{/if}
<p class="kicker">Watering plan</p>
<h1>Dial in your sprinklers</h1>
<p class="lede">Tell us what you water with. We'll build a month-by-month schedule for {eto.place}'s weather and rank the fixes by how much water they save.</p>

<section class="card setup">
	<div class="row">
		<label>Lawn size <span class="unit-in"><input type="number" min="0" step="10" bind:value={lawn} /> sq ft</span></label>
		<label>Weather from <select bind:value={etoKey}>{#each places as p}<option value={p.key}>{p.label}</option>{/each}</select></label>
	</div>

	<h2>How does your lawn get watered?</h2>
	<div class="choices four" role="radiogroup" aria-label="Sprinkler type">
		{#each Object.entries(SYSTEMS) as [id, s]}
			<button type="button" role="radio" aria-checked={system === id} class:on={system === id} onclick={() => (system = id as SystemId)}>
				<span class="ic"><SystemIcon kind={id as SystemId} /></span>
				<b>{s.label}</b>
				<span class="muted small">{s.blurb}</span>
			</button>
		{/each}
	</div>
	<p class="muted small">Not sure? Run a zone and watch. A fixed fan of mist is spray heads; one stream sweeping slowly is a rotor; lots of thin streams turning is rotary nozzles.</p>

	<h2>What runs it?</h2>
	<div class="choices three" role="radiogroup" aria-label="Controller">
		{#each Object.entries(CONTROLS) as [id, c]}
			<button type="button" role="radio" aria-checked={control === id} class:on={control === id} onclick={() => (control = id as ControlId)}>
				<span class="ic"><SystemIcon kind={id as ControlId} /></span>
				<b>{c.label}</b>
				<span class="muted small">{c.blurb}</span>
			</button>
		{/each}
	</div>
</section>

<section class="card takeaway" aria-live="polite">
	<svg class="mascot" viewBox="0 0 280 170" aria-hidden="true"><Sprinkler x={10} y={6} /></svg>
	<div>
		<p class="kicker">Your one thing</p>
		<h2>{top.title}</h2>
		{#if top.gallons}
			<div class="big save">save ~<CountUp value={top.gallons} /> gal/yr</div>
		{/if}
		<p class="muted">{top.how}</p>
		{#if top.link}<p><a href={top.link.href} target="_blank" rel="noopener">{top.link.label} →</a></p>{/if}
		{#if billTotal != null}
			<p class="small muted">Your bill shows {fmt(billTotal)} gal of outdoor water last year. A well-run system of {SYSTEMS[system].short} would use about {fmt(plan.target)} gal on this lawn.</p>
		{/if}
	</div>
</section>

{#if chart}
	<section class="card">
		<h2>Your bill vs. a well-run system</h2>
		<p class="legend"><span><i class="sw use"></i>Your outdoor use</span><span><i class="sw tgt"></i>Well-run {SYSTEMS[system].short}</span></p>
		<svg class="chart" viewBox="0 0 {W} {H}" role="img" aria-label="Monthly outdoor water use from your bill compared with what a well-run system would use, April to October">
			{#each Array.from({ length: Math.round(chart.top / chart.step) + 1 }, (_, i) => i * chart.step) as g}
				{@const y = H - B - ((H - B - T) * g) / chart.top}
				<line x1={L} x2={W - 8} y1={y} y2={y} class="grid" />
				<text x={L - 8} y={y + 4} text-anchor="end" class="tick">{kfmt(g)}</text>
			{/each}
			{#each chart.need as n, i}
				{@const bw = (W - L - 8) / chart.need.length}
				{@const x = L + i * bw}
				{@const yUse = H - B - ((H - B - T) * n.use) / chart.top}
				{@const yT = H - B - ((H - B - T) * n.target) / chart.top}
				<g class="month">
					<title>{MON[n.month]}: you used {fmt(n.use)} gal outdoors; a well-run system would use {fmt(n.target)} gal</title>
					<rect x={x} y={T} width={bw} height={H - B - T} class="hit" />
					{#if n.use > 0}<path d="M{x + bw * 0.22} {H - B} V{yUse + 4} q0 -4 4 -4 H{x + bw * 0.78 - 4} q4 0 4 4 V{H - B} Z" class="bar" />{/if}
					<line x1={x + bw * 0.14} x2={x + bw * 0.86} y1={yT} y2={yT} class="target" />
					<text x={x + bw / 2} y={H - 8} text-anchor="middle" class="tick">{MON[n.month]}</text>
				</g>
			{/each}
			<line x1={L} x2={W - 8} y1={H - B} y2={H - B} class="axis" />
		</svg>
		<p class="muted small">Gallons per month. Bars above the green line are water the lawn didn't need.</p>
	</section>
{/if}

<section class="card">
	<h2>Your schedule</h2>
	<p class="muted small">For {SYSTEMS[system].short} in {eto.place}'s weather, deep and infrequent: about ¾ inch per watering. Split long runs into short cycles an hour apart so water soaks in instead of running off.</p>
	<div class="table">
		<table>
			<thead><tr><th>Month</th><th class="n">Days a week</th><th class="n">Each watering, per zone</th><th class="n">Lawn needs</th></tr></thead>
			<tbody>
				{#each rows as r}
					<tr>
						<td>{r.name}</td>
						<td class="n">{r.days}</td>
						<td class="n">{r.cycles > 1 ? `${r.cycles} × ${Math.round(r.minutesPerCycle)} min` : `${Math.round(r.minutesPerDay)} min`}</td>
						<td class="n">{r.weeklyIn.toFixed(2)} in/week</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="muted small">Then check Utah's <a href="https://conservewater.utah.gov/weekly-lawn-watering-guide/" target="_blank" rel="noopener">Weekly Lawn Watering Guide</a> each Friday and skip a day after a good rain. Shady zones need less; adjust if you see dry spots.</p>
</section>

<section class="card cal" id="calendar">
	<div class="cal-top">
		<svg class="cal-ic" viewBox="0 0 64 64" aria-hidden="true">
			<rect x="6" y="10" width="52" height="46" rx="10" fill="#fff" stroke="#1f86d6" stroke-width="4" />
			<path d="M6 22 H58 V20 a10 10 0 0 0 -10 -10 H16 a10 10 0 0 0 -10 10 Z" fill="#1f86d6" />
			<rect x="17" y="4" width="6" height="12" rx="3" fill="#12324a" /><rect x="41" y="4" width="6" height="12" rx="3" fill="#12324a" />
			<path d="M32 30 C27 37 25 40 25 43 a7 7 0 0 0 14 0 C39 40 37 37 32 30 Z" fill="#4cc3f0" />
		</svg>
		<div>
			<p class="kicker">Put it on autopilot</p>
			<h2>Get this schedule as a calendar</h2>
			<p class="muted small">Subscribe once. Each watering day shows up at 5 a.m. with run times for {SYSTEMS[system].short} in {eto.place}'s weather, and it follows Utah's Weekly Lawn Watering Guide: when the state says skip, the week clears itself. No sign-up, and the link has no address in it.</p>
		</div>
	</div>
	{#if thisWeek}
		<p class="week" class:paused={thisWeek.paused}>
			<b>This week{thisWeek.source === 'guide' && thisWeek.guideWeek ? ` (${thisWeek.guideWeek})` : ''}:</b>
			{#if thisWeek.paused}{thisWeek.note}{:else}{thisWeek.days.join(', ')} at 5 a.m., {thisWeek.cycles > 1 ? `${thisWeek.cycles} × ${thisWeek.minutesPerCycle}` : thisWeek.minutesPerDay} min per zone. <span class="muted">{thisWeek.note}</span>{/if}
		</p>
	{/if}
	<div class="cal-actions">
		<a class="btn" href={calUrl.replace(/^https?:/, 'webcal:')}>Subscribe (Apple, Outlook)</a>
		<a class="btn" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calUrl.replace(/^https?:/, 'webcal:'))}`} target="_blank" rel="noopener">Add to Google Calendar</a>
		<button type="button" class="btn ghost" onclick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
	</div>
	<p class="muted small">Smart controller or a Raspberry Pi? The same schedule is open JSON at <a href={`/api/schedule/${key}`}>/api/schedule/{key}</a>, and our <a href={`/connect?eto=${encodeURIComponent(etoKey)}`}>connectors for Rachio, Home Assistant and OpenSprinkler</a> set your controller from it every morning.</p>
</section>

<section>
	<h2 class="more">More ways to save</h2>
	<div class="tips">
		{#each plan.tips.slice(1) as t}
			<article class="card tip">
				{#if t.gallons}<span class="badge">~{fmt(t.gallons)} gal/yr</span>{/if}
				<h3>{t.title}</h3>
				<p class="muted small">{t.how}</p>
				{#if t.note}<p class="small note">{t.note}</p>{/if}
				{#if t.link}<p class="small"><a href={t.link.href} target="_blank" rel="noopener">{t.link.label} →</a></p>{/if}
			</article>
		{/each}
	</div>
</section>

<p class="muted small fine">
	How we estimate: the lawn needs {plan.needIn.toFixed(0)} inches a season here (reference ET × 0.8 for cool-season turf, minus half the rain, April–October). Sprinklers don't water evenly, so a real system puts down more than that; we use typical rates and evenness for each sprinkler type ({SYSTEMS[system].short}: {SYSTEMS[system].pr} in/hour, {Math.round(SYSTEMS[system].du * 100)}% evenness).
	{#if billTotal == null}Without a bill we compare against the common habit of setting the July schedule and leaving it all season.{/if}
	Measure your own heads with a few cans for a sharper schedule.
</p>

<style>
	.back { display: inline-block; margin: 4px 0 12px; text-decoration: none; font-family: var(--display); font-weight: 600; background: #fff; border: 2px solid var(--line); border-radius: 999px; padding: 4px 14px; box-shadow: 0 3px 0 #d6ecf9; }
	.lede { font-size: 1.1rem; color: var(--muted); max-width: 720px; }
	section { margin-top: 18px; }
	.setup h2 { font-size: 1.25rem; margin-top: 18px; }
	.row { display: flex; flex-wrap: wrap; gap: 14px 24px; }
	.row label { display: flex; flex-direction: column; gap: 4px; font-family: var(--display); font-weight: 600; }
	.row select, .row input { font: 400 1rem/1.4 var(--body); min-height: 48px; box-sizing: border-box; }
	.unit-in { display: flex; align-items: center; gap: 6px; font-family: var(--body); font-weight: 400; }
	.unit-in input { width: 110px; }
	.choices { display: grid; gap: 10px; }
	.choices.four { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
	.choices.three { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
	.choices button { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; background: #fff; border: 2px solid var(--line); border-radius: 18px; padding: 12px; color: var(--ink); box-shadow: 0 4px 0 #d6ecf9; }
	.choices button.on { border-color: var(--water); background: var(--aqua); box-shadow: 0 4px 0 #9fd3f2; }
	.ic { width: 56px; height: 56px; }
	.takeaway { display: grid; grid-template-columns: 170px 1fr; gap: 18px; align-items: center; border-color: #a9e1f8; background: linear-gradient(160deg, #fff 40%, #e3f5fe); }
	.mascot { width: 100%; }
	.takeaway h2 { font-size: 1.6rem; }
	.save { color: var(--lawn); }
	@media (max-width: 640px) { .takeaway { grid-template-columns: 1fr; } .mascot { max-width: 160px; } }
	.legend { display: flex; gap: 18px; flex-wrap: wrap; margin: 0 0 6px; font-size: 0.9rem; color: var(--muted); }
	.sw { display: inline-block; width: 14px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: 0; }
	.sw.use { background: #1f86d6; }
	.sw.tgt { background: #2c9a4b; height: 3px; vertical-align: 3px; }
	.chart { width: 100%; height: auto; display: block; }
	.chart .grid { stroke: #e6eef5; stroke-width: 1; }
	.chart .axis { stroke: #b9cddc; stroke-width: 1; }
	.chart .tick { font-size: 12px; fill: var(--muted); font-family: var(--body); }
	.chart .bar { fill: #1f86d6; }
	.chart .target { stroke: #2c9a4b; stroke-width: 3; stroke-linecap: round; }
	.chart .hit { fill: transparent; }
	.chart .month:hover .hit { fill: #eef6fc; }
	.table { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
	th { text-align: left; font-family: var(--display); font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 8px 10px; }
	td { padding: 10px; border-top: 2px solid #eaf4fb; white-space: nowrap; }
	.n { text-align: right; }
	.more { margin-top: 24px; }
	.tips { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
	.tip h3 { font-size: 1.15rem; }
	.badge { display: inline-block; font-family: var(--display); font-weight: 600; font-size: 0.85rem; color: #fff; background: var(--lawn); border-radius: 999px; padding: 2px 10px; margin-bottom: 6px; }
	.note { color: #6b4b00; }
	.fine { margin-top: 18px; }
	.cal { border-color: #a9e1f8; }
	.cal-top { display: grid; grid-template-columns: 64px 1fr; gap: 16px; align-items: start; }
	.cal-ic { width: 64px; height: 64px; }
	.week { background: var(--aqua); border-radius: 14px; padding: 10px 14px; margin: 12px 0; }
	.week.paused { background: #fff4d6; }
	.cal-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 4px; }
	.btn { display: inline-block; font-family: var(--display); font-weight: 600; text-decoration: none; color: #fff; background: var(--water); border: 2px solid var(--water); border-radius: 999px; padding: 8px 18px; box-shadow: 0 4px 0 #1665a3; }
	.btn.ghost { background: #fff; color: var(--water); box-shadow: 0 4px 0 #d6ecf9; }
</style>
