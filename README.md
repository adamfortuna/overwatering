# Overwater.ing?

From an address: find the lawn on the lot from 2024 aerial imagery, let the owner fix it, then
open three doors: **water what it needs** (bill vs. need), **take the rebate** (Utah Water
Savers), **convert it** (water saved every year after). Positioned as the parcel-level last
mile for the Utah Division of Water Resources' statewide turf model. Domain: overwater.ing.

Covered so far: Salt Lake City's 84102, Central City, Liberty Wells, Downtown and the Avenues,
plus a Sandy subdivision as a suburban comparison.

* `pipeline/`: offline Python batch (parcels, footprints, 2024 NAIP, NDVI, canopy, overlays).
  `python -m pipeline.run_spike --help`; neighborhood polygons in `pipeline/data/aoi/` (`python -m pipeline.aoi`).
* `app/`: SvelteKit (MapLibre, tap-to-cycle corrections, the reveal + three doors, scoreboard,
  neighborhood maps, bill reading with Claude).
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
