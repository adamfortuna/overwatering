# Pitch brief: Overwater.ing? for the Nucleus × Startup State bounty

You are building the presentation for **Overwater.ing?** (https://overwater.ing). It's a live web
app that measures the lawn on any Utah lot from aerial imagery, works out how much water that
lawn actually needs, and shows the owner what to change and what Utah pays them to replace it.
The builder is Adam Fortuna. The demo is **Wednesday Oct 28, 2026 at 5:00 PM Mountain**. The
format is a **~5 minute pitch with a live demo**.

The repo is the source of truth. This brief is updated on `main` as features land, so
`git pull` before each work session. Commit straight to `main`. Don't open PRs.

## Deliverable

Adam has a Google Slides deck ready, which anyone with the link can edit:
https://docs.google.com/presentation/d/1pIb95AvlPJytyUMB2z_DV_tBRmM6ldHqN-SpP8P8bGQ/edit

- **No Google credentials are available to agents.** The deck can be *read* (it's public, and
  `.../export/pptx` works; it is currently one blank slide). It can't be written through the API.
- **Build the deck as `docs/pitch/overwatering.pptx`** with python-pptx (`uv run --with python-pptx`).
  Adam imports it in Slides with File → Import slides → Upload → select all.
- Make it import cleanly:
  - 16:9.
  - Embed images as PNG rather than SVG. Render the app's SVG art with a headless browser or `rsvg-convert`.
  - Use real text boxes, not text baked into images, so Adam can edit them.
  - Use only fonts that Google Slides has: **Fredoka** for headings, **Nunito** for body.
- Also produce:
  - `docs/pitch/script.md`: speaker notes timed to the second. Put the same notes in each slide's notes.
  - `docs/pitch/demo.md`: an exact click path, with a fallback for every step.
  - `docs/pitch/shots/`: screenshots of overwater.ing at 1600×1000 and 2× scale. Use Playwright;
    `npx playwright` works once you `npx playwright install chromium`.
- If the brief and the rubric disagree, the rubric wins. Keep slides sparse: one idea per slide,
  big numbers, the app's illustrations.

## Rubric (what judges score)

| Criterion | Weight | What we show |
|---|---|---|
| Progress beyond concept | 30% | It's live, statewide, and runs on real data. The demo is the product, not a mockup. |
| Path to reality | 25% | Partners, a business model, the $10K plan, what's already in motion |
| Hard tech depth | 20% | Remote sensing + LiDAR at the edge, a closed loop to sprinkler hardware, the water–energy–AI-infrastructure link |
| Utah impact | 15% | Great Salt Lake, statewide outdoor water, data-center water pressure |
| Team & pitch | 10% | A clear story, a crisp demo, a confident ask |

Hard-tech categories the bounty names: AI infrastructure, energy, cyber, defense, aerospace,
emerging tech. **We sit in energy + AI infrastructure + emerging tech (geospatial AI / IoT).**

## The story in one line

> Utah's AI buildout is hitting a water wall, and Utah's yards are the biggest reservoir of water
> we can win back. Overwater.ing measures every lawn in the state from aerial imagery and LiDAR,
> then drives the sprinkler controller itself, so the water saved is measured, not guessed.

## Run of show (~5:00)

1. **0:00–0:40 Problem.**
   - About 60% of Utah's municipal water goes outdoors, mostly on grass.
   - Outdoor watering is 96% of municipal *depletion*, because indoor water returns to the system.
   - Great Salt Lake is near record lows.
   - Data centers are now told they can't add to its depletion.
   - Nobody knows, lot by lot, how much lawn there is or how much it really needs.
2. **0:40–3:10 Live demo** (see Demo below). It carries "progress beyond concept".
3. **3:10–3:50 Hard tech.** One diagram. NAIP 60 cm 4-band imagery → haze-corrected NDVI → Meta
   LiDAR-derived canopy heights (cloud-optimized GeoTIFF range reads) → building footprints →
   per-parcel turf polygons, computed in the browser on Cloudflare's edge.
   - Then gridMET reference ET → FAO-56 turf need → the state's weekly guide → a schedule.
   - Then an open API and calendar → the sprinkler controller (OpenSprinkler today, Rachio next).
   - Claude reads uploaded water bills.
   - A labeling tool collects ground truth for a trained segmentation model.
4. **3:50–4:40 Path to reality, and what $10K unlocks** (see below).
5. **4:40–5:00 Ask and close.** "Type your address at overwater.ing."

## Demo (live; record a backup video in case the Wi-Fi fails)

- Example address: **603 E South Temple** (Governor's Mansion). Never use Adam's own address.
- Steps:
  1. Home page: search → lot page. Lawn outlined on the aerial photo, with sq ft and confidence.
  2. "What it needs": the gallons the lawn needs per year for that county's weather.
  3. Upload the sample bill (`scripts/fixtures/sample_slc_bill.png`). Claude reads it, and the page
     shows the overwatering gap and "do X and save Y gallons a year".
  4. Watering plan (`/watering`): pick spray heads → monthly schedule → **subscribe to the watering
     calendar** (feature in progress, see Status).
  5. **Controller loop**: OpenSprinkler firmware running in demo mode picks up the schedule. This
     week the state guide says "No Watering", so the controller pauses itself. Switch to a July
     week and the minutes change on screen (feature in progress).
  6. "Go native" (`/native`): before and after house illustration, plants, designers.
  7. One-time rebate: the dollars, and which city and water district the lot is in.
- Any Utah address works, measured live: try one outside Salt Lake County.

## Numbers (cite on slides in small print)

| Claim | Number | Source |
|---|---|---|
| Share of Utah M&I water used outdoors | ~60% | USU Extension citing DWR: https://extension.usu.edu/climate/research/water-wise-policies-and-programs-utah ; DWR GSL Basin report Aug 2025: https://water.utah.gov/wp-content/uploads/2025/09/MI-Water-Conservation-Opportunities-Report-09_02_2025.pdf |
| Residential outdoor use, statewide | 500,993 acre-feet/yr | USU Extension citing DWR 2021 (same URL) |
| Outdoor share of M&I *depletion* | 96% | USU ILWA 2025: https://www.usu.edu/ilwa/reports/2025/utahs-future/5b-next-steps-in-municipal-and-industrial-water-in-conservation |
| About half of Utahns overwater | BYU 2022 (Sowby), aerial imagery + bills | https://kutv.com/news/utah-water/byu-study-observes-half-of-utahns-are-watering-their-lawns-too-much |
| Great Salt Lake level | 4,190.4 ft (Aug 2026); healthy range starts at 4,198 ft | Utah News Dispatch; live gauge https://wre-rapps.utah.gov/GSLApp/ |
| Extra inflow GSL needs | 471,000–1,055,000 AF/yr | GSL Strategic Plan: https://greatsaltlake.utah.gov/wp-content/uploads/Great-Salt-Lake-Strategic-Plan.pdf |
| Data centers may not add GSL depletion | Exec. Order 2026-03 (May 29, 2026) | https://rules.utah.gov/wp-content/uploads/Utah-Executive-Order-No.-2026-03.pdf |
| Data center water reporting | HB 76 (2026), ≥75 AF/yr | https://legiscan.com/UT/bill/HB0076 |
| Utah data centers operating | 48 | Deseret News Aug 2026: https://www.deseret.com/politics/2026/08/19/water-saving-data-centers-in-utah/ |
| Stratos (Box Elder) data center | ~987 AF/yr net depletion (project estimate) | SL Tribune Oct 20 2026: https://www.sltrib.com/news/2026/10/20/kevin-olearys-utah-data-center/ |
| Smart controller savings | up to 15,000 gal/home/yr | EPA WaterSense: https://www.epa.gov/watersense/irrigation-controllers |
| Energy to treat and deliver water | ~650 kWh per acre-foot (range 260–880) | EPRI via ACEEE: https://www.aceee.org/files/proceedings/2009/data/papers/6_83.pdf |
| Utah grid carbon intensity | 0.60 kg CO2/kWh (1,322 lb/MWh, 2024) | EIA: https://www.eia.gov/electricity/state/utah/ |
| Turf buyback results | ~3M sq ft converted in 2024, >$7M paid | DWR: https://water.utah.gov/?p=12994 |

Be careful with these claims:
- Don't say "Utah has the highest per-capita use in the nation". The methods differ.
- Water saved only "can increase potential flows" to the lake. It may be reused upstream.
- Energy per home is small (~30 kWh/yr), so pitch energy at district and state scale.

Our own measured numbers:
- **12,791 parcels** precomputed in six Salt Lake City and Sandy neighborhoods: 84102, Avenues,
  Central City, Downtown, Liberty Wells, Sandy. That's **319 acres of lawn**.
- Any other Utah address is measured live in the browser.
- Validation against the state's own Greenspace model (Utah Division of Water Resources, NDVI ≥ 0.15),
  for 84102's 3,104 parcels:
  - Greenspace says 189.2 acres of vegetation. Ours says 170.2 acres of lawn + tree canopy.
  - Per-parcel correlation r = 0.77, median ratio 0.97.
  - Details: `RESULTS.md` Run 7. Jack Hinzman (Senior GIS Analyst, DWRe) pointed us to the data.

## Path to reality and what $10K unlocks (draft, refine with Adam)

Three customers, in order:

1. **Water districts and Utah Water Savers.**
   - They spend money on rebate outreach. We hand them a ranked list of the parcels with the most
     replaceable lawn and the biggest savings. Pilot: one district, metered before and after.
   - Districts named on the site: Central Utah, Jordan Valley, Weber Basin, Washington County, the state program.
2. **Data centers needing water offsets** (EO 2026-03). Hyperscalers already fund "water
   positive" replenishment. We are the per-parcel **measurement, reporting and verification
   (MRV)** layer that turns their money into verified acre-feet: turf conversions plus smart
   controller schedules.
3. **Homeowners**: free. They are the distribution and the ground truth.

Draft $10K budget:
- Statewide precompute and hosting.
- Training a lawn segmentation model on the labels the app collects and the state's Greenspace data.
- A district pilot with meter data.
- Controller integrations (Rachio, Hydrawise partner access).

Already in motion: the DWRe contact. Outreach to districts and controller makers is going out this week; confirm with Adam before claiming any of it.

## Style

- **Palette.** Water blues (#1f86d6, #4cc3f0, #dff3fd), lawn green #2c9a4b, sun #ffc93c, coral
  #e5533f, ink #12324a, sand footer #f7dcae. Backgrounds are light; the app is never dark.
- **Illustrations.** Playful, "Dumb Ways to Die" inspired SVGs in `app/src/lib/art/`:
  - Sprinkler, Grass, Drop, Sun, Coin
  - Arch (Delicate Arch)
  - House (lawn and native states)
  - The Scene in `app/src/lib/Scene.svelte`
- **Logo.** `app/src/lib/Logo.svelte`.
- **Tone.** Friendly, plain words, a little wry. Utah first. Never say "free" as a selling point.

## Demo notes (Oct 28)

- **Sample bill re-sized for the demo lot.** `scripts/fixtures/sample_slc_bill.png` is now sized for the Governor's Mansion (~11k sq ft lawn): about 321k gal outdoors against ~202k needed, so the page shows a gap of ~119k gal and "do X and save Y". Verified on prod: Claude reads all 12 months.
- **Live statewide measurement depends on USDA, and usda.gov's DNSSEC is broken right now.** Validating resolvers can't look up the imagery host. That includes Cloudflare (so our Worker can't reach it), Google 8.8.8.8 and Comcast.
  - The app now falls back to fetching USDA directly from the browser. That works only if the laptop's DNS doesn't validate DNSSEC.
  - **Lead the demo with a precomputed lot (any address in 84102, Avenues, Liberty Wells, Central City, Downtown or Sandy).**
  - Show "any Utah address" second, with a screenshot or recorded fallback ready. If USDA fixes their DNS, it just works again.

## Status of features (update as they land)

- [x] Live site, statewide address search, live measurement, bill reading, watering plan, native page, rebates + jurisdictions
- [x] Greenspace cross-check (RESULTS Run 7)
- [x] Watering calendar you can subscribe to (live). It's on `/watering`, in the card titled "Get this schedule as a calendar". The feed is `webcal://overwater.ing/api/calendar/salt-lake-spray.ics`. It's driven by the state's Weekly Lawn Watering Guide, which is parsed per county.
- [x] Open schedule API (live): `https://overwater.ing/api/schedule/salt-lake-spray`. Add `?date=2027-07-14` to preview a summer week.
- [x] OpenSprinkler connector (live at `/connect`). It's one file, `overwater.ing/connect/opensprinkler.mjs`, tested against OpenSprinkler's real firmware (2.2.1) built in demo mode:
  - Demo: `scripts/opensprinkler-demo.sh` starts the controller at http://localhost:8080 (password `opendoor`; needs Docker on a Mac).
  - Then `scripts/opensprinkler-demo.sh sync` runs this week. The state says no watering in late October, so the program switches off.
  - Then `scripts/opensprinkler-demo.sh sync --date 2027-07-14` previews July: Mon/Wed/Fri at 5:00, 4 × 7 min, 60 min apart, on zones 1–4. The program appears in the OpenSprinkler UI.
- [x] `/impact` page ("Why it matters", in the nav), live. Its numbers are computed from our data:
  - **12,791 lots and 319 acres of lawn measured.** The grass needs ~775 acre-feet a year.
  - Assume half of homes overwater (BYU) and leave a July schedule on all season. That's ~372 AF a year wasted, which costs ~242 MWh and ~145 t CO2 to pump and treat. It's also ~38% of the Box Elder data center campus's expected consumption, from a few neighborhoods alone.
  - Statewide scenario, if a fifth of residential outdoor water is waste: ~100,000 AF a year, ~65 GWh, ~39,000 t CO2, roughly 100× a large AI data center's water.
  - Each lot's plan line now also shows the kWh saved.
- [x] Usage analytics: Cloudflare Web Analytics is collecting. Oct 27: 187 page loads, 95 visits. Ask the Utah Water session for fresh numbers before the pitch.
