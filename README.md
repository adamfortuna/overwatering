# Utah Lawn Water Lens

From an address: detect the lawn on the parcel from aerial imagery, estimate outdoor water use,
calibrate with the water bill, and show three layers of savings (fix overwatering, state rebate,
post-conversion savings). Positioned as the parcel-level last mile for the Utah Division of
Water Resources' statewide turf model.

* `pipeline/`: offline Python batch (parcels, footprints, NAIP, NDVI, canopy, overlays). See
  `python -m pipeline.run_spike --help`.
* `RESULTS.md`: spike accuracy notes and data-source status.
* `docs/spike/`: sample overlays for the pitch.
