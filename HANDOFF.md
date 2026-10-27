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

Cloud: share the dev server with `conductor preview set --port 5173`. Local runs have **not**
been verified on a Mac yet (only the local-mode dev command was smoke-tested here).

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
| Bill reading | Route uses `EXTERNAL_ANTHROPIC_API_KEY`, `claude-opus-5-5` via `beta.messages.parse` with `fallbacks: 'default'`; typed errors fall back to manual entry | `app/src/routes/api/bill/+server.ts` |
| Bill reading tested? | **Wiring only**: the var is set in Conductor but **empty** in this workspace, so a dummy key was used to confirm the request reaches the API (401). Sample bill for a real test: `.context/bill/sample_slc_bill.png` (not committed) | |
| Cloudflare deploy | **Not started on purpose**: Adam wants a local demo first. `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` are present | Step 2 |

## Step 1: Adam's lot validation (the number the pitch needs)

Waiting on Adam's tape measure for **816 S 600 E** (parcel 16072770170000, 6,997 sq ft). Ask
for: total grass, **grass under trees separately**, and whether the park strip was included.

```bash
TRUTH_SQFT=<tape> scripts/build-data.sh 84102
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

## Step 2: deploy (after the local demo)

Credentials are in the workspace env. Rough plan:

```bash
cd app && npm run build
npx wrangler d1 create lawn-labels        # paste database_id into wrangler.jsonc
npx wrangler d1 execute lawn-labels --remote --file=schema.sql
npx wrangler secret put EXTERNAL_ANTHROPIC_API_KEY
npx wrangler deploy                       # worker name is "overwater"
```

Then the custom domain overwater.ing (is the zone on this Cloudflare account?).

**Asset limits:** the six datasets are ~305 MB in ~25.8k files (a crop PNG + regions GeoJSON
per parcel). Workers static assets allow 100,000 files per version on the **paid** plan but
20,000 on free; 25 MiB per file either way. If the account is on free, or for headroom, put
`app/static/data/` in R2 and serve it from the worker (or pack regions per dataset).
Without D1 the labels route returns 501 and corrections stay in localStorage.

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
