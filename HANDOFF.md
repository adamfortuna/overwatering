# Handoff: Utah Lawn Water Lens

Updated 2026-10-27 (Conductor cloud workspace). Deadline: **Wed Oct 28, 5:00 PM Mountain**.
Everything is on `main` now (the `spike/phase-0` branch was squashed in, dropping the ~80 MB of
PNGs its early commits tracked). `RESULTS.md` has the numbers; this file is the to-do list and
the gotchas. There is no `CLAUDE.md` in the repo (the old handoff referred to one); the product
brief lives in `README.md` + `RESULTS.md`.

## Getting it running (Conductor or anywhere)

`.conductor/settings.toml` runs `scripts/setup.sh` on workspace creation: installs `uv`, makes
`.venv` (Python 3.12) with `pipeline/requirements.txt`, `npm ci` in `app/`, and builds the two
app datasets if `app/static/data/` is empty (~2 min, needs network; `SKIP_DATA=1` to skip).
Run actions: **dev** (Vite on `$CONDUCTOR_PORT` or 5173, bound to 0.0.0.0, `.conductor.show`
allowed), **test** (pytest + svelte-check), **data** (`scripts/build-data.sh`).

In a cloud workspace, share the dev server with `conductor preview set --port 5173`.

## State in one table

| Piece | Status | Where |
|---|---|---|
| Python pipeline | Working end to end on 2024 60 cm Utah NAIP | `pipeline/`, `scripts/build-data.sh` |
| Imagery | **NAIP 2024 (2024-07-07) via USDA `conus_naip` ImageServer**, default `--imagery usda` | `pipeline/imagery.py::fetch_naip_usda` |
| Planetary Computer NAIP | Works, but Utah ends at 2021 = November leaf-off; 2018 is the newest summer scene | `--imagery pc [--naip-year 2018]` |
| NDVI haze correction | Dark-object subtraction for uint8 NAIP; keeps the 0.30 threshold valid on hazy 2024 | `pipeline/common.py::Imagery.ndvi` |
| Utah parcels, Sandy fabric | Working | `--parcels sandy` |
| Utah parcels, UGRC SLCo LIR | **Working** (URL fixed to `Parcels_SaltLake_LIR`; field map was right) | `--parcels ugrc` |
| Overture footprints, Meta CHM | Working | `pipeline/buildings.py`, `canopy.py` |
| Sandy at 60 cm | **Done**: 10.7 lawn acres / 415 parcels (S2 said 33.2 for the same parcels) | `RESULTS.md` Run 3 |
| 84102 at 60 cm incl. 816 S 600 E | **Done**: lot = 1,329 sq ft lawn + 1,757 under trees | `RESULTS.md` Run 4 |
| Validation vs Adam's tape | **Not done: waiting on the measurement** | Step 1 below |
| Water math | Done, 18 tests pass | `pipeline/water.py`, `savings.py`, `pipeline/tests/` |
| Rebate table | **Verified 2026-10-27** against provider pages (rates changed, see Step 3 notes) | `pipeline/data/rebate_programs.json` (+ app copy) |
| SvelteKit app | Runs in Conductor with `sandy` + `home` datasets; `npm run check` clean; build OK | `app/` |
| Cloudflare deploy | **Not done**: no Cloudflare login or `ANTHROPIC_API_KEY` in the workspace | Step 2 below |

## Step 1: Adam's lot validation (the number the pitch needs)

Pipeline side is done. Waiting on Adam's tape measure for **816 S 600 E** (parcel
16072770170000, 6,997 sq ft). Ask for: total grass, **grass under trees separately**, and
whether the park strip was included.

```bash
TRUTH_SQFT=<tape> scripts/build-data.sh home
```

That adds `validation.error_pct` to `data/out/home/summary.json` (compares `lawn_sqft`). Then
record in `RESULTS.md` Run 4, plainly, including a miss of the ±20% target:

* tape (lawn in sun) vs `lawn_sqft` **1,329** (range 1,025–1,595)
* tape (all grass incl. under trees) vs `green_sqft` **2,578** and `lawn + canopy` **3,086**
* If the under-canopy share is large (likely: 35% of pixels in 84102 are canopy ≥2.5 m),
  options are: count a fraction of residential canopy as lawn, lower `CANOPY_MIN_M`, or use
  the leaf-off 2021 NAIP (November) to see grass under deciduous trees (lawns are faint
  but visible in its CIR, see `docs/spike/naip2021_leaf_off_vs_cir.jpg`).
* Park strip: confirmed **outside** the SLCo parcel polygon (it is right-of-way). It is visibly
  green in the imagery. Counting it means a strip polygon between parcel front line and curb
  (e.g. buffer the street-facing parcel edge to the Overture/UGRC road edge). Not built.

Optional photo experiment (unchanged): 5–6 yard photos, three estimates (model blind on
photos; model with photos + overlay; pipeline alone), tabulate against the tape.

## Step 2: deploy

Not possible from the workspace without credentials. Adam (or an agent given a
`CLOUDFLARE_API_TOKEN` + `ANTHROPIC_API_KEY`):

```bash
cd app && npm run build
npx wrangler d1 create lawn-labels        # paste database_id into wrangler.jsonc
npx wrangler d1 execute lawn-labels --remote --file=schema.sql
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Static data is `app/static/data/{sandy,home}` (~18 MB + ~14 MB, gitignored, built by
`scripts/build-data.sh`). Well inside Workers' asset limits. Without D1 the labels route
returns 501 and the client falls back to localStorage; without the key the bill route returns
501 and the UI shows the manual 12-month grid. So a bare `wrangler deploy` still demos.

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

* Decide lead dataset (open question 3). Sandy has cleaner lots; 84102 is Adam's own block and
  shows the canopy problem honestly.
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
* Datasets in `app/src/lib/data.ts`: `sandy` and `home` (84102). The Philadelphia dataset was
  dropped from the list: its inputs were local files from the earlier sandbox and cannot be
  regenerated here, and it is not part of the Utah pitch.
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
2. Does the demo lead with Sandy or the 84102 neighborhood? Both are loaded.
3. Cloudflare account/token for deploy (and an Anthropic key for bill parsing), or will you
   deploy yourself?
