<script lang="ts">
	import type { PageProps } from './$types';
	import ParcelMap from '#lib/ParcelMap.svelte';
		import { rebateEstimate } from '#lib/rebates.ts';
	import { annualTurfNeedGal, conversionSavingsGal, outdoorFromBill, overwateringGap, fmt } from '#lib/water.ts';
	import { loadLabels, saveLabel } from '#lib/labels.ts';
	import { etoFor, type RegionCls } from '#lib/data.ts';
	import CountUp from '#lib/CountUp.svelte';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();
	let eto = $derived(etoFor(data.ds));
	const CYCLE: RegionCls[] = ['lawn', 'other', 'converted', 'canopy'];
	const COLORS: Record<RegionCls, string> = { lawn: '#4ade80', canopy: '#15803d', building: '#ff7a6b', other: '#8b93ad', converted: '#4cc9f0' };
	const LABEL: Record<RegionCls, string> = { lawn: 'Lawn', other: 'Not lawn (paving, beds, gravel)', converted: 'Converted to water-wise', canopy: 'Trees, not lawn', building: 'Building' };
	let regions = $state(data.regions);
	let saved = $state<'d1' | 'local' | null>(null);
	let edits = $state(0);

	onMount(async () => {
		const labels = await loadLabels(data.ds.id, data.parcel.parcel_id);
		for (const l of labels) if (regions.features[l.region_index]) regions.features[l.region_index].properties.cls = l.cls;
		edits = labels.length;
	});

	function toggle(idx: number) {
		const f = regions.features[idx];
		const next = CYCLE[(CYCLE.indexOf(f.properties.cls) + 1) % CYCLE.length];
		f.properties.cls = next;
		regions = { ...regions, features: [...regions.features] };
		edits++;
		saveLabel({ dataset: data.ds.id, parcel_id: data.parcel.parcel_id, region_index: idx, cls: next, original_cls: f.properties.original! }).then((s) => (saved = s));
	}
	const sum = (cls: RegionCls) => regions.features.filter((f) => f.properties.cls === cls).reduce((s, f) => s + f.properties.sqft, 0);
	let lawn = $derived(sum('lawn'));
	let converted = $derived(sum('converted'));
	let canopy = $derived(sum('canopy'));
	let need = $derived(annualTurfNeedGal(lawn, eto));
	let conv = $derived(conversionSavingsGal(lawn, eto));
	let rebate = $derived(rebateEstimate(lawn, data.ds.city));
	let convertedSavings = $derived(conversionSavingsGal(converted, eto));

	// Bill: manual 12-month entry or upload
	let unit = $state('ccf');
	let months = $state<Record<number, number | null>>(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, null])));
	let billNote = $state('');
	let billBusy = $state(false);
	let bill = $derived.by(() => {
		const filled = Object.fromEntries(Object.entries(months).filter(([, v]) => v != null && v !== ('' as unknown)).map(([k, v]) => [k, Number(v)]));
		if (Object.keys(filled).length < 3) return null;
		const o = outdoorFromBill(filled, unit);
		return { ...o, gap: overwateringGap(o.total, need.gal), appliedIn: lawn ? (o.total / 7.48052) * 12 / lawn : 0 };
	});
	async function upload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		billBusy = true;
		billNote = '';
		const fd = new FormData();
		fd.append('file', file);
		const r = await fetch('/api/bill', { method: 'POST', body: fd });
		const j = await r.json();
		billBusy = false;
		if (!r.ok) {
			billNote = j.error ?? 'Could not read the bill';
			return;
		}
		if (j.unit && j.unit !== 'unknown') unit = j.unit;
		for (const m of j.months) months[m.month] = m.usage;
		billNote = `Read ${j.months.length} months from ${j.provider} in ${j.unit}. ${j.notes ?? ''}`;
	}
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
</script>

<svelte:head><title>{data.parcel.address} · Overwater.ing?</title></svelte:head>

<a class="back" href="/">← another address</a>
<p class="kicker">{data.ds.name}</p>
<h1>{data.parcel.address}</h1>
<p class="muted meta">Lot {fmt(data.parcel.parcel_sqft)} sq ft · imagery {data.imagery.date} at {data.imagery.gsd_m} m per pixel · detection confidence <b>{data.parcel.confidence}</b></p>

<div class="layout">
	<section>
		<div class="mapwrap card">
			<ParcelMap parcel={data.parcel} regions={regions} dataset={data.ds.id} ontoggle={toggle} />
		</div>
		<p class="hint">Did we get it wrong? Tap any shape to change it: lawn → not lawn → converted → trees. Buildings stay put. {edits ? `${edits} correction${edits === 1 ? '' : 's'} so far${saved ? `, saved ${saved === 'd1' ? 'for everyone' : 'on this device'}` : ''}.` : ''}</p>
		<ul class="legend">
			{#each ['lawn', 'canopy', 'other', 'converted', 'building'] as c}
				<li><span class="sw" style="background:{COLORS[c as RegionCls]}"></span>{LABEL[c as RegionCls]}</li>
			{/each}
		</ul>
	</section>

	<section class="cards">
		<div class="card reveal">
			<p class="kicker">The reveal</p>
			<div class="huge"><CountUp value={lawn} /> <span class="unit">sq ft of lawn</span></div>
			<p class="muted">{canopy ? `Plus ${fmt(canopy)} sq ft under trees we didn't count. ` : ''}{converted ? `${fmt(converted)} sq ft already converted. ` : ''}It needs about <b class="ink">{need.inches.toFixed(0)} inches</b> of water a season, or <b class="ink">{fmt(need.gal)} gallons</b> a year.</p>
			<p class="muted small">Range before your edits: {fmt(data.parcel.lawn_lo_sqft)}–{fmt(data.parcel.lawn_hi_sqft)} sq ft.</p>
		</div>

		<div class="card door">
			<span class="num" aria-hidden="true">1</span>
			<p class="kicker">Door 1 · free, today</p>
			<h3>Water what it needs</h3>
			{#if bill}
				{#if bill.gap > 0}
					<div class="big over"><CountUp value={bill.gap} suffix=" gal/yr" /></div>
					<p class="muted small">Overwatering. Your bill shows {fmt(bill.total)} gal of outdoor use a year ({bill.appliedIn.toFixed(0)} inches on this lawn) against a need of {fmt(need.gal)}. Indoor baseline {fmt(bill.baseline)} gal/month.</p>
				{:else}
					<div class="big ok">Right on the money</div>
					<p class="muted small">Your outdoor use ({fmt(bill.total)} gal/yr) is at or under what this lawn needs ({fmt(need.gal)}). Nice.</p>
				{/if}
			{:else}
				<p class="muted">Add your water bill to see how far over the lawn's need you are. Most Utah lawns get 6–12 inches a year more than they use.</p>
			{/if}
			<details>
				<summary>{bill ? 'Edit your bill' : 'Add your water bill'}</summary>
				<label class="file">Upload a photo or PDF of a bill with the usage history <input type="file" accept="image/*,application/pdf" onchange={upload} disabled={billBusy} /></label>
				{#if billBusy}<p class="small muted">Reading your bill…</p>{/if}
				{#if billNote}<p class="small">{billNote}</p>{/if}
				<label>Unit on the bill <select bind:value={unit}><option value="ccf">CCF / HCF (hundred cubic feet)</option><option value="kgal">thousand gallons</option><option value="gal">gallons</option></select></label>
				<div class="months">
					{#each MONTHS as m, i}<label>{m}<input type="number" min="0" bind:value={months[i + 1]} /></label>{/each}
				</div>
			</details>
		</div>

		<div class="card door">
			<span class="num" aria-hidden="true">2</span>
			<p class="kicker">Door 2 · one time</p>
			<h3>Take the rebate</h3>
			{#if !data.ds.utah}
				<p class="muted">No Utah program applies here.</p>
			{:else if rebate.eligible}
				<div class="big gold">up to <CountUp value={rebate.high} prefix="$" /></div>
				<p class="muted small">{rebate.provider.name}: ${rebate.provider.rate_low.toFixed(2)}{rebate.provider.rate_high !== rebate.provider.rate_low ? `–$${rebate.provider.rate_high.toFixed(2)}` : ''} per sq ft on {fmt(rebate.eligibleSqft)} sq ft{rebate.provider.max_dollars ? `, capped at $${fmt(rebate.provider.max_dollars)} per property` : ''}. Rates checked {rebate.provider.last_checked}{rebate.provider.verified ? '' : ' (unverified, confirm on the portal)'}.</p>
			{:else}
				<p class="muted">Below the {rebate.provider.min_sqft} sq ft minimum project size.</p>
			{/if}
			<p class="warn">Don't remove or kill any lawn before you're approved. Pre-approval and a site visit come first, or the project is disqualified. <a href={rebate.provider.apply_url} target="_blank" rel="noopener">Apply on Utah Water Savers</a></p>
		</div>

		<div class="card door">
			<span class="num" aria-hidden="true">3</span>
			<p class="kicker">Door 3 · every year</p>
			<h3>Convert it</h3>
			<div class="big save"><CountUp value={conv} suffix=" gal/yr" /></div>
			<p class="muted small">Water left in the system if this lawn becomes water-wise landscape (plant water use 0.8 → 0.3 of reference ET; {eto.annual_eto_in} in/yr here). {converted ? `The area you marked converted already saves about ${fmt(convertedSavings)} gal/yr.` : ''}</p>
		</div>
	</section>
</div>

<style>
	.back { display: inline-block; margin: 8px 0 14px; text-decoration: none; font-weight: 600; }
	.meta { margin-top: 4px; }
	.ink { color: var(--ink); }
	.layout { display: grid; grid-template-columns: 1fr; gap: 18px; margin-top: 18px; }
	@media (min-width: 900px) { .layout { grid-template-columns: 1.1fr 1fr; } .layout > section:first-child { position: sticky; top: 12px; align-self: start; } }
	.mapwrap { padding: 6px; }
	.cards { display: flex; flex-direction: column; gap: 14px; }
	.reveal { border-color: rgba(255, 201, 64, 0.45); box-shadow: 0 0 0 1px rgba(255, 201, 64, 0.12), 0 10px 40px -20px rgba(255, 201, 64, 0.5); }
	.huge { font-family: var(--display); font-weight: 800; font-size: clamp(2.6rem, 6vw, 3.6rem); line-height: 1; letter-spacing: -0.03em; margin: 4px 0 10px; }
	.unit { font-size: 1.1rem; font-weight: 650; color: var(--muted); letter-spacing: 0; }
	.door { position: relative; overflow: hidden; }
	.door .num { position: absolute; right: 12px; top: -16px; font-family: var(--display); font-weight: 800; font-size: 6rem; line-height: 1; color: transparent; -webkit-text-stroke: 1.5px rgba(255, 201, 64, 0.3); pointer-events: none; }
	.door h3 { font-size: 1.2rem; }
	.over { color: var(--coral); }
	.ok, .save { color: var(--lawn); }
	.gold { color: var(--gold); }
	.hint { color: var(--muted); font-size: 0.92rem; margin: 10px 2px 8px; }
	.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; list-style: none; padding: 0; margin: 0 2px; font-size: 0.85rem; color: var(--muted); }
	.sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
	.warn { background: rgba(255, 201, 64, 0.1); border: 1px solid rgba(255, 201, 64, 0.35); color: var(--gold); border-radius: 10px; padding: 10px 12px; font-size: 0.92rem; margin-bottom: 0; }
	.warn a { color: var(--gold); font-weight: 650; }
	details { margin-top: 10px; }
	summary { cursor: pointer; color: var(--water); font-weight: 600; }
	.months { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
	.months label { font-size: 0.8rem; color: var(--muted); }
	.months input, select { width: 100%; box-sizing: border-box; padding: 6px 8px; }
	.file { display: block; margin: 10px 0; font-size: 0.92rem; }
</style>
