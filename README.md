# Overwater.ing?

From an address: find the lawn on the lot from 2024 aerial imagery, let the owner fix it, then
open three doors: **water what it needs** (bill vs. need), **take the rebate** (Utah Water
Savers), **convert it** (water saved every year after). Positioned as the parcel-level last
mile for the Utah Division of Water Resources' statewide turf model. Domain: overwater.ing.

Covers **any address in Utah**: six prebuilt datasets (Salt Lake City's 84102, Central City,
Liberty Wells, Downtown and the Avenues, plus a Sandy subdivision) load instantly; any other
Utah parcel is found through UGRC's 29 county parcel layers and measured on demand in the
browser from the same 2024 imagery. Rebates cover all 155 eligible cities. Live at https://overwater.ing.

* `pipeline/`: offline Python batch (parcels, footprints, 2024 NAIP, NDVI, canopy, overlays).
  `python -m pipeline.run_spike --help`; neighborhood polygons in `pipeline/data/aoi/` (`python -m pipeline.aoi`).
* `app/`: SvelteKit on Cloudflare Workers (MapLibre, tap-to-fix corrections in D1, three ways to
  save, neighborhood maps, statewide search + on-demand measurement in `src/lib/live.ts`, bill
  reading with Claude). Playful SVG cast in `src/lib/art/`.
* `scripts/setup.sh`: bootstrap (Python venv via uv, `npm ci`, the 84102 dataset).
  `scripts/build-data.sh [dataset ...]` builds datasets into `app/static/data/`.
* `RESULTS.md`: accuracy notes and runs. `HANDOFF.md`: to-do list and gotchas.

## Run it locally

Needs Node ≥ 20.19 and curl (uv fetches Python 3.12).

```bash
scripts/setup.sh                 # deps + 84102 (~3–4 min first time, needs network)
scripts/build-data.sh            # optional: all six datasets (~10 min)
cd app && npm run dev            # http://localhost:5173
```

Bill upload needs `EXTERNAL_ANTHROPIC_API_KEY` in the environment of the dev server; without
it the app falls back to a manual 12-month grid.

In Conductor, `.conductor/settings.toml` runs `scripts/setup.sh` on workspace creation and adds
**dev**, **test** and **data** run actions.
