<script lang="ts">
	import type { PageProps } from './$types';
	import ParcelMap from '#lib/ParcelMap.svelte';
	import eto from '#lib/eto_sandy_ut.json';
	import { rebateEstimate } from '#lib/rebates.ts';
	import { annualTurfNeedGal, conversionSavingsGal, outdoorFromBill, overwateringGap, fmt } from '#lib/water.ts';
	import { loadLabels, saveLabel } from '#lib/labels.ts';
	import type { RegionCls } from '#lib/data.ts';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();
	const CYCLE: RegionCls[] = ['lawn', 'other', 'converted', 'canopy'];
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

<svelte:head><title>{data.parcel.address} · lawn and water</title></svelte:head>

<a href="/?d={data.ds.id}">← search</a>
<h1>{data.parcel.address}</h1>
<p class="muted">{data.ds.name}. Imagery {data.imagery.source}, captured {data.imagery.date} ({data.imagery.gsd_m} m per pixel). Lot {fmt(data.parcel.parcel_sqft)} sq ft. Detection confidence: <b>{data.parcel.confidence}</b>.</p>

<div class="layout">
	<section>
		<ParcelMap parcel={data.parcel} regions={regions} dataset={data.ds.id} ontoggle={toggle} />
		<p class="hint">Tap any shape to change what it is: lawn → not lawn → converted → trees. Buildings are fixed. Changes save as corrections ({edits} so far{saved ? `, stored ${saved === 'd1' ? 'in the database' : 'on this device'}` : ''}).</p>
		<ul class="legend">
			{#each ['lawn', 'canopy', 'other', 'converted', 'building'] as c}
				<li><span class="sw" style="background:{({ lawn: '#4ade80', canopy: '#15803d', building: '#f87171', other: '#9ca3af', converted: '#38bdf8' })[c]}"></span>{LABEL[c as RegionCls]}</li>
			{/each}
		</ul>
	</section>

	<section class="cards">
		<div class="card">
			<div class="big">{fmt(lawn)} sq ft</div>
			<div class="muted">of lawn{canopy ? `, plus ${fmt(canopy)} sq ft under trees` : ''}{converted ? `, ${fmt(converted)} sq ft already converted` : ''}</div>
			<p class="muted small">Pipeline range before your edits: {fmt(data.parcel.lawn_lo_sqft)}–{fmt(data.parcel.lawn_hi_sqft)} sq ft. Needs about {need.inches.toFixed(0)} inches a season, {fmt(need.gal)} gallons a year.</p>
		</div>

		<div class="card layer">
			<h3>1. Fix overwatering <span class="tag">free, now</span></h3>
			{#if bill}
				<div class="big">{fmt(bill.gap)} gal/yr</div>
				<p class="muted small">Your bill shows {fmt(bill.total)} gal of outdoor use a year ({bill.appliedIn.toFixed(0)} inches on this lawn) against a need of {fmt(need.gal)}. Indoor baseline {fmt(bill.baseline)} gal/month.</p>
			{:else}
				<p class="muted">Add your water bill to see how far over the lawn's need you are. Utahns overwater by 6–12 inches a year on average.</p>
			{/if}
			<details>
				<summary>Water bill</summary>
				<label class="file">Upload a bill photo or PDF <input type="file" accept="image/*,application/pdf" onchange={upload} disabled={billBusy} /></label>
				{#if billNote}<p class="small">{billNote}</p>{/if}
				<label>Unit on the bill <select bind:value={unit}><option value="ccf">CCF / HCF (hundred cubic feet)</option><option value="kgal">thousand gallons</option><option value="gal">gallons</option></select></label>
				<div class="months">
					{#each MONTHS as m, i}<label>{m}<input type="number" min="0" bind:value={months[i + 1]} /></label>{/each}
				</div>
			</details>
		</div>

		<div class="card layer">
			<h3>2. State rebate <span class="tag">one time</span></h3>
			{#if !data.ds.utah}
				<p class="muted">No Utah program applies to this test neighborhood. For a Utah address the saved provider table gives the rate.</p>
			{:else if rebate.eligible}
				<div class="big">up to ${fmt(rebate.high)}</div>
				<p class="muted small">{rebate.provider.name}: ${rebate.provider.rate_low.toFixed(2)}{rebate.provider.rate_high !== rebate.provider.rate_low ? `–$${rebate.provider.rate_high.toFixed(2)}` : ''} per sq ft on {fmt(rebate.eligibleSqft)} sq ft{rebate.provider.max_dollars ? `, capped at $${fmt(rebate.provider.max_dollars)} per property` : ''}. {rebate.provider.notes} Rates last checked {rebate.provider.last_checked}{rebate.provider.verified ? '' : ' (unverified, confirm on the portal)'}.</p>
			{:else}
				<p class="muted">Below the {rebate.provider.min_sqft} sq ft minimum project size.</p>
			{/if}
			<p class="warn">Do not remove or kill any lawn before you are approved. Pre-approval and a site visit come first, or the project is disqualified. <a href={rebate.provider.apply_url} target="_blank" rel="noopener">Apply on Utah Water Savers</a>.</p>
		</div>

		<div class="card layer">
			<h3>3. After converting <span class="tag">every year</span></h3>
			<div class="big">{fmt(conv)} gal/yr</div>
			<p class="muted small">Water left in the system if this lawn becomes water-wise landscape (turf coefficient 0.8 → 0.3, local reference ET {eto.annual_eto_in} in/yr). {converted ? `Already converted area saves about ${fmt(convertedSavings)} gal/yr.` : ''}</p>
		</div>
	</section>
</div>

<style>
	.layout { display: grid; grid-template-columns: 1fr; gap: 16px; }
	@media (min-width: 900px) { .layout { grid-template-columns: 1.1fr 1fr; } }
	.cards { display: flex; flex-direction: column; gap: 12px; }
	.layer h3 { display: flex; justify-content: space-between; align-items: baseline; font-size: 1.05rem; }
	.tag { font-size: 0.75rem; color: var(--muted); font-weight: 500; }
	.hint { color: var(--muted); font-size: 0.9rem; margin: 8px 0; }
	.legend { display: flex; flex-wrap: wrap; gap: 10px 16px; list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: var(--muted); }
	.sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
	.small { font-size: 0.9rem; }
	.warn { background: #3b2d0b; color: var(--warn); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; }
	.warn a { color: var(--warn); }
	details { margin-top: 8px; }
	summary { cursor: pointer; color: var(--accent); }
	.months { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
	.months label { font-size: 0.8rem; color: var(--muted); }
	.months input, select { width: 100%; box-sizing: border-box; font: inherit; padding: 6px; border-radius: 6px; border: 1px solid #2d3d3a; background: #0f1413; color: var(--ink); }
	.file { display: block; margin: 8px 0; }
</style>
