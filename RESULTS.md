# Spike results (Phase 0)

Status as of 2026-10-27, run from a cloud sandbox with restricted outbound network.

## TL;DR

* The lawn-detection pipeline (parcels → building footprints → 4-band NAIP → NDVI → canopy
  removal → per-parcel lawn sq ft + overlay PNG) **runs end to end on real data**.
* **Real Utah parcels and footprints are in**: 497 residential parcels in Sandy, Salt Lake County
  (Salt Lake County Recorder fabric with tax-roll attributes), 556 Overture building footprints,
  and Meta's 1 m canopy-height model for tree removal.
* **60 cm NAIP for Utah could not be fetched from this sandbox**: every NAIP host (Planetary
  Computer, USGS National Map, UGRC) is denied by the environment's network policy. The 60 cm
  code path was instead validated on a real 4-band NAIP mosaic of Philadelphia with real
  Philadelphia parcels and building footprints (the only public 4-band NAIP reachable).
* Utah was run with the **10 m Sentinel-2 fallback** (cloud-free scene, 2026-07-02). The numbers
  are neighborhood-plausible but a 0.2-acre lot is ~8 pixels, so every parcel is flagged
  `confidence=low`. Not pitch-grade per parcel; fine for the district-level story.
* **Validation against Adam's hand-measured lot: not done yet.** Needs (a) the address and the
  hand-measured sq ft and (b) NAIP access (either allow the hosts below or run the pipeline
  locally; a run takes ~1 minute for a neighborhood).

## What is proven

| Step | Data | Status |
|---|---|---|
| Parcels (Utah) | Sandy City mirror of SLCo Recorder parcels, 106k features, LIR attributes (`prop_location`, `Property_Type_Desc`, `year_built`, `total_sq_ft`, values). Extent: Sandy/Draper/Midvale/Cottonwood Heights. Fabric dated July 2022. | Working (public S3) |
| Parcels (UGRC LIR) | `opendata.gis.utah.gov` / `services1.arcgis.com` | Blocked here; loader has the column map, untested |
| Building footprints | Overture Maps 2026-10-21 release, bbox pushdown via pyarrow | Working (public S3, ~30 s per neighborhood) |
| Tree canopy | Meta CHM v2 (1.19 m, DINOv3), windowed COG reads | Working (public S3) |
| NAIP 4-band, 60 cm | Planetary Computer STAC (`naip`), 2024 preferred | Blocked here (`planetarycomputer.microsoft.com`, `naipeuwest.blob.core.windows.net`); code written against the documented API |
| NAIP 4-band, 60 cm | USGS NAIP Plus ImageServer | Blocked here (`imagery.nationalmap.gov`) |
| NAIP 4-band, 60 cm | UGRC downloads (`raster.utah.gov`, `gis.utah.gov`) | Blocked here |
| NAIP 4-band, 30 cm (resampled) | USGS TNM mosaic of Philadelphia on Source Cooperative | Working; used for code-path validation |
| Sentinel-2 L2A, 10 m | AWS `sentinel-cogs`, cloud check via SCL band | Working; fallback only |
| NDVI threshold + per-parcel accounting | numpy/rasterio, parcels rasterised to a label grid | Working |
| Overlay PNG per parcel + neighborhood PNG | Pillow | Working |

## Run 1: Philadelphia, real NAIP + real parcels (code-path validation)

`python -m pipeline.run_spike --bbox -75.165 39.962 -75.155 39.97 --parcels dor_parcel.parquet --buildings li_building_footprints.parquet --imagery philly_naip_mosaic.tif`

| Metric | Value |
|---|---|
| Parcels | 1,940 |
| Imagery | 4-band NAIP, 0.23 m (TNM mosaic, EPSG:3857) |
| Canopy ≥ 2.5 m | 10.4% of pixels |
| High/medium confidence parcels | 1,573 (81%) |
| Total lawn | 9.3 acres (range 7–11 at NDVI ±0.05) |
| Runtime | 12 s to classify; overlays dominate at ~0.1 s each |

Visual check of overlays (in `docs/spike/`): turf is tinted, roofs and parking are not, trees
are separated from lawn by the canopy model, parcel outlines line up with the imagery.

![1201 Parrish St](docs/spike/philly_1201_parrish_st.png)

## Run 2: Sandy, Utah, real parcels + Sentinel-2 fallback

`python -m pipeline.run_spike --bbox -111.875 40.565 -111.865 40.573 --parcels sandy --imagery sentinel2`

| Metric | Value |
|---|---|
| Parcels (residential, 0.02–3 acres) | 497 |
| Footprints | 556 (Overture) |
| Imagery | Sentinel-2 `S2A_12TVL_20260702`, 10 m, 0% cloud over bbox |
| Canopy ≥ 2.5 m | 21.3% of pixels |
| Median lawn fraction | 0.375 |
| Median lawn per parcel | 3,361 sq ft |
| Total lawn | 39.8 acres (range 38.5–46.2) |
| Confidence | all `low` (parcel is ~8 pixels) |

Sanity check: 497 lots × ~0.2 acre = ~100 acres of parcel; ~40 acres of lawn (40%) with ~24%
building footprint and ~18% canopy is in the expected range for 1970s–90s Sandy subdivisions.
Treat as indicative only until the same bbox is run at 60 cm.

![Sandy at 10 m](docs/spike/sandy_s2_10118_s_peony_way.png)

## Known confounders (noted, not solved)

* Tree canopy over lawn: removed by the CHM, which also removes any turf under trees. Reported
  separately as `canopy_sqft`; `green_sqft` is the upper bound including canopy.
* Dormant or brown lawn reads as non-lawn. NAIP Utah is flown June–August; still a risk in
  drought years. `lawn_lo_sqft` / `lawn_hi_sqft` give the ±0.05 NDVI sensitivity.
* Artificial turf reads as non-lawn (correct for water, wrong for "is it grass").
* Building footprints are buffered 0.5 m to swallow eaves. Overture misses some sheds.
* Imagery date vs parcel fabric date: Sandy parcels are a July 2022 extract; NAIP 2024.
* Web Mercator inputs: areas come from parcel geometry in UTM 12N, fractions from pixels, so
  the 3857 Philadelphia mosaic does not inflate areas.

## To unblock 60 cm Utah results

Option A (this sandbox): add these to the environment's allowed domains and re-run
`--imagery pc`:
`planetarycomputer.microsoft.com`, `naipeuwest.blob.core.windows.net`, and for UGRC parcels
`opendata.gis.utah.gov`, `services1.arcgis.com`.

Option B (local):

```
pip install -r pipeline/requirements.txt
python -m pipeline.run_spike --center <lon> <lat> --radius-m 400 --parcels sandy \
  --imagery pc --out data/out/home --address "<house number + street>" --truth-sqft <hand measured>
```

`summary.json` then contains a `validation` block with the error percentage. If the address is
outside the Sandy fabric, pass `--parcels <path to UGRC Salt Lake County Parcels LIR file>`.

## Outputs

* `results.csv`: one row per parcel: `parcel_id, address, parcel_sqft, lawn_sqft, lawn_lo_sqft,
  lawn_hi_sqft, canopy_sqft, building_sqft, hardscape_other_sqft, confidence, imagery_source,
  imagery_date, gsd_m`.
* `overlays/<parcel_id>.png`, `neighborhood.png`, `summary.json`, optional `ndvi.tif` /
  `classes.tif`.

## Phase 1: water math (done, tested)

`pipeline/water.py` (pure functions, 15 tests in `pipeline/tests`), `pipeline/savings.py`
(three-layer card + district totals), `pipeline/eto_table.py` (monthly ETo from gridMET).

* **Reference ET**: FAO-56 Penman-Monteith (short reference) computed daily from gridMET
  (Climatology Lab, CC0; via the Fused H3 mirror on Source Cooperative) for the Sandy H3 cell,
  2023–2025 average. Wind assumed 2 m/s because the mirror omits it. Result:
  54.0 in/yr, July 9.1 in; Hargreaves cross-check 48 in/yr. Table in
  `pipeline/data/eto_sandy_ut.json`. Unit test reproduces FAO-56 Example 18 to ±0.15 mm/day.
* **Turf need** = ETo × Kc(0.80, cool-season turf) − 50% of monthly rain, Apr–Oct. For the
  median Sandy parcel (3,361 sq ft lawn): 31.6 in/season = ~66,000 gal/yr.
* **Bill**: outdoor = monthly use − winter (Dec–Feb) baseline. Units are taken from the bill
  (gal, kgal, CCF supported), never assumed.
* **Example card** (synthetic SLC-style bill peaking at 32 CCF in July): overwatering
  16,000 gal/yr (24% over need), rebate "up to" $5,041 at $1.50/sq ft, conversion
  46,500 gal/yr at a 0.30 water-wise coefficient.
* **District framing** for the 497-parcel Sandy test area: 39.8 lawn acres, 105 acre-ft/yr turf
  need, ~30 acre-ft/yr overwatering at the DWR 0.5–1 ft midpoint, 74 acre-ft/yr if all converted.

## Next

1. Adam: address + hand-measured lawn sq ft, and either allow the NAIP hosts or run locally.
2. Re-run the Sandy bbox at 60 cm (`--imagery pc`), compare, record error in this file.
3. Phase 2 app once the 60 cm numbers are in.

## Phase 2: demo app (SvelteKit on Cloudflare Workers)

`app/`. Runs against static exports from the pipeline (`data/out/<run>/app/` copied to
`app/static/data/<dataset>/`). No external tile server: the parcel view uses the pipeline's own
imagery crop as the base, so it works offline and never leaks the address to a map provider.

* `/` address search over the neighborhood, headline totals.
* `/p/<dataset>/<parcel>` tap-to-cycle correction map (lawn → not lawn → converted → trees;
  buildings fixed), live sq ft, three-layer savings card, rebate warning, water bill upload
  (vision model via `/api/bill`, falls back to manual 12-month entry) with units taken from the
  bill.
* `/district/<dataset>` lawn-share heat map aggregated by parcel, acre-feet totals.
* Corrections POST to `/api/labels` (D1 when bound, `schema.sql`), mirrored in localStorage so
  the demo works without a database.
* Rebate numbers come from the saved `rebate_programs.json` (no live lookups), resolved by city.

Run locally: `cd app && npm install && npm run dev`. Deploy: `npm run build && npx wrangler deploy`
after creating the D1 database named in `wrangler.jsonc` and setting `ANTHROPIC_API_KEY` as a
Worker secret.
