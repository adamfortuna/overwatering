# Handoff: Overwater.ing?

Updated 2026-10-27 (Conductor cloud workspace). Deadline: **Wed Oct 28, 5:00 PM Mountain**.
Work goes straight to `main` (Adam asked for no PRs). `RESULTS.md` has the numbers; this file
is the to-do list and the gotchas. The product brief is `README.md` + `RESULTS.md`.

**Name and brand:** Overwater.ing? (domain overwater.ing). Theme is a subtle game show: midnight
"stage" palette, marquee-gold accents, a slow chase of bulbs under the nav, Bricolage Grotesque
display type (self-hosted via @fontsource, so no font CDN), the lot's lawn as **"The reveal"**
(numbers roll up), and the three savings layers as **Door 1 / 2 / 3**. The home page has a
neighborhood **Scoreboard** (totals only; never rank households).

## Getting it running (Mac via Conductor, cloud, or plain shell)

`.conductor/settings.toml` runs `scripts/setup.sh` on workspace creation: checks Node ≥ 20.19,
installs `uv`, makes `.venv` (Python 3.12) with `pipeline/requirements.txt`, `npm ci` in `app/`,
and builds the **84102** dataset if missing (~2 min, needs network). `SETUP_DATASETS="..."`
picks others, `SKIP_DATA=1` skips. Run actions: **dev** (localhost:`$CONDUCTOR_PORT` on the
Mac; 0.0.0.0:5173 in the cloud with `.conductor.show` allowed), **test** (pytest +
svelte-check), **data** (`scripts/build-data.sh`, all datasets, ~10 min).

Cloud: share the dev server with `conductor preview set --port 5173`. Mac: verified on Adam's
machine from a plain clone (`scripts/setup.sh`, then `scripts/dev.sh`). The scripts load nvm and
use `.nvmrc` (22) because Conductor's non-interactive shell had Node 20.15 on PATH, and with no
`app/node_modules` npm fell through to a Ruby `vite` shim from rbenv ("vite dev was called with
arguments").

## Overnight 2026-10-27: retheme, Utah-wide, deployed

Adam asked (before bed) for: Governor's Mansion as the example address (done earlier), a new
light/watery/playful theme with SVG characters, more Utah identity (Delicate Arch), a new
logo, and **any address in Utah**. All committed and deployed to https://overwater.ing.

* **Theme**: Fredoka + Nunito, sky/water palette, sticker cards. `src/lib/art/` has the cast:
  `Sprinkler` (Sprinkles, can be switched off/sleepy), `Grass` (Gramma, a native blue grama
  bunchgrass), `Drop`, `Coin`, `Sun`, `Arch` (Delicate Arch + La Sals). `Scene.svelte` composes
  the home hero (thirsty lawn vs. native landscape under the arch), the inner-page wave strip
  and the footer (Wasatch, arch, sleepy sprinkler, a "UT" sign). `Logo.svelte` = droplet with a
  spray "?" (same drawing as `assets/favicon.svg`). "Doors" became "three ways to save".
* **Any Utah address**: `/api/search?group=0..4&q=` fans out to UGRC `Parcels_<County>_LIR`
  layers (Workers allow 6 concurrent outbound connections per request, so 5 groups of <= 6
  counties, fired in parallel by the browser). Statewide address-point layers skip Salt Lake
  County, so parcels are the index. Picking a hit opens `/u/<County>/<PARCEL_ID>`, which runs
  `src/lib/live.ts` in the browser (see RESULTS Run 6 for the method and the validation table):
  `/api/parcel`, `/api/naip` (USDA PNG proxy, Cloudflare-cached), `/api/naip-info` (flight
  date), `/api/buildings` (UGRC statewide footprints), Meta CHM COGs directly from S3 (CORS ok).
* **Rebates statewide**: `rebate_programs.json` rebuilt from the full Utah Water Savers
  eligibility list (155 cities, 7 programs incl. Weber Basin two tiers and Washington County;
  unincorporated areas of 8 counties mapped by inference). Cities not on the list are shown as
  not eligible (no more $2 statewide fallback). `city_notes` flags inferred tiers.
* **Reference ET statewide**: `app/src/lib/eto_utah.json`, one gridMET point per county
  (`scripts/build-eto.sh`, `pipeline/data/eto_points.csv`), 42 in/yr (Rich) to 70 (St. George).
* Known gaps: UGRC building footprints are 2018 (newer additions read as lawn/other until
  tapped); on-demand haze estimate differs slightly from the pipeline's per-scene value;
  very large parcels (> ~750 m across) are refused; `/api/*` has no rate limiting.

## 2026-10-27 (day 2): watering plan

* Step 1 is now "1 · Today" (Adam: "free" implied something else costs money); "free" also
  dropped from the home kicker.
* With a bill entered, step 1 adds **"Optimize your watering for next year"**: one action and
  its gallons a year (`headline()` in `src/lib/watering.ts`, assuming spray heads + a basic
  timer), linking to **`/watering`** (`?lawn&eto&out&back`). That page: choose sprinkler type
  (spray / rotor / rotary nozzle / hose-end) and controller (timer / smart / by hand), get the
  top fix with gallons saved, a bill-vs-well-run-system chart by month, a month-by-month
  schedule (days a week, cycle-and-soak minutes per zone) from local reference ET, and more
  fixes ranked by gallons. Typical precipitation rates and distribution uniformity per
  sprinkler type are ballpark industry values (in `SYSTEMS`); savings = bill minus a well-run
  system (or the "set for July, leave it all season" habit when there's no bill), plus the
  evenness gain from spray -> rotary nozzles. Cited: EPA WaterSense (broken head up to 25,000
  gal/season), Utah Water Savers smart controller rebate up to $100 (checked 2026-10-27),
  Utah's Weekly Lawn Watering Guide.

## 2026-10-27 (day 2): /native

* "Go native" (step 3 on lots, and the home teaser) links to **`/native`**
  (`?lawn&eto&city&county&back`): before/after SVG of a bungalow (`src/lib/art/House.svelte`,
  lawn + Sprinkles + sidewalk runoff vs. natives, mulch, boulders, drip, Gramma) with the lot's
  gallons, then six steps: get approved first (with this lot's program, rate and apply link),
  design it (YardFarmer as the example; Silver Sage Xeriscape & Design; Localscapes for DIY;
  plus Conservation Garden Park plans and USU's water-wise plant list), remove the grass,
  plant natives (six Wasatch Front natives), re-plumb to drip or cut run times, finish and get
  paid. Program-rule specifics are attributed to Central Utah's program (the one we verified).
  Expert sites checked live 2026-10-27; YardFarmer showed consults booking into January 2027.
* Plant cards have photos: Wikimedia Commons images (public domain / CC BY / CC BY-SA),
  resized to 480x360 in `app/static/plants/`, credited and linked per card from
  `app/src/lib/plant_photos.json`. Seven natives incl. western yarrow (it's in the drawing).

## 2026-10-27 (day 2): rebate card shows the jurisdiction

* `/api/jurisdiction?lon&lat`: municipality (UGRC UtahMunicipalBoundaries; `COUNTYNBR` is the
  alphabetical county number), retail culinary water provider and wholesale districts (Utah
  DWRe `CulinaryWaterServiceAreas` + `WholesaleCulinaryWaterSuppliers`). Cached a day.
* The rebate card's "where" box lists City (with an on-the-list / not-on-the-list pill), Water
  from (provider + districts), Program, and "Also here" (statewide $100 smart controller rebate).
  Rebate eligibility now resolves from the **municipality boundary** at the lot's centroid
  (falls back to the dataset/parcel city), which fixes mailing-city mismatches; no municipality
  = unincorporated, resolved by county. Example: part of Millcreek drinks Salt Lake City water
  but is eligible through Millcreek's listing.

## 2026-10-27 (day 2): state Greenspace model

DWRe (Jack Hinzman, jackhinzman@utah.gov) replied with the public Greenspace data. Compared
in RESULTS Run 7 (`pipeline/greenspace.py`): totals agree with our lawn + canopy, but
Greenspace doesn't separate turf from trees. Not yet shown in the app. Options: show "state
Greenspace model: X sq ft green on this lot" as a cross-check on prebuilt datasets (cheap: add
`gs_sqft` to parcels.json), and/or a district-level comparison. Unanswered from Adam's email:
before/after imagery for verification, and preferred "get approved first" wording.

## Next session (start here)

Run `scripts/resume.sh` first. It checks that `EXTERNAL_ANTHROPIC_API_KEY`,
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set **and accepted** (exits 1 in
seconds if not, so hand control straight back to Adam), warns if the Cloudflare token can't
read D1/R2, then installs deps and builds any missing datasets (~10 min). Then:

0. **Status 2026-10-27 late:** bill reading verified with the real key (sample bill: all 12
   months, unit ccf, 6.5 s). Adam's Mac has a clean checkout at `~/Code/utah-water` (setup ran,
   84102 built, dev server on http://localhost:5173; other datasets built in the background,
   log `/tmp/overwater-data.log`). Don't run the app from Conductor's synced folder
   (`~/conductor/remote-workspace-sync/...`): it has tracked files only, and Mac-side installs
   there may be clobbered by the sync. Local bill reading needs `app/.env` with the key.
1. **Bill reading, for real.** Start dev (`cd app && npm run dev`), upload
   `scripts/fixtures/sample_slc_bill.png` (synthetic SLC bill, CCF, Oct 2025–Sep 2026; expected
   months 12,7,6,6,6,7,10,18,28,32,30,22) on any parcel page, or
   `curl -F "file=@scripts/fixtures/sample_slc_bill.png;type=image/png" localhost:5173/api/bill`.
   Check unit = ccf and all 12 months; then try a real bill photo if Adam has one.
2. **Local demo with Adam** (he wants to see it run before any deploy). Confirm his Mac
   workspace's setup script and dev action work.
3. **Deploy**: done, live at https://overwater.ing (Step 2). The old token could list Workers scripts
   but got "Authentication error" on D1, R2 and billing; `resume.sh` reports what the new one
   can do. overwater.ing is an active zone on the same account (Free Website plan).
4. **Validation** when Adam has the tape numbers: `docs/validation/worksheet_816_s_600_e.png`
   (regenerate: `python -m pipeline.worksheet --parcel 16072770170000 --out ...`; the default parcel is now the Governor's Mansion) letters each detected patch with our L x W, so
   he only measures two sides per patch. Then Step 1 below.

Run-button gotcha: Conductor's Mac app runs a *cloud* workspace's dev action in the synced
folder (`~/conductor/remote-workspace-sync/utah-water/main`, tracked files only) and kept a
cached, older command. So `npm run dev` itself (`scripts/app-dev.sh`) now handles Node, first-run
setup and project-local Vite; the synced folder on Adam's Mac has been set up.

Env gotchas learned 2026-10-27:
* Conductor fixes a workspace's env when the VM starts. A variable saved empty (or changed
  later) stays empty in every process; a new workspace is the fix.
* An **empty** `EXTERNAL_ANTHROPIC_API_KEY` in the process env shadows `app/.env` (Vite's
  `loadEnv` lets process env win). The dev run action unsets it when empty. The key is
  declared in `app/src/env.ts` (SvelteKit 3 `defineEnvVars`) and imported from
  `$app/env/private`; there is no `$env/dynamic/private` in SvelteKit 3.
* Vite's process shows up as `MainThread`, not `node`, so `pgrep -x node` misses it; and any
  `pkill -f vite` pattern also matches the agent's own shell. Kill by port or by cmdline while
  skipping `bash`.

**Example address = the Governor's Mansion** (Kearns Mansion, 603 E South Temple, parcel
09314870040000; Adam doesn't want the app built around his own address). It's
"Tax Exempt - Government", so `scripts/build-data.sh` keeps it via `--keep-parcels` in the 84102
and Avenues runs; it's the search placeholder, the 84102 `--address` report, the worksheet
default and the sample bill's service address. Adam's lot only appears in the validation
material (opt-in via `ADDRESS=`).

## State in one table

| Piece | Status | Where |
|---|---|---|
| Datasets | **84102, Central City, Liberty Wells, Downtown, Avenues, Sandy** (12.8k searchable addresses) | `scripts/build-data.sh`, `app/static/data/` (gitignored) |
| Neighborhood AOIs | SLC community council polygons + UGRC 84102 zip, clipped to residential extent | `pipeline/aoi.py`, `pipeline/data/aoi/*.geojson` |
| Pipeline | `--aoi <id>` polygon runs; USDA imagery in 2048 px tiles (bigger tiles 500) | `pipeline/run_spike.py`, `imagery.py` |
| Imagery | NAIP 2024 (2024-07-07) via USDA `conus_naip`, haze-corrected NDVI | see `RESULTS.md` |
| Reference ET | SLC table added (50.4 in/yr, gridMET 2023–25); Sandy stays 54.0 | `pipeline/data/eto_slc_ut.json`, app `etoFor()` |
| 816 S 600 E | 1,355 sq ft lawn + 1,739 under trees (84102 run) | `RESULTS.md` Run 5 |
| Validation vs Adam's tape | **Not done: waiting on the measurement** | Step 1 |
| Rebate table | Verified 2026-10-27 | Step 3 |
| App | Rebranded; cross-neighborhood search; `/how`; check clean; build OK | `app/` |
| Bill reading | Route reads `EXTERNAL_ANTHROPIC_API_KEY` (`app/src/env.ts`), `claude-opus-5-5` via `beta.messages.parse` with `fallbacks: 'default'`; typed errors fall back to manual entry | `app/src/routes/api/bill/+server.ts` |
| Bill reading tested? | **Yes** with the real key (cloud): all 12 months + unit from the sample bill in 6.5 s | `scripts/fixtures/sample_slc_bill.png` |
| Cloudflare deploy | **Live at https://overwater.ing** | Step 2, `scripts/deploy.sh` |

## Step 1: Adam's lot validation (the number the pitch needs)

Waiting on Adam's tape measure for **816 S 600 E** (parcel 16072770170000, 6,997 sq ft). Ask
for: total grass, **grass under trees separately**, and whether the park strip was included.

```bash
ADDRESS="816 S 600 E" TRUTH_SQFT=<tape> scripts/build-data.sh 84102
```

That adds `validation.error_pct` to `data/out/84102/summary.json` (compares `lawn_sqft`).
Record it in `RESULTS.md` plainly, including a miss of the ±20% target:

* tape (lawn in sun) vs `lawn_sqft` **1,355** (range 1,073–1,588)
* tape (all grass incl. under trees) vs `green_sqft` **2,660** and `lawn + canopy` **3,094**
* If the under-canopy share is large, options: count a fraction of residential canopy as
  lawn, lower `CANOPY_MIN_M`, or use the leaf-off 2021 NAIP (November) to see grass under
  deciduous trees (`docs/spike/naip2021_leaf_off_vs_cir.jpg`).
* Park strip: **outside** the parcel (right-of-way), visibly green. Counting it needs a strip
  polygon between the parcel front line and the curb. Not built.

## Step 2: deploy (done 2026-10-27)

**Live at https://overwater.ing** (Worker `overwater`, custom domain; also
`overwater.patient-thunder-b4e3.workers.dev` if workers.dev is enabled). Redeploy with
`scripts/deploy.sh` (`--secret` re-stores the Anthropic key). Verified live: all pages, all six
datasets, bill reading (sample bill, 5 s), corrections into D1 `lawn-labels`
(`ac728bc5-89c3-4317-9a8a-c8066185f68e`; test row deleted).

Things that broke on first deploy (adapter-cloudflare 8 / SvelteKit 3):
* **Server-side fetches of `/data/*` static assets fail** on Workers, so SSR loads threw
  (parcel/district 500) or silently shipped empty data (home). Fixed with `ssr = false` in
  `src/routes/+layout.ts`; the app is client-rendered and reads `/data` straight from assets.
* **`platform` is not passed** to requests any more; bindings come from
  `import { env } from 'cloudflare:workers'` (the adapter emulates it in dev with a local D1;
  `scripts/setup.sh` applies `schema.sql` locally). Minimal types in `src/cloudflare.d.ts`.
* Secrets: `$app/env/private` reads the Worker secret at runtime. Build with the key unset;
  `deploy.sh` refuses to deploy if the key shows up in the bundle.
* Cross-site POSTs are rejected by SvelteKit's CSRF check; curl tests need `-H "Origin: https://overwater.ing"`.
* The account is on Workers Paid (25.8k asset files accepted). Upload of everything took ~45 s;
  redeploys only upload changed files.
* `/api/labels` is a public, unauthenticated write. Inputs are validated (class enum, lengths),
  but there is no rate limit. Add Cloudflare rate limiting if it gets abused.

## Step 3: rebate follow-ups (table itself is verified)

Verified on primary pages 2026-10-27 (URLs and quotes in each row's `source`):

* **Sandy and Salt Lake City → CUWCD standard program, $3.00/sq ft**, 200 sq ft min, $50,000
  per-property cap. (Old table had Sandy under JVWCD and SLC as its own $1–3 row: both wrong.)
  SLC has no separate per-sq-ft program; its FAQ points to utahwatersavers.com.
* JVWCD member cities (Draper, Midvale, West Jordan, ...): $3.00, no cap stated.
* CUWCD rural (Provo, Orem, ...): $1.50. Statewide DWR track: **$2.00** (was $1.00), $50k cap.
* Both Sandy and SLC are on the portal's eligibility list (qualifying ordinance).
* No park-strip-specific rate on any program page.

Still open: cities not on any row (Holladay, Cottonwood Heights, Kearns, Magna, South Salt
Lake, ...) fall back to the $2.00 statewide row, which may be wrong for them; check the
eligibility list (`https://www.utahwatersavers.com/program-eligibility-page`, 3 pages) before
adding datasets there. Provider-by-polygon (UGRC culinary water service areas) still not built.
Keep the two JSON copies in sync.

## Step 4: demo polish (if time)

* Hillside lots in the upper Avenues: native scrub under 2.5 m can read as lawn. Spot-check a
  few parcels there before quoting Avenues totals.
* The parcel map is 4:3; very wide or tall lots leave dark bands. Fine for the demo.
* Downtown has only 36 parcels: condo units are tiny stacked polygons (dropped by the 800 sq ft
  floor) and apartments aren't `PROP_CLASS = Residential`. The dataset note says so.
* Edge parcels: `run_spike` now keeps only parcels wholly inside the AOI. Before, a parcel cut
  by the image edge had its sliver's lawn fraction scaled to the full parcel, inflating totals
  (Sandy 13.4 → 10.7 acres, 84102 10.5 → 7.6). Enlarge the bbox if a wanted lot gets dropped.

## App notes and gotchas

* MapLibre 6 ships its worker as a separate module; the bundler mangled the URL, so
  `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` are copied into `app/static/ml/` and
  `setWorkerUrl('/ml/maplibre-gl-worker.mjs')` is called before `new Map`. If you bump
  maplibre-gl, re-copy both files.
* The parcel map has no basemap on purpose: the pipeline's RGB crop is the base (image source
  with four WGS84 corners from `parcels.json`), regions are a GeoJSON fill layer. No address
  leaves the app for a tile provider.
* Tap cycle is `lawn → other → converted → canopy`; buildings are not tappable. The
  `ParcelMap.svelte` effect reads `regions` before touching the map so it tracks the prop even
  before load (this was a real bug).
* `app/src/lib/data.ts::DATASETS` is the registry of dataset names/notes/ETo; which ones show
  up is driven by `/data/index.json` (written by `pipeline.app_index` at the end of
  `scripts/build-data.sh`), so unbuilt datasets just don't appear. The index also carries
  `[address, dataset, parcel_id, lawn_sqft]` for the home-page search (~0.6 MB for 12.8k addresses).
* 84102 overlaps Central City and East Central; search dedupes by parcel id (first dataset
  wins, which is 84102 by sort order).
* Bill route in dev: SvelteKit server code reads `process.env.EXTERNAL_ANTHROPIC_API_KEY`
  (Vite dev runs in Node), `platform.env` in Workers. Restart the dev server after changing it.
* Corrections: `POST /api/labels` `{dataset, parcel_id, region_index, cls, original_cls}`;
  `GET` returns the latest label per region. Client mirrors to `localStorage`.
* Svelte 5 runes, SvelteKit 3, Vite 8, adapter-cloudflare 8. `npm run check`: 0 errors,
  3 warnings (autofocus, two `state_referenced_locally`). It was *not* clean before 2026-10-27:
  `#lib/*` subpath imports need explicit `.ts` extensions for TypeScript (`'#lib/data.ts'`),
  and `@types/node` / `@types/geojson` were missing.
* npm 11 holds back install scripts for `esbuild` and `workerd` (wrangler's runtime). Dev and
  `npm run build` work without them; if `wrangler dev`/`deploy` complains, run
  `npm install-scripts approve workerd esbuild`.
* Re-running `scripts/setup.sh` (it does `npm ci`) under a running dev server leaves Vite with
  stale optimized deps ("504 Outdated Optimize Dep", blank maps). Restart the dev server.
* Headless screenshots: Chrome's `--virtual-time-budget` stalls the MapLibre worker so the maps
  look empty. Use puppeteer with a real wait (worked fine).
* Phase 2 items from `CLAUDE.md` not built: before/after NAIP-year comparison for a converted
  lot (stretch), photo-based classification/evidence packet (discussed, not built), 3D view
  (explicitly deferred).

## Pipeline notes and gotchas

* Areas: parcel area comes from the geometry in UTM 12N (`EPSG:26912`); fractions come from
  pixels. So imagery in Web Mercator (the Philly mosaic) does not inflate areas.
* Imagery CRS is whatever the source uses (NAIP UTM 12N, Sentinel UTM 32612, Philly 3857);
  parcels and buildings are reprojected to it for rasterising.
* `export_app.py` is slow-ish (~100 s per 2,000 parcels) because it writes a crop PNG and
  vectorises regions per parcel. Fine for a neighborhood.
* `run_spike.py --save-rasters` writes `ndvi.tif` and `classes.tif` (0 other, 1 lawn, 2 canopy,
  3 building) for QA in QGIS.
* NDVI on uint8 imagery applies dark-object subtraction (`Imagery.ndvi()` in `common.py`).
  Sentinel-2 L2A (float reflectance) is left alone. If you add a new uint8 source, it gets this
  automatically.
* Cache downloads go through `common.download()` (temp file + rename). Before that, two
  concurrent runs left a truncated `meta_chm_v2_tiles.parquet` that broke every later run.
  Still: don't run two pipelines at once on the 8 GB cloud box; peak RSS is ~4 GB.
* GDAL through a proxy: `imagery._gdal_proxy_env()` copies `HTTPS_PROXY` and CA bundle vars into
  GDAL's config. Harmless locally.
* Lidar: `usgs-lidar-public` on S3 has Utah 2020–2022 EPT point clouds (`UT_WestEast_*_B22`,
  `UT_StatewideNCentral_*_2020`) if a better tree/turf split than the Meta CHM is ever needed.
  Not used.

## Git hygiene

Work directly on `main`, small commits (Adam asked for no PRs). `data/`, `.venv/`,
`app/static/data/` are ignored; pitch images live in `docs/spike/`.

## Open questions for Adam

1. Tape-measured lawn sq ft for 816 S 600 E, with under-tree grass separately, and whether the
   park strip was included.
2. `EXTERNAL_ANTHROPIC_API_KEY` is empty in the cloud workspace: re-set it in Conductor (and
   for the local run, make sure the dev server's environment has it).
3. Is overwater.ing's DNS zone on the same Cloudflare account? Paid Workers plan (asset count)?
