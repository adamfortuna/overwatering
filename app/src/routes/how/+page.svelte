<svelte:head><title>How it works · Overwater.ing?</title></svelte:head>

<p class="kicker">How it works</p>
<h1>From an address to three ways to save</h1>

<ol class="steps">
	<li class="card">
		<h3>Find your lot</h3>
		<p class="muted">Parcel lines and addresses come from Utah's 29 county recorders, published by UGRC. Building outlines come from Overture Maps (our prebuilt neighborhoods) or UGRC's statewide buildings layer (everywhere else).</p>
	</li>
	<li class="card">
		<h3>Find the grass</h3>
		<p class="muted">USDA's 2024 aerial imagery (60 cm pixels, flown summer 2024) includes near-infrared, where healthy plants glow. We correct for haze, keep the green pixels, then subtract buildings and anything under tree canopy taller than 2.5 m (Meta's canopy height map). For the six prebuilt neighborhoods this ran ahead of time; for any other Utah address your browser does the same math on the spot in a few seconds.</p>
	</li>
	<li class="card">
		<h3>You fix what we got wrong</h3>
		<p class="muted">Tap any shape on your lot to relabel it. Corrections are saved so the next estimate gets better.</p>
	</li>
	<li class="card">
		<h3>Do the water math</h3>
		<p class="muted">Turf needs about 80% of reference evapotranspiration from April to October, minus half the rain (FAO-56, from gridMET weather, 2023–2025, one station-like point per county: from 42 in/yr in Rich County to 70 in St. George). Your bill's winter months set the indoor baseline; everything above it in summer is outdoor water.</p>
	</li>
	<li class="card">
		<h3>Three ways to save</h3>
		<p class="muted">First, the gap between what you use and what the lawn needs. Second, the Utah Water Savers rebate for your city's program. Third, the water a water-wise Utah landscape would save every year.</p>
	</li>
</ol>

<div class="card fine">
	<h3>The fine print</h3>
	<ul class="muted">
		<li>Grass under trees is counted as trees, so lots with big canopy read low. Fix it with a tap.</li>
		<li>Park strips belong to the city, not the parcel, so they aren't counted.</li>
		<li>Brown or dormant lawn in July 2024 reads as "not lawn"; artificial turf does too.</li>
		<li>Rebates cover all 155 cities on Utah Water Savers' eligible list across seven programs, checked October 27, 2026. Cities not on the list aren't eligible yet. Always get pre-approval before removing any lawn.</li>
		<li>Outside the prebuilt neighborhoods, building outlines are from 2018 and can miss newer additions, so a little roof can show up as "not lawn" or a new addition as lawn. Tap to fix it.</li>
		<li>We don't keep the addresses you look up, and there's no map provider tracking you.</li>
	</ul>
</div>

<style>
	.steps { list-style: none; counter-reset: s; padding: 0; display: grid; gap: 12px; margin: 22px 0; }
	.steps li { counter-increment: s; position: relative; padding-left: 64px; }
	.steps li::before { content: counter(s); position: absolute; left: 18px; top: 16px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: var(--water); color: #fff; font-family: var(--display); font-weight: 800; }
	.steps h3 { font-size: 1.15rem; margin-bottom: 4px; }
	.steps p { margin: 0; }
	.fine ul { padding-left: 18px; margin: 0; }
	.fine li { margin: 4px 0; }
</style>
