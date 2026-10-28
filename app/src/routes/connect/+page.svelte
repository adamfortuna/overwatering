<script lang="ts">
	// Hook a sprinkler controller to the weekly schedule: the OpenSprinkler connector and the open API.
	import Sprinkler from '#lib/art/Sprinkler.svelte';
</script>

<svelte:head><title>Connect your sprinkler controller · Overwater.ing?</title></svelte:head>

<p class="kicker">For your controller</p>
<h1>Let the state's guide run your sprinklers</h1>
<p class="lede">Every Friday in watering season, Utah's Division of Water Resources says how many times to water this week, county by county. Overwater.ing turns that into run times for your sprinkler type and hands them to your controller, so the schedule changes itself when the weather does.</p>

<section class="card flow" aria-label="How it works">
	<ol>
		<li><b>Your lot</b><span class="muted small">2024 aerial imagery and tree heights measure the lawn</span></li>
		<li><b>Your weather</b><span class="muted small">Reference ET for your county, month by month</span></li>
		<li><b>This week</b><span class="muted small">Utah's Weekly Lawn Watering Guide, read every few hours</span></li>
		<li><b>Your controller</b><span class="muted small">One program, rewritten each morning</span></li>
	</ol>
	<svg class="mascot" viewBox="0 0 280 170" aria-hidden="true"><Sprinkler x={10} y={6} /></svg>
</section>

<section class="card">
	<h2>OpenSprinkler</h2>
	<p>OpenSprinkler is open-source controller hardware and firmware with a local HTTP API. Our connector is one file with no dependencies. Run it each morning on anything on your network with Node 18 or newer, like a Raspberry Pi or a Mac.</p>
	<pre><code>curl -O https://overwater.ing/connect/opensprinkler.mjs
node opensprinkler.mjs --plan salt-lake-spray --controller http://192.168.1.50 --zones 1,2,3</code></pre>
	<p class="muted small">Pick your plan on the <a href="/watering">watering plan</a> page: it's your county plus your sprinkler type (spray, rotor, rotary or hose). Add <code>--dry-run</code> to see what it would change. It writes a single program named "Overwater.ing …" and never touches your other programs or drip zones. When the state says skip the week, it switches that program off. When watering resumes, it switches it back on with the new run times.</p>
	<p class="muted small">Daily at 4 a.m. with cron: <code>0 4 * * * node /home/pi/opensprinkler.mjs --plan salt-lake-spray --zones 1,2,3</code></p>
	<p class="muted small">No controller yet? OpenSprinkler's firmware runs in demo mode on a laptop, so you can try the whole loop without any hardware (<code>scripts/opensprinkler-demo.sh</code> in our repo does it with Docker).</p>
</section>

<section class="card">
	<h2>Any other controller: the open API</h2>
	<p>The same schedule is plain JSON, with no key or sign-up, and there's no address in the URL:</p>
	<pre><code>GET https://overwater.ing/api/schedule/salt-lake-spray
GET https://overwater.ing/api/schedule/salt-lake-spray?date=2027-07-14   # preview a week</code></pre>
	<p class="muted small"><code>this_week</code> gives the watering days, minutes per zone, cycles, and a <code>waterLevelPct</code> for controllers that take a seasonal adjustment (Rachio, Hydrawise and most others). Rachio and Hunter Hydrawise connectors are next; both have public APIs.</p>
	<p class="muted small">Prefer a reminder? <a href="/watering#calendar">Subscribe to the calendar</a> instead.</p>
</section>

<style>
	.lede { font-size: 1.1rem; color: var(--muted); max-width: 760px; }
	section { margin-top: 18px; }
	.flow { display: grid; grid-template-columns: 1fr 180px; gap: 18px; align-items: center; }
	.flow ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; counter-reset: s; }
	.flow li { display: flex; flex-direction: column; gap: 2px; background: var(--aqua); border-radius: 16px; padding: 12px; position: relative; counter-increment: s; }
	.flow li b { font-family: var(--display); }
	.flow li b::before { content: counter(s) ' · '; color: var(--water); }
	.mascot { width: 100%; }
	@media (max-width: 760px) { .flow { grid-template-columns: 1fr; } .flow ol { grid-template-columns: 1fr 1fr; } .mascot { max-width: 160px; } }
	pre { background: #12324a; color: #dff3fd; border-radius: 14px; padding: 12px 14px; overflow-x: auto; font-size: 0.85rem; }
	code { font-size: 0.9em; }
</style>
