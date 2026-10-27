<svelte:head><title>How it works · Overwater.ing?</title></svelte:head>

<p class="kicker">How it works</p>
<h1>From an address to three doors</h1>

<ol class="steps">
	<li class="card">
		<h3>Find your lot</h3>
		<p class="muted">Parcel lines come from the Salt Lake County Recorder via UGRC, building footprints from Overture Maps.</p>
	</li>
	<li class="card">
		<h3>Find the grass</h3>
		<p class="muted">USDA's 2024 aerial imagery (60 cm pixels, flown July 7, 2024) includes near-infrared, where healthy plants glow. We keep the green pixels, then subtract buildings and anything under tree canopy taller than 2.5 m (Meta's canopy height map).</p>
	</li>
	<li class="card">
		<h3>You fix what we got wrong</h3>
		<p class="muted">Tap any shape on your lot to relabel it. Corrections are saved so the next estimate gets better.</p>
	</li>
	<li class="card">
		<h3>Do the water math</h3>
		<p class="muted">Turf needs about 80% of reference evapotranspiration from April to October, minus half the rain (FAO-56, from gridMET weather, 2023–2025). Your bill's winter months set the indoor baseline; everything above it in summer is outdoor water.</p>
	</li>
	<li class="card">
		<h3>Open the doors</h3>
		<p class="muted">Door 1 is the gap between what you use and what the lawn needs. Door 2 is the Utah Water Savers rebate for your water provider. Door 3 is the water a water-wise landscape would save every year.</p>
	</li>
</ol>

<div class="card fine">
	<h3>The fine print</h3>
	<ul class="muted">
		<li>Grass under trees is counted as trees, so lots with big canopy read low. Fix it with a tap.</li>
		<li>Park strips belong to the city, not the parcel, so they aren't counted.</li>
		<li>Brown or dormant lawn in July 2024 reads as "not lawn"; artificial turf does too.</li>
		<li>Rebate rates were checked against provider pages on October 27, 2026. Always get pre-approval before removing any lawn.</li>
		<li>Your address stays here. There's no map provider; the imagery is our own crop.</li>
	</ul>
</div>

<style>
	.steps { list-style: none; counter-reset: s; padding: 0; display: grid; gap: 12px; margin: 22px 0; }
	.steps li { counter-increment: s; position: relative; padding-left: 64px; }
	.steps li::before { content: counter(s); position: absolute; left: 18px; top: 16px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; border: 2px solid var(--gold); color: var(--gold); font-family: var(--display); font-weight: 800; }
	.steps h3 { font-size: 1.15rem; margin-bottom: 4px; }
	.steps p { margin: 0; }
	.fine ul { padding-left: 18px; margin: 0; }
	.fine li { margin: 4px 0; }
</style>
