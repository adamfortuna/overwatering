<script lang="ts">
	// Hook a sprinkler controller to the weekly schedule: pick a plan, then OpenSprinkler, Rachio,
	// or Home Assistant (any controller it supports). All three read /api/schedule/<plan>.
	import { page } from '$app/state';
	import Sprinkler from '#lib/art/Sprinkler.svelte';
	import etoUtah from '#lib/eto_utah.json';
	import { planKey, type Week } from '#lib/calendar.ts';
	import { SYSTEMS, type SystemId } from '#lib/watering.ts';

	type Ctl = 'opensprinkler' | 'rachio' | 'homeassistant';
	const CONTROLLERS: { id: Ctl; label: string; blurb: string }[] = [
		{ id: 'rachio', label: 'Rachio', blurb: 'Scales your Rachio schedules each week through its cloud API.' },
		{ id: 'homeassistant', label: 'Home Assistant', blurb: 'Runs zones on Rain Bird, Hydrawise, B-hyve, Rachio, OpenSprinkler and more.' },
		{ id: 'opensprinkler', label: 'OpenSprinkler', blurb: 'Writes a program straight to the controller on your network.' }
	];

	let county = $state(page.url.searchParams.get('eto') ?? 'Salt Lake');
	let system = $state<SystemId>('spray');
	let ctl = $state<Ctl>((page.url.searchParams.get('c') as Ctl) ?? 'rachio');
	let key = $derived(planKey(county, system));
	let origin = $derived(page.url.origin);

	let w = $state<Week | null>(null);
	$effect(() => {
		const k = key;
		fetch(`/api/schedule/${k}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => {
				if (j && k === key) w = j.this_week;
			})
			.catch(() => {});
	});
</script>

<svelte:head><title>Connect your sprinkler controller · Overwater.ing?</title></svelte:head>

<p class="kicker">For your controller</p>
<h1>Let the state's guide run your sprinklers</h1>
<p class="lede">Every Friday in watering season, Utah's Division of Water Resources says how many times to water this week, county by county. Overwater.ing turns that into run times for your sprinkler type and hands them to your controller, so the schedule changes itself when the weather does.</p>

<section class="card flow" aria-label="How it works">
	<ol>
		<li><b>Your weather</b><span class="muted small">Reference ET for your county, month by month</span></li>
		<li><b>Your sprinklers</b><span class="muted small">Run times for how fast and evenly your heads water</span></li>
		<li><b>This week</b><span class="muted small">Utah's Weekly Lawn Watering Guide, every Friday</span></li>
		<li><b>Your controller</b><span class="muted small">Updated every morning</span></li>
	</ol>
	<svg class="mascot" viewBox="0 0 280 170" aria-hidden="true"><Sprinkler x={10} y={6} /></svg>
</section>

<section class="card">
	<h2>1 · Your plan</h2>
	<div class="row">
		<label>County <select bind:value={county}>{#each etoUtah.points as p}<option value={p.county}>{p.county}</option>{/each}</select></label>
		<label>Sprinklers <select bind:value={system}>{#each Object.entries(SYSTEMS) as [id, s]}<option value={id}>{s.label}</option>{/each}</select></label>
		<div class="lbl">Plan name <code class="key">{key}</code></div>
	</div>
	{#if w}
		<p class="week" class:paused={w.paused}><b>This week:</b> {#if w.paused}{w.note}{:else}{w.days.join(', ')}, {w.cycles > 1 ? `${w.cycles} × ${w.minutesPerCycle}` : w.minutesPerDay} min per zone ({w.peakPct}% of July's water). <span class="muted">{w.note}</span>{/if}</p>
	{/if}
</section>

<section class="card">
	<h2>2 · Your controller</h2>
	<div class="choices" role="radiogroup" aria-label="Controller">
		{#each CONTROLLERS as c}
			<button type="button" role="radio" aria-checked={ctl === c.id} class:on={ctl === c.id} onclick={() => (ctl = c.id)}>
				<b>{c.label}</b>
				<span class="muted small">{c.blurb}</span>
			</button>
		{/each}
	</div>

	{#if ctl === 'rachio'}
		<p>Rachio's API can't rewrite your schedules, but it can scale them. Set your Rachio <b>fixed</b> schedule for midsummer once. The connector then sets each schedule's seasonal adjustment to this week's water compared with July: maybe −60% in April, 0% in July. When the state says skip the week, it sets a rain delay through the end of that week. Flex schedules are left alone, since Rachio already adjusts those from its own weather data.</p>
		<ol class="steps">
			<li>In the Rachio app: <b>Account → API access</b>, and copy your API key.</li>
			<li>On any computer with Node 18 or newer (it talks to Rachio's cloud, so it doesn't need to be at home):
				<pre><code>curl -O {origin}/connect/rachio.mjs
node rachio.mjs --plan {key} --token YOUR_RACHIO_KEY --dry-run</code></pre>
			</li>
			<li>Drop <code>--dry-run</code> once it looks right, and run it every morning, for example with cron: <code>0 4 * * * node rachio.mjs --plan {key} --token …</code>. Use <code>--schedules "Lawn,Park strip"</code> to pick schedules, and <code>--device</code> if you have more than one controller.</li>
		</ol>
	{:else if ctl === 'homeassistant'}
		<p>Home Assistant already talks to most sprinkler controllers: Rain Bird, Hunter Hydrawise, Orbit B-hyve, Rachio, OpenSprinkler, and ESPHome relays. You add a sensor that reads this week's schedule, then an automation blueprint runs your lawn zones on the right days. Long runs are split into cycles with a soak in between, and the week is skipped when the state says not to water.</p>
		<ol class="steps">
			<li>Save <a href="/connect/homeassistant/overwatering.yaml" download>overwatering.yaml</a> as <code>config/packages/overwatering.yaml</code> and change the plan in its URL to <code>{key}</code>. Make sure <code>configuration.yaml</code> loads packages (<code>homeassistant: packages: !include_dir_named packages</code>), then restart. You'll get <code>sensor.overwatering_this_week</code>.</li>
			<li>Import the blueprint: <b>Settings → Automations → Blueprints → Import</b>, and paste <code>{origin}/connect/homeassistant/overwatering_run.yaml</code>.</li>
			<li>Create an automation from it: pick the sensor, your lawn zones (switches or valves, in order), a start time, and a soak time. Then turn off your controller's own lawn schedule so zones don't run twice.</li>
		</ol>
	{:else}
		<p>OpenSprinkler is open-source controller hardware and firmware with a local HTTP API. The connector writes one program named "Overwater.ing …" with this week's days and run times, as cycles an hour apart. When the state says skip the week, it switches that program off. It never touches your other programs or drip zones. Run it on anything on your home network with Node 18 or newer, like a Raspberry Pi or a Mac.</p>
		<pre><code>curl -O {origin}/connect/opensprinkler.mjs
node opensprinkler.mjs --plan {key} --controller http://192.168.1.50 --zones 1,2,3 --dry-run</code></pre>
		<p class="muted small">Daily at 4 a.m. with cron: <code>0 4 * * * node /home/pi/opensprinkler.mjs --plan {key} --zones 1,2,3</code>. No controller yet? OpenSprinkler's firmware runs in demo mode on a laptop, so you can try the whole loop without any hardware (<code>scripts/opensprinkler-demo.sh</code> in our repo).</p>
	{/if}
</section>

<section class="card">
	<h2>Anything else: the open API</h2>
	<p>The same schedule is plain JSON, with no key or sign-up, and there's no address in the URL:</p>
	<pre><code>GET {origin}/api/schedule/{key}
GET {origin}/api/schedule/{key}?date=2027-07-14   # preview a week</code></pre>
	<p class="muted small"><code>this_week</code> has the watering days, minutes per zone and cycles. It also has <code>peakPct</code>, this week's water as a share of July's, for controllers that take a seasonal adjustment. Prefer a reminder? <a href="/watering#calendar">Subscribe to the calendar</a> instead.</p>
</section>

<style>
	.lede { font-size: 1.1rem; color: var(--muted); max-width: 760px; }
	section { margin-top: 18px; }
	.flow { display: grid; grid-template-columns: 1fr 180px; gap: 18px; align-items: center; }
	.flow ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; counter-reset: s; }
	.flow li { display: flex; flex-direction: column; gap: 2px; background: var(--aqua); border-radius: 16px; padding: 12px; counter-increment: s; }
	.flow li b { font-family: var(--display); }
	.flow li b::before { content: counter(s) ' · '; color: var(--water); }
	.mascot { width: 100%; }
	@media (max-width: 760px) { .flow { grid-template-columns: 1fr; } .flow ol { grid-template-columns: 1fr 1fr; } .mascot { max-width: 160px; } }
	.row { display: flex; flex-wrap: wrap; gap: 14px 24px; align-items: flex-end; }
	.row label, .row .lbl { display: flex; flex-direction: column; gap: 4px; font-family: var(--display); font-weight: 600; }
	/* Controls use the body font (labels are display bold), and the plan name matches their height. */
	.row select { font: 400 1rem/1.4 var(--body); min-height: 48px; }
	.key { display: flex; align-items: center; box-sizing: border-box; min-height: 48px; font-size: 0.95rem; font-weight: 400; background: var(--aqua); border: 2px solid transparent; border-radius: 14px; padding: 0 14px; }
	.week { background: var(--aqua); border-radius: 14px; padding: 10px 14px; margin: 14px 0 0; }
	.week.paused { background: #fff4d6; }
	.choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 14px; }
	.choices button { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; background: #fff; border: 2px solid var(--line); border-radius: 18px; padding: 12px; color: var(--ink); box-shadow: 0 4px 0 #d6ecf9; }
	.choices button b { font-family: var(--display); font-size: 1.1rem; }
	.choices button.on { border-color: var(--water); background: var(--aqua); box-shadow: 0 4px 0 #9fd3f2; }
	.steps li { margin: 8px 0; }
	pre { background: #12324a; color: #dff3fd; border-radius: 14px; padding: 12px 14px; overflow-x: auto; font-size: 0.85rem; }
	code { font-size: 0.9em; }
</style>
