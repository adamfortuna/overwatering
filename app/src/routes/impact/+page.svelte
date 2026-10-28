<script lang="ts">
	// Why this matters at Utah scale: measured neighborhoods, the state's outdoor water, the energy
	// behind it, and the data centers now competing for the same water.
	import { onMount } from 'svelte';
	import { loadIndex, etoFor, type IndexDataset, type Dataset } from '#lib/data.ts';
	import { acreFeet, annualTurfNeedGal, CO2_KG_PER_KWH, fmt, GAL_PER_ACRE_FT, kwhForGallons, KWH_PER_ACRE_FT } from '#lib/water.ts';
	import { tips } from '#lib/watering.ts';
	import Drop from '#lib/art/Drop.svelte';
	import Arch from '#lib/art/Arch.svelte';

	// Share of homes that overwater: BYU (Sowby, 2022), aerial imagery plus water bills.
	const OVERWATER_SHARE = 0.5;
	const UT_OUTDOOR_AF = 500_993; // residential outdoor, USU Extension citing DWR 2021
	const SCENARIO = 0.2; // statewide scenario: a fifth of residential outdoor water is waste (EPA: up to half)
	const STRATOS_AF = 987; // project's own net depletion estimate, SL Tribune Oct 20 2026

	let ds = $state<(IndexDataset & { meta: Dataset })[]>([]);
	onMount(async () => (ds = (await loadIndex(fetch)).datasets));

	let m = $derived.by(() => {
		let lots = 0, lawn = 0, need = 0, waste = 0;
		for (const d of ds) {
			const eto = etoFor(d.meta);
			lots += d.parcels;
			lawn += d.lawn_sqft;
			need += annualTurfNeedGal(d.lawn_sqft, eto).gal;
			waste += tips(d.lawn_sqft, eto, 'spray', 'timer', null).scheduleSave * OVERWATER_SHARE;
		}
		const kwh = kwhForGallons(waste);
		return { lots, acres: lawn / 43560, needAf: acreFeet(need), wasteAf: acreFeet(waste), kwh, co2t: (kwh * CO2_KG_PER_KWH) / 1000 };
	});
	const stateAf = UT_OUTDOOR_AF * SCENARIO;
	const stateGwh = (stateAf * KWH_PER_ACRE_FT) / 1e6;
	const stateCo2t = (stateAf * KWH_PER_ACRE_FT * CO2_KG_PER_KWH) / 1000;
</script>

<svelte:head><title>Why it matters · Overwater.ing?</title></svelte:head>

<p class="kicker">Why it matters</p>
<h1>Utah's biggest untapped reservoir is the front lawn</h1>
<p class="lede">Utah is growing, the Great Salt Lake is low, and data centers are lining up for water. Most of the water Utah cities use and don't get back goes on grass, and much of that grass gets more than it needs. Measuring it lot by lot is how you win it back.</p>

<section class="tiles">
	<div class="card tile"><div class="big">~60%</div><p>of Utah's city water goes outdoors, mostly on lawns.</p></div>
	<div class="card tile"><div class="big">96%</div><p>of what cities <i>use up</i> is outdoor watering. Indoor water mostly flows back.</p></div>
	<div class="card tile"><div class="big">{fmt(UT_OUTDOOR_AF)}</div><p>acre-feet a year go on Utah's residential yards.</p></div>
	<div class="card tile"><div class="big">4,190 ft</div><p>Great Salt Lake this August. The healthy range starts at 4,198.</p></div>
</section>

<section class="card measured">
	<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><Drop x={20} y={10} scale={1.1} /></svg>
	<div>
		<p class="kicker">What we've measured</p>
		<h2>{fmt(m.lots)} lots, {fmt(m.acres)} acres of lawn</h2>
		<p>In the Salt Lake City and Sandy neighborhoods we've mapped lot by lot, the grass needs about <b>{fmt(m.needAf)} acre-feet</b> a year. Suppose half of homes overwater, as BYU found from aerial photos and bills, and run July's schedule all season. That's about <b>{fmt(m.wasteAf)} acre-feet</b> of water the grass never needed.</p>
		<p class="muted">That much water takes about <b>{fmt(m.kwh / 1000)} MWh</b> to pump and treat, ≈ {fmt(m.co2t)} tonnes of CO₂ on Utah's grid. It's also about {Math.round((m.wasteAf / STRATOS_AF) * 100)}% of what the Box Elder County data center campus expects to consume, from a few neighborhoods alone.</p>
	</div>
</section>

<section class="card scale">
	<p class="kicker">At state scale</p>
	<h2>If a fifth of yard water is waste</h2>
	<p>The EPA says up to half of outdoor water is lost to overwatering. Take a fifth of Utah's residential outdoor water instead:</p>
	<div class="row">
		<div><div class="big">~{fmt(Math.round(stateAf / 1000) * 1000)}</div><p class="muted small">acre-feet a year</p></div>
		<div><div class="big">{fmt(stateGwh)} GWh</div><p class="muted small">of pumping and treatment</p></div>
		<div><div class="big">~{fmt(Math.round(stateCo2t / 1000) * 1000)} t</div><p class="muted small">CO₂ a year</p></div>
		<div><div class="big">~{Math.round(stateAf / STRATOS_AF)}×</div><p class="muted small">a large AI data center's water</p></div>
	</div>
	<p class="muted small">Water saved in yards <i>can</i> raise flows to the lake, if it isn't reused or claimed upstream. The lake needs 471,000 to 1,055,000 more acre-feet a year to reach a healthy level.</p>
</section>

<section class="card ai">
	<svg class="arch" viewBox="-20 20 420 210" aria-hidden="true"><Arch mountains={false} /></svg>
	<div>
		<p class="kicker">Water and AI infrastructure</p>
		<h2>Utah's AI buildout runs into the same water</h2>
		<p>Utah has 48 data centers running and more proposed. Since 2026, centers using 75 acre-feet a year or more have to report it (HB 76), and an executive order says new ones can't add to the Great Salt Lake's depletion (EO 2026-03). The big tech companies have pledged to be "water positive" and pay for projects that put water back.</p>
		<p><b>We're the measurement layer for that.</b> Overwater.ing measures turf on every lot from aerial imagery and LiDAR tree heights. It ranks the lots with the most to save, sets their controllers from the state's weekly guide, and checks the result against water bills. Money for turf conversions and smart controllers comes back as acre-feet you can count, lot by lot.</p>
	</div>
</section>

<details class="card sources">
	<summary><b>Sources and assumptions</b></summary>
	<ul class="small">
		<li>Outdoor share, residential outdoor volume (500,993 AF, DWR 2021): <a href="https://extension.usu.edu/climate/research/water-wise-policies-and-programs-utah">USU Extension</a>; <a href="https://water.utah.gov/wp-content/uploads/2025/09/MI-Water-Conservation-Opportunities-Report-09_02_2025.pdf">DWR, GSL Basin conservation report (2025)</a>.</li>
		<li>96% of municipal depletion is outdoor: <a href="https://www.usu.edu/ilwa/reports/2025/utahs-future/5b-next-steps-in-municipal-and-industrial-water-in-conservation">USU Institute for Land, Water and Air (2025)</a>.</li>
		<li>Half of Utahns overwater: BYU, Sowby et al. (2022), <a href="https://kutv.com/news/utah-water/byu-study-observes-half-of-utahns-are-watering-their-lawns-too-much">via KUTV</a>. Up to half of outdoor water wasted: <a href="https://www.epa.gov/watersense/irrigation-controllers">EPA WaterSense</a>.</li>
		<li>Great Salt Lake: <a href="https://wre-rapps.utah.gov/GSLApp/">live level</a>; inflow needed: <a href="https://greatsaltlake.utah.gov/wp-content/uploads/Great-Salt-Lake-Strategic-Plan.pdf">GSL Strategic Plan</a>.</li>
		<li>Energy: ~{KWH_PER_ACRE_FT} kWh per acre-foot to supply and treat (US average, EPRI via <a href="https://www.aceee.org/files/proceedings/2009/data/papers/6_83.pdf">ACEEE</a>; range about 260–880). Utah grid {CO2_KG_PER_KWH} kg CO₂/kWh (<a href="https://www.eia.gov/electricity/state/utah/">EIA, 2024</a>).</li>
		<li>Data centers: <a href="https://www.deseret.com/politics/2026/08/19/water-saving-data-centers-in-utah/">Deseret News (48 centers)</a>; <a href="https://legiscan.com/UT/bill/HB0076">HB 76 (2026)</a>; <a href="https://rules.utah.gov/wp-content/uploads/Utah-Executive-Order-No.-2026-03.pdf">Executive Order 2026-03</a>; the Box Elder County campus's own estimate of ~{fmt(STRATOS_AF)} acre-feet a year net (<a href="https://www.sltrib.com/news/2026/10/20/kevin-olearys-utah-data-center/">SL Tribune</a>).</li>
		<li>Our numbers: lawn from 2024 NAIP imagery (haze-corrected NDVI, minus Meta tree canopy and buildings), need from gridMET reference ET × 0.8 minus half the rain, April–October. Overwatering is the gap between a July schedule left on all season and a well-run spray system, for half of homes. 1 acre-foot = {fmt(GAL_PER_ACRE_FT)} gallons.</li>
	</ul>
</details>

<style>
	.lede { font-size: 1.12rem; color: var(--muted); max-width: 780px; }
	section, details { margin-top: 18px; }
	.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
	.tile p { margin: 6px 0 0; color: var(--muted); }
	.tile .big { color: var(--water); }
	.measured { display: grid; grid-template-columns: 120px 1fr; gap: 18px; align-items: center; }
	.art { width: 100%; }
	.scale .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 10px 0; }
	.scale .row p { margin: 2px 0 0; }
	.scale .big { color: var(--lawn); }
	.ai { display: grid; grid-template-columns: 220px 1fr; gap: 18px; align-items: center; background: linear-gradient(160deg, #fff 45%, #fdf0e3); border-color: #f2d3b3; }
	.arch { width: 100%; }
	@media (max-width: 680px) { .measured, .ai { grid-template-columns: 1fr; } .art, .arch { max-width: 160px; } }
	.sources summary { cursor: pointer; font-family: var(--display); }
	.sources li { margin: 6px 0; }
</style>
