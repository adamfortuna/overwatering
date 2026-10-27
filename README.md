# Utah Lawn Water Lens

From an address: detect the lawn on the parcel from aerial imagery, estimate outdoor water use,
calibrate with the water bill, and show three layers of savings (fix overwatering, state rebate,
post-conversion savings). Positioned as the parcel-level last mile for the Utah Division of
Water Resources' statewide turf model.

* `pipeline/`: offline Python batch (parcels, footprints, 2024 NAIP, NDVI, canopy, overlays). See
  `python -m pipeline.run_spike --help`.
* `app/`: SvelteKit demo (MapLibre, tap-to-cycle corrections, savings card, district view).
* `scripts/setup.sh`: one-shot bootstrap (Python venv via uv, `npm ci`, app datasets).
  `scripts/build-data.sh [sandy|home]` regenerates a dataset into `app/static/data/`.
* `RESULTS.md`: accuracy notes, runs, and data-source status. `HANDOFF.md`: to-do list and gotchas.
* `docs/spike/`: sample overlays for the pitch.

## Run it

```bash
scripts/setup.sh                 # ~3 min first time (needs network)
cd app && npm run dev            # http://localhost:5173
.venv/bin/python -m pytest -q pipeline/tests
```

In Conductor, `.conductor/settings.toml` wires these up as the setup script and the
dev / test / data run actions.
