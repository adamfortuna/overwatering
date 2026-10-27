<script lang="ts">
	// One lot: map with tap-to-fix regions, your lawn, and the three ways to save. Used by
	// prebuilt neighborhoods (/p/...) and on-demand Utah addresses (/u/...).
	import ParcelMap from './ParcelMap.svelte';
	import { rebateEstimate } from './rebates.ts';
	import { annualTurfNeedGal, conversionSavingsGal, outdoorFromBill, overwateringGap, fmt, type EtoTable } from './water.ts';
	import { loadLabels, saveLabel } from './labels.ts';
	import type { Parcel, RegionCls, RegionFeature } from './data.ts';
	import CountUp from './CountUp.svelte';
	import { headline } from './watering.ts';
	import Sprinkler from './art/Sprinkler.svelte';
	import Coin from './art/Coin.svelte';
	import Grass from './art/Grass.svelte';
	import Drop from './art/Drop.svelte';
	import { onMount } from 'svelte';

	export type ViewDataset = { id: string; name: string; city: string; county?: string; utah: boolean };
	let {
		ds,
		eto,
		parcel,
		regions: initialRegions,
		imagery,
		imageUrl,
		etoKey
	}: {
		ds: ViewDataset;
		eto: EtoTable & { annual_eto_in?: number };
		parcel: Parcel;
		regions: { type: 'FeatureCollection'; features: RegionFeature[] };
		imagery: { source: string; date: string; gsd_m: number };
		imageUrl?: string;
		/** Which reference-ET table /watering should use: 'slc', 'sandy', or a county name. */
		etoKey: string;
	} = $props();
	const CYCLE: RegionCls[] = ['lawn', 'other', 'converted', 'canopy'];
	const COLORS: Record<RegionCls, string> = { lawn: '#4ade80', canopy: '#15803d', building: '#ff7a6b', other: '#8b93ad', converted: '#4cc9f0' };
	const LABEL: Record<RegionCls, string> = { lawn: 'Lawn', other: 'Not lawn (paving, beds, gravel)', converted: 'Converted to water-wise', canopy: 'Trees, not lawn', building: 'Building' };
	// svelte-ignore state_referenced_locally
	let regions = $state(initialRegions);
	let saved = $state<'d1' | 'local' | null>(null);
	let edits = $state(0);

	onMount(async () => {
		const labels = await loadLabels(ds.id, parcel.parcel_id);
		for (const l of labels) if (regions.features[l.region_index]) regions.features[l.region_index].properties.cls = l.cls;
		edits = labels.length;
	});

	function toggle(idx: number) {
		const f = regions.features[idx];
		const next = CYCLE[(CYCLE.indexOf(f.properties.cls) + 1) % CYCLE.length];
		f.properties.cls = next;
		regions = { ...regions, features: [...regions.features] };
		edits++;
		saveLabel({ dataset: ds.id, parcel_id: parcel.parcel_id, region_index: idx, cls: next, original_cls: f.properties.original! }).then((s) => (saved = s));
	}
	const sum = (cls: RegionCls) => regions.features.filter((f) => f.properties.cls === cls).reduce((s, f) => s + f.properties.sqft, 0);
	let lawn = $derived(sum('lawn'));
	let converted = $derived(sum('converted'));
	let canopy = $derived(sum('canopy'));
	let need = $derived(annualTurfNeedGal(lawn, eto));
	let conv = $derived(conversionSavingsGal(lawn, eto));
	// Who governs and waters this lot (municipality, provider, districts); rebates follow the city.
	type Juri = { municipality: string | null; county: string | null; provider: string | null; wholesalers: string[] };
	let juri = $state<Juri | null>(null);
	$effect(() => {
		const [lon, lat] = parcel.centroid;
		fetch(`/api/jurisdiction?lon=${lon}&lat=${lat}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => (juri = j))
			.catch(() => {});
	});
	let rebateCity = $derived(juri ? (juri.municipality ?? '') : ds.city);
	let rebateCounty = $derived(juri?.county ?? ds.county);
	let rebate = $derived(rebateEstimate(lawn, rebateCity, rebateCounty));
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
	let plan = $derived(bill ? headline(lawn, eto, bill.total) : null);
	let planHref = $derived.by(() => {
		const q = new URLSearchParams({ lawn: String(Math.round(lawn)), eto: etoKey, back: typeof location === 'undefined' ? '/' : location.pathname });
		if (bill) q.set('out', Object.entries(bill.outdoor).map(([m, g]) => `${m}:${Math.round(g)}`).join(','));
		return `/watering?${q}`;
	});
	let nativeHref = $derived.by(() => {
		const q = new URLSearchParams({ lawn: String(Math.round(lawn)), eto: etoKey, city: rebateCity ?? '', county: rebateCounty ?? '', back: typeof location === 'undefined' ? '/' : location.pathname });
		return `/native?${q}`;
	});
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
</script>

<a class="back" href="/">← another address</a>
<p class="kicker">{ds.name}</p>
<h1>{parcel.address}</h1>
<p class="muted meta">Lot {fmt(parcel.parcel_sqft)} sq ft · imagery {imagery.date} at {imagery.gsd_m} m per pixel · detection confidence <b>{parcel.confidence}</b></p>

<div class="layout">
	<section>
		<div class="mapwrap card">
			<ParcelMap {parcel} {regions} dataset={ds.id} {imageUrl} ontoggle={toggle} />
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
			<svg class="corner" viewBox="0 0 60 70" aria-hidden="true"><Drop x={8} y={4} scale={1} /></svg>
			<p class="kicker">Your lawn</p>
			<div class="huge"><CountUp value={lawn} /> <span class="unit">sq ft of lawn</span></div>
			<p class="muted">{canopy ? `Plus ${fmt(canopy)} sq ft under trees we didn't count. ` : ''}{converted ? `${fmt(converted)} sq ft already converted. ` : ''}It needs about <b class="ink">{need.inches.toFixed(0)} inches</b> of water a season, or <b class="ink">{fmt(need.gal)} gallons</b> a year.</p>
			<p class="muted small">Range before your edits: {fmt(parcel.lawn_lo_sqft)}–{fmt(parcel.lawn_hi_sqft)} sq ft.</p>
		</div>

		<div class="card door">
			<svg class="corner" viewBox="0 0 130 130" aria-hidden="true"><Sprinkler x={20} y={-26} scale={0.92} spray={false} /></svg>
			<p class="kicker">1 · Today</p>
			<h3>Water what it needs</h3>
			{#if bill}
				{#if bill.gap > 0}
					<div class="big over"><CountUp value={bill.gap} suffix=" gal/yr" /></div>
					<p class="muted small">Overwatering. Your bill shows {fmt(bill.total)} gal of outdoor use a year ({bill.appliedIn.toFixed(0)} inches on this lawn) against a need of {fmt(need.gal)}. Indoor baseline {fmt(bill.baseline)} gal/month.</p>
				{:else}
					<div class="big ok">Right on target</div>
					<p class="muted small">Your outdoor use ({fmt(bill.total)} gal/yr) is at or under what this lawn needs ({fmt(need.gal)}). Nice.</p>
				{/if}
				{#if plan}
					<div class="plan">
						<p class="plan-kicker">Optimize your watering for next year</p>
						<p class="plan-line">
							<b>{plan.action}</b>{#if plan.gallons > 0}{' '}and save about <b class="save">{fmt(plan.gallons)} gallons</b> a year{/if}.
						</p>
						<a class="plan-cta" href={planHref}>Build my watering plan →</a>
					</div>
				{/if}
			{:else}
				<p class="muted">Add your water bill to see how far over the lawn's need you are. Most Utah lawns get 6–12 inches a year more than they use.</p>
				<p class="small"><a href={planHref}>Or tune up your sprinklers now →</a></p>
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
			<svg class="corner" viewBox="0 0 130 130" aria-hidden="true"><Coin x={65} y={68} scale={1.5} /></svg>
			<p class="kicker">2 · One time</p>
			<h3>Take the rebate</h3>
			{#if !ds.utah}
				<p class="muted">No Utah program applies here.</p>
			{:else if !rebate.provider}
				<p class="muted">{rebateCity || 'This area'} isn't on Utah Water Savers' eligible list. Rebates need a city water-efficient landscape ordinance; ask your city or water provider.</p>
			{:else if rebate.eligible}
				<div class="big gold">up to <CountUp value={rebate.high} prefix="$" /></div>
				<p class="muted small">{rebate.provider.name}: ${rebate.provider.rate_low.toFixed(2)}{rebate.provider.rate_high !== rebate.provider.rate_low ? `–$${rebate.provider.rate_high.toFixed(2)}` : ''} per sq ft on {fmt(rebate.eligibleSqft)} sq ft{rebate.provider.max_dollars ? `, capped at $${fmt(rebate.provider.max_dollars)} per property` : ''}. {rebate.provider.notes} Rates checked {rebate.provider.last_checked}.{rebate.note ? ` Note: ${rebate.note}` : ''}</p>
			{:else}
				<p class="muted">Below the {rebate.provider.min_sqft} sq ft minimum project size for {rebate.provider.name}.</p>
			{/if}
			{#if ds.utah}
				<dl class="where">
					<dt>City</dt>
					<dd>
						{#if juri && !juri.municipality}Unincorporated {rebateCounty} County{:else}<b>{rebateCity || ds.city}</b>{#if rebateCounty}, {rebateCounty} County{/if}{/if}
						<span class={rebate.provider ? 'ok-pill' : 'no-pill'}>{rebate.provider ? "city's on the list" : 'not on the list'}</span>
					</dd>
					{#if juri?.provider}
						<dt>Water from</dt>
						<dd>{juri.provider}{#if juri.wholesalers.length}<span class="muted">, supplied by {juri.wholesalers.join(' and ')}</span>{/if}</dd>
					{/if}
					{#if rebate.provider}
						<dt>Program</dt>
						<dd>{rebate.provider.name} pays this city's lawn rebates</dd>
					{/if}
					<dt>Also here</dt>
					<dd>Up to $100 back on a WaterSense smart controller, for any Utah home. <a href="https://www.utahwatersavers.com/smartcontrollerprogram" target="_blank" rel="noopener">Smart controller rebate →</a></dd>
				</dl>
			{/if}
			<p class="warn">Don't remove or kill any lawn before you're approved. Pre-approval and a site visit come first, or the project is disqualified. <a href={rebate.provider?.apply_url ?? rebate.rules.portal} target="_blank" rel="noopener">How to apply</a></p>
		</div>

		<div class="card door">
			<svg class="corner" viewBox="0 0 130 130" aria-hidden="true"><Grass x={6} y={-6} scale={1.05} /></svg>
			<p class="kicker">3 · Every year</p>
			<h3>Go native</h3>
			<div class="big save"><CountUp value={conv} suffix=" gal/yr" /></div>
			<p class="muted small">Water saved if this lawn becomes water-wise Utah landscape (plant water use 0.8 → 0.3 of reference ET; {eto.annual_eto_in ?? '?'} in/yr here). {converted ? `The area you marked converted already saves about ${fmt(convertedSavings)} gal/yr.` : ''}</p>
			<a class="plan-cta native-cta" href={nativeHref}>What going native looks like →</a>
		</div>
	</section>
</div>

<style>
	.back { display: inline-block; margin: 4px 0 12px; text-decoration: none; font-family: var(--display); font-weight: 600; background: #fff; border: 2px solid var(--line); border-radius: 999px; padding: 4px 14px; box-shadow: 0 3px 0 #d6ecf9; }
	.meta { margin-top: 4px; }
	.ink { color: var(--ink); }
	.layout { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 18px; }
	@media (min-width: 900px) { .layout { grid-template-columns: 1.1fr 1fr; } .layout > section:first-child { position: sticky; top: 12px; align-self: start; } }
	.mapwrap { padding: 8px; }
	.cards { display: flex; flex-direction: column; gap: 16px; }
	.reveal { background: linear-gradient(160deg, #ffffff 40%, #e3f5fe); border-color: #a9e1f8; }
	.huge { font-family: var(--display); font-weight: 700; font-size: clamp(2.8rem, 6vw, 3.8rem); line-height: 1; color: var(--water); margin: 4px 0 10px; }
	.unit { font-size: 1.15rem; font-weight: 600; color: var(--muted); }
	.door, .reveal { position: relative; }
	.corner { position: absolute; right: 12px; top: 10px; width: 64px; height: 64px; }
	.reveal .corner { width: 46px; height: 54px; }
	.door h3, .door .kicker, .reveal .kicker { padding-right: 70px; }
	.door h3 { font-size: 1.3rem; }
	.over { color: var(--coral); }
	.ok, .save { color: var(--lawn); }
	.gold { color: var(--gold); }
	.hint { color: var(--muted); font-size: 0.92rem; margin: 10px 4px 8px; }
	.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; list-style: none; padding: 0; margin: 0 4px; font-size: 0.88rem; color: var(--muted); }
	.sw { display: inline-block; width: 13px; height: 13px; border-radius: 4px; margin-right: 6px; vertical-align: -1px; }
	.where { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 12px 0; padding: 12px 14px; background: var(--panel-2); border: 2px solid var(--line); border-radius: 14px; font-size: 0.92rem; }
	.where dt { font-family: var(--display); font-weight: 600; color: var(--water); }
	.where dd { margin: 0; }
	.ok-pill, .no-pill { display: inline-block; margin-left: 6px; font-size: 0.75rem; font-weight: 700; border-radius: 999px; padding: 1px 8px; color: #fff; vertical-align: 1px; }
	.ok-pill { background: var(--lawn); }
	.no-pill { background: #8b93ad; }
	.warn { background: #fff6dc; border: 2px solid #ffe08a; color: #6b4b00; border-radius: 14px; padding: 10px 12px; font-size: 0.92rem; margin-bottom: 0; }
	.warn a { color: #8a5d00; font-weight: 700; }
	details { margin-top: 10px; }
	summary { cursor: pointer; color: var(--water); font-family: var(--display); font-weight: 600; }
	.months { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
	.months label { font-size: 0.8rem; color: var(--muted); }
	.months input, select { width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 10px; }
	.file { display: block; margin: 10px 0; font-size: 0.92rem; }
	.plan { margin-top: 12px; background: var(--aqua); border: 2px solid #a9e1f8; border-radius: 16px; padding: 12px 14px; }
	.plan-kicker { margin: 0; font-family: var(--display); font-weight: 600; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--water); }
	.plan-line { margin: 4px 0 8px; }
	.plan-cta { display: inline-block; font-family: var(--display); font-weight: 600; color: #fff; background: var(--water); border-radius: 999px; padding: 6px 16px; text-decoration: none; box-shadow: 0 3px 0 #1567a8; }
	.plan-cta:hover { background: #1a78c2; }
	.native-cta { background: var(--lawn); box-shadow: 0 3px 0 #1f6e36; margin-top: 4px; }
	.native-cta:hover { background: #258541; }
</style>
