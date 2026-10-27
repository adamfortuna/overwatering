<script lang="ts">
	// What "go native" means in practice: approval, design, removal, planting, watering.
	import type { PageProps } from './$types';
	import House from '#lib/art/House.svelte';
	import Grass from '#lib/art/Grass.svelte';
	import { etoByKey } from '#lib/data.ts';
	import { annualTurfNeedGal, conversionSavingsGal, fmt } from '#lib/water.ts';
	import { rebateEstimate } from '#lib/rebates.ts';
	import photos from '#lib/plant_photos.json';
	const credit = (slug: string) => (photos as Record<string, { artist: string; license: string; source: string }>)[slug];
	let { data }: PageProps = $props();

	let lawn = $derived(data.lawn ?? 2000);
	let eto = $derived(etoByKey(data.etoKey));
	let before = $derived(annualTurfNeedGal(lawn, eto).gal);
	let saved = $derived(conversionSavingsGal(lawn, eto));
	let rebate = $derived(data.city || data.county ? rebateEstimate(lawn, data.city, data.county) : null);

	const EXPERTS = [
		{ name: 'YardFarmer', href: 'https://yardfarmer.co/', what: 'A Utah design studio for native, waterwise yards: soil, pollinators, rainwater, low maintenance. Book a design consult (they were booking into January 2027 when we checked).' },
		{ name: 'Silver Sage Xeriscape & Design', href: 'https://silversagexeriscape.com/', what: 'A Salt Lake City firm that designs, installs and maintains water-wise landscapes, with 20 years of Wasatch Front projects.' },
		{ name: 'Localscapes', href: 'https://localscapes.jvwcd.gov/', what: "Utah's free do-it-yourself approach from the water districts: ready-made designs, how-to videos and classes. Several rebate programs are built around it." }
	];
	// Photos: Wikimedia Commons, resized into /static/plants (credits in plant_photos.json).
	const PLANTS = [
		{ slug: 'blue-grama', name: 'Blue grama', kind: 'Grass', note: 'Native bunchgrass with eyelash seed heads (our Gramma). Soft enough to walk on.' },
		{ slug: 'firecracker-penstemon', name: 'Firecracker penstemon', kind: 'Flower', note: 'Bright red spikes in late spring; hummingbirds love them. Palmer penstemon is its pink cousin.' },
		{ slug: 'western-yarrow', name: 'Western yarrow', kind: 'Flower', note: 'Flat white flower clusters all summer over ferny leaves. Tough, and a pollinator magnet.' },
		{ slug: 'globemallow', name: 'Globemallow', kind: 'Flower', note: 'Orange cups on silvery leaves, happy in full sun and heat.' },
		{ slug: 'rubber-rabbitbrush', name: 'Rubber rabbitbrush', kind: 'Shrub', note: 'Gold flowers in fall when everything else is done.' },
		{ slug: 'apache-plume', name: 'Apache plume', kind: 'Shrub', note: 'White flowers, then feathery pink seed heads that glow in low sun.' },
		{ slug: 'utah-serviceberry', name: 'Utah serviceberry', kind: 'Small tree', note: 'White spring blossoms, summer berries for birds, good fall color.' }
	];
</script>

<svelte:head><title>Go native · Overwater.ing?</title></svelte:head>

{#if data.back}<a class="back" href={data.back}>← back to the lot</a>{/if}
<p class="kicker">Go native</p>
<h1>Trade thirsty grass for a yard that belongs here</h1>
<p class="lede">A native Utah yard is full of things that grow here on their own: flowering perennials, shrubs, small trees and soft bunchgrasses. Once it's established it takes about a third of the water of turf, and the state helps pay for the switch. Here's what it looks like in practice.</p>

<section class="compare">
	<figure class="card">
		<House mode="lawn" />
		<figcaption><b>Before:</b> {fmt(lawn)} sq ft of lawn needs about <b>{fmt(before)} gallons</b> a year, and spray heads usually put down more.</figcaption>
	</figure>
	<figure class="card">
		<House mode="native" />
		<figcaption><b>After:</b> swap all of it for natives on drip and the yard needs about <b>{fmt(before - saved)} gallons</b>, leaving <b class="save">{fmt(saved)} gallons</b> a year in the system{data.lawn ? '' : ' (for a typical 2,000 sq ft front-and-back lawn)'}.</figcaption>
	</figure>
</section>

<section class="card keep">
	<h2>Keep the grass you actually use</h2>
	<p>Going native doesn't mean losing the lawn. Keep the patch where the kids play or the dog runs, and swap out the grass that's more trouble than it's worth:</p>
	<ul>
		<li>the park strip and skinny side yards you can barely get a mower into</li>
		<li>slopes and odd corners that never stay green</li>
		<li>the sunniest spots, which drink the most water</li>
		<li>anywhere you only ever walk on to mow it</li>
	</ul>
	<p class="muted small">Partial projects still qualify for rebates as long as they meet the minimum size, and what's left is easy to water well. Some programs want the lawn you keep in strips at least 8 feet wide, so plan the edges with that in mind.</p>
</section>

<ol class="steps">
	<li class="card">
		<h2>Get approved before you touch the grass</h2>
		<p>Apply for your city's rebate first, then wait for the site visit and the go-ahead. Killing or removing lawn before approval disqualifies the project, and the lawn has to be alive when they look at it.</p>
		{#if rebate?.provider}
			<p class="callout">For this lot: <b>{rebate.provider.name}</b> pays ${rebate.provider.rate_high.toFixed(2)} per sq ft{rebate.eligible ? `, up to about $${fmt(rebate.high)} here` : ''}. <a href={rebate.provider.apply_url} target="_blank" rel="noopener">Start the application →</a></p>
		{:else if rebate}
			<p class="callout">{data.city || 'This area'} isn't on Utah Water Savers' eligible list yet, so there's no rebate here today. Going native still saves the water.</p>
		{:else}
			<p class="callout">Look your address up on the <a href="/">home page</a> to see your city's program and rate, or start at <a href="https://www.utahwatersavers.com/landscapeincentiveprogram" target="_blank" rel="noopener">Utah Water Savers</a>.</p>
		{/if}
	</li>

	<li class="card">
		<h2>Design it, yourself or with an expert</h2>
		<p>Group plants by how much water they need and leave room for paths and a place to sit. Check your program's design rules: Central Utah's, for example, wants plants covering at least half the area once grown, 3–4 inches of mulch, no artificial turf, and any lawn you keep in strips at least 8 feet wide.</p>
		<div class="experts">
			{#each EXPERTS as e}
				<a class="expert" href={e.href} target="_blank" rel="noopener">
					<b>{e.name} →</b>
					<span class="muted small">{e.what}</span>
				</a>
			{/each}
		</div>
		<p class="small muted">Going DIY? <a href="https://conservationgardenpark.jvwcd.gov/landscaping" target="_blank" rel="noopener">Conservation Garden Park</a> has ready-made plans and a list of certified water-efficient landscapers, and USU Extension keeps a <a href="https://extension.usu.edu/cwel/water-wise-plants.php" target="_blank" rel="noopener">water-wise plant list</a> for Utah.</p>
	</li>

	<li class="card">
		<h2>Take out the grass</h2>
		<p>Once you're approved: cut the sod out with a rented sod cutter (or have your installer do it), or smother it under cardboard and mulch. Ask your program which methods it accepts. Keep the topsoil; natives don't need fancy amendments.</p>
	</li>

	<li class="card">
		<h2>Plant natives</h2>
		<p>Spring and fall are the best times to plant. Start with small pots, give them room to grow, and mulch around them. A few Utah natives that thrive along the Wasatch Front:</p>
		<ul class="plants">
			{#each PLANTS as p}
				{@const c = credit(p.slug)}
				<li class="plant">
					<img src="/plants/{p.slug}.jpg" alt="{p.name} ({p.kind.toLowerCase()})" width="480" height="360" loading="lazy" />
					<div class="pbody">
						<b>{p.name}</b> <span class="tag">{p.kind}</span>
						<p class="muted small">{p.note}</p>
						<a class="credit" href={c.source} target="_blank" rel="noopener">Photo: {c.artist}, {c.license}</a>
					</div>
				</li>
			{/each}
		</ul>
	</li>

	<li class="card">
		<h2>Re-plumb the water, or turn it way down</h2>
		<p><b>Best:</b> convert the old spray zone to drip. Cap the spray heads, add a filter and pressure regulator at the valve, and run drip line or emitters to each plant. Central Utah's program, for one, requires drip on its own zone with a filter, a pressure regulator and emitters of 5 gallons an hour or less.</p>
		<p><b>Simplest:</b> if the sprinklers stay for now, cut their run time drastically. New plants need regular water their first summer while roots grow. After that, a deep soak every week or two in summer is plenty for most natives. Set the timer once with the <a href="/watering">watering plan</a>, then leave it.</p>
	</li>

	<li class="card">
		<h2>Finish, and get paid</h2>
		<p>The Central Utah and statewide programs give you a year to finish. Send your completion photos or schedule the final inspection, and the rebate comes after it passes.</p>
	</li>
</ol>

<section class="card closer">
	<svg viewBox="0 0 130 130" aria-hidden="true"><Grass x={6} y={-6} scale={1.05} /></svg>
	<div>
		<h2>Start with one spot</h2>
		<p class="muted">The park strip is a great first project: it's hard to water without hitting the sidewalk, and it usually clears the minimum size (often 200 sq ft). You'll learn what grows well in your yard before taking on the rest.</p>
	</div>
</section>

<style>
	.back { display: inline-block; margin: 4px 0 12px; text-decoration: none; font-family: var(--display); font-weight: 600; background: #fff; border: 2px solid var(--line); border-radius: 999px; padding: 4px 14px; box-shadow: 0 3px 0 #d6ecf9; }
	.lede { font-size: 1.1rem; color: var(--muted); max-width: 760px; }
	.compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 18px; }
	figure { margin: 0; padding: 12px; }
	figcaption { padding: 10px 6px 2px; }
	.save { color: var(--lawn); }
	.keep { margin-top: 16px; }
	.keep ul { margin: 6px 0; padding-left: 20px; }
	.keep li { margin: 3px 0; }
	.steps { list-style: none; counter-reset: s; padding: 0; display: grid; gap: 14px; margin: 26px 0; }
	.steps > li { counter-increment: s; position: relative; padding-left: 70px; }
	.steps > li::before { content: counter(s); position: absolute; left: 18px; top: 18px; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: var(--water); color: #fff; font-family: var(--display); font-weight: 700; font-size: 1.1rem; }
	.steps h2 { font-size: 1.35rem; }
	.steps p { margin: 6px 0; }
	.callout { background: var(--aqua); border: 2px solid #a9e1f8; border-radius: 14px; padding: 10px 12px; }
	.experts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 12px 0; }
	.expert { display: flex; flex-direction: column; gap: 4px; padding: 12px; border: 2px solid var(--line); border-radius: 16px; text-decoration: none; color: var(--ink); background: #fff; box-shadow: 0 3px 0 #d6ecf9; }
	.expert:hover { border-color: var(--water-2); }
	.expert b { color: var(--water); font-family: var(--display); font-weight: 600; }
	.plants { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; margin: 12px 0 4px; }
	.plant { background: #fff; border: 2px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: 0 4px 0 #d6ecf9; display: flex; flex-direction: column; }
	.plant img { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
	.pbody { padding: 10px 12px 12px; }
	.pbody p { margin: 4px 0 6px; }
	.credit { font-size: 0.72rem; color: var(--muted); }
	.plant .tag { white-space: nowrap; }
	@media (max-width: 560px) { .plants { grid-template-columns: 1fr 1fr; gap: 10px; } .pbody { padding: 8px 10px 10px; line-height: 1.3; } .pbody b { font-size: 0.95rem; } .pbody p { font-size: 0.82rem; } .credit { font-size: 0.66rem; } }
	.tag { font-size: 0.75rem; font-weight: 700; color: #fff; background: var(--lawn); border-radius: 999px; padding: 1px 8px; margin-left: 4px; }
	.closer { display: grid; grid-template-columns: 96px 1fr; gap: 16px; align-items: center; }
	.closer svg { width: 96px; height: 96px; background: var(--aqua); border-radius: 20px; }
	@media (max-width: 560px) { .steps > li { padding-left: 20px; padding-top: 62px; } .steps > li::before { top: 16px; left: 20px; } }
</style>
