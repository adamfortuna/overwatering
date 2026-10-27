# Handoff: Utah Lawn Water Lens

Written 2026-10-26 evening (MDT). Deadline: **Wed Oct 28, 5:00 PM Mountain**. Branch: `spike/phase-0`
(all work is there; `main` is the empty initial commit). Read `CLAUDE.md` for the product brief and
judging criteria, `RESULTS.md` for numbers so far. This file is the to-do list and the gotchas.

## Why this handoff exists

The previous session ran in a cloud sandbox whose network policy blocked every NAIP imagery host
and UGRC's parcel services. Everything that could be done without them is done and tested. The
local agent has full network and should start with the two blocked steps below.

## State in one table

| Piece | Status | Where |
|---|---|---|
| Python pipeline (parcels → footprints → 4-band imagery → NDVI → canopy removal → per-parcel lawn sq ft, overlays, app export) | Working end to end | `pipeline/` (`python -m pipeline.run_spike --help`) |
| Utah parcels, Sandy fabric (SLCo Recorder mirror, public S3) | Working | `--parcels sandy` |
| Utah parcels via UGRC SLCo Parcels LIR feature service | Written, **never run** (host was blocked) | `--parcels ugrc`, `pipeline/parcels.py::_fetch_ugrc` |
| Overture building footprints (public S3) | Working, cached in `data/raw/` | `pipeline/buildings.py` |
| Meta 1 m canopy height model (public S3) | Working | `pipeline/canopy.py` |
| NAIP 60 cm via Planetary Computer STAC | Written, **never run** (host was blocked) | `--imagery pc`, `pipeline/imagery.py::fetch_naip_pc` |
| NAIP code path validated on real 4-band NAIP | Done, Philadelphia 23 cm with real parcels/footprints | `RESULTS.md` Run 1 |
| Sentinel-2 10 m fallback for Utah | Working, indicative only | `--imagery sentinel2` |
| Water math (FAO-56 ETo from gridMET, bill math, three savings layers) | Done, 20 tests pass | `pipeline/water.py`, `savings.py`, `eto_table.py`, `pipeline/tests/` |
| Saved rebate table + provider resolution | Done, **rates unverified** | `pipeline/data/rebate_programs.json`, `pipeline/rebates.py`, `app/src/lib/rebates.ts` |
| SvelteKit app (search, tap-to-cycle parcel map, savings card, bill upload, district heat map, labels API) | Built and browser-tested | `app/` |
| Cloudflare deploy (Workers + D1 + secret) | Not done | `app/wrangler.jsonc`, `app/schema.sql` |
| Validation vs Adam's measured lawn | **Not done** (needs NAIP + parcel + measurement) | see Step 2 |

## Step 1: get the real 60 cm Utah run (first thing to do)

```bash
pip install -r pipeline/requirements.txt
# Sandy neighborhood used for all numbers so far (497 residential parcels):
python -m pipeline.run_spike --bbox -111.875 40.565 -111.865 40.573 --parcels sandy \
  --imagery pc --out data/out/sandy_naip --save-rasters
```

Then compare `data/out/sandy_naip/summary.json` to the Sentinel-2 run in `RESULTS.md` Run 2 and
look at a dozen `overlays/*.png`. Things to check on first NAIP contact:

* `fetch_naip_pc` prefers `naip:year` 2024, then 2023, 2022, 2021. Confirm which year came back
  and that the items share a CRS (they should, UTM 12N). If 2024 Utah is not on Planetary
  Computer, 2021 is acceptable; say so in the UI (`imagery_date` is already surfaced).
* NDVI threshold is 0.30 with a ±0.05 sensitivity band. On NAIP uint8 this is a reasonable start;
  if overlays show shrub beds counted as lawn, try 0.35. Brown August lawns will drop out.
* Canopy cut-off is 2.5 m (`pipeline/lawn.py::CANOPY_MIN_M`). Everything under tree crowns lands
  in `canopy_sqft`, not `lawn_sqft`. `green_sqft` is the upper bound including canopy.
* Building footprints are buffered 0.5 m.

Swap the app's Sandy data for the NAIP export:

```bash
rm -rf app/static/data/sandy && cp -r data/out/sandy_naip/app app/static/data/sandy
```

and update the Sandy entry's `note` in `app/src/lib/data.ts` (it currently says Sentinel-2).

## Step 2: Adam's lot validation (the number the pitch needs)

Address: **816 S 600 E, Salt Lake City, UT 84102**. Overture address point: lon **-111.87428**,
lat **40.75143**. This is outside the Sandy fabric, so parcels must come from UGRC.

```bash
python -m pipeline.run_spike --center -111.87428 40.75143 --radius-m 400 --parcels ugrc \
  --imagery pc --out data/out/home --address "816 S 600 E" --truth-sqft <Adam's measurement>
```

* `--parcels ugrc` hits `services1.arcgis.com/.../Utah_Salt_Lake_County_Parcels_LIR/FeatureServer/0`.
  It has never run: check the returned field names against the `ugrc_lir` map in
  `pipeline/parcels.py::COLUMN_MAPS` (`PARCEL_ID`, `PARCEL_ADD`, `PROP_CLASS`, `BUILT_YR`,
  `BLDG_SQFT`) and fix if UGRC renamed anything. Overture buildings for this bbox are already
  cached in `data/raw/` if that directory is carried over; otherwise they refetch in ~30 s.
* Adam measures tomorrow. His description: most of the front yard, the park strip between sidewalk
  and curb, and most of the back yard are grass; trees over grass. **Ask him for the under-tree
  grass area separately.** Compare three numbers to his tape: `lawn_sqft`, `green_sqft`, and
  `lawn_sqft + canopy_sqft`. If the under-canopy share is large in this neighborhood, consider
  counting a fraction of canopy over residential lots as lawn, or lowering `CANOPY_MIN_M`.
* Note whether the parcel polygon includes the park strip (SLCo parcels usually stop at the
  property line; the strip is public right-of-way and may need its own handling).
* `summary.json` gets a `validation` block with `error_pct`. Put the result in `RESULTS.md`
  plainly, including if it misses the ±20% target.
* Add a `home` dataset to `app/src/lib/data.ts` (`city: 'Salt Lake City'`, `utah: true`) and copy
  `data/out/home/app` to `app/static/data/home`.

Optional experiment Adam asked about: when he measures, have him take 5–6 yard photos. Run three
estimates (vision model blind on photos; model given photos plus the aerial overlay; pipeline
alone) and tabulate against the tape in `RESULTS.md`. Expectation: the model is good at
"is this live grass / artificial turf / under-tree grass" and poor at area.

## Step 3: rebate table verification

`pipeline/data/rebate_programs.json` (copied to `app/src/lib/`) has four rows, all
`verified: false`, compiled from secondary sources because `utahwatersavers.com` was unreachable.
Check on https://www.utahwatersavers.com/landscapeincentiveprogram and provider pages:

* Salt Lake City Department of Public Utilities rate, min, cap (SLC has also run its own
  "Landscape Leadership Grant"; find out whether SLCDPU customers use the state portal).
* Jordan Valley WCD member-city rates (Sandy).
* Whether Sandy City and Salt Lake City have the qualifying landscape ordinance (they were listed
  as eligible in 2023).

Set `verified: true` and `last_checked` once confirmed. Keep the JSON in both places in sync
(or import from one; the app copies it at `app/src/lib/rebate_programs.json`).

Better provider resolution than city name: UGRC SGID has a retail culinary water service areas
layer; point-in-polygon on the parcel centroid gives the provider. Not built.

## Step 4: deploy

```bash
cd app && npm install && npm run build
npx wrangler d1 create lawn-labels        # paste database_id into wrangler.jsonc
npx wrangler d1 execute lawn-labels --file=schema.sql
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

`wrangler.jsonc` already has the Workers assets + D1 binding stanza. The labels route returns
501 without D1 and the client falls back to localStorage, so a deploy without D1 still demos.
The bill route uses `@anthropic-ai/sdk` `messages.parse` with a Zod schema (model
`claude-opus-5-5`); it returns 501 without the key and the UI shows a manual 12-month grid.

Static data sizes: Philadelphia export is ~78 MB (1,940 crops); Sandy ~5 MB. Workers static
assets limit is 25 MiB per file and 20k files, so the Philly set is fine but consider trimming to
the residential sub-bbox or dropping it from the deploy. For the pitch, Sandy at 60 cm plus the
home neighborhood is what matters.

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
* Corrections: `POST /api/labels` `{dataset, parcel_id, region_index, cls, original_cls}`;
  `GET` returns the latest label per region. Client mirrors to `localStorage`.
* Svelte 5 runes, SvelteKit 3, Vite 8, adapter-cloudflare 8. `npm run check` is clean except
  for whatever svelte-check reports on the JSON imports (none seen).
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
* GDAL through a proxy: `imagery._gdal_proxy_env()` copies `HTTPS_PROXY` and CA bundle vars into
  GDAL's config. Harmless locally.
* Lidar: `usgs-lidar-public` on S3 has Utah 2020–2022 EPT point clouds (`UT_WestEast_*_B22`,
  `UT_StatewideNCentral_*_2020`) if a better tree/turf split than the Meta CHM is ever needed.
  Not used.

## Git hygiene

Two early commits tracked exported PNGs under `data/out` (~80 MB) before the ignore rule was
fixed; they are untracked now. Squash the branch before merging to `main` to drop them from
history. Commit messages so far carry the session attribution lines; keep committing small.

## Open questions for Adam

1. Measured lawn sq ft for 816 S 600 E, with the under-tree grass noted separately, and whether
   the park strip was included.
2. Which rebate rate applies to SLCDPU customers (confirm on the portal).
3. Does the demo lead with Sandy (suburban, clean lots) or the 84102 neighborhood (older lots,
   more trees, Adam's own address)? Both can be loaded as datasets.
