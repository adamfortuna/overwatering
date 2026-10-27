#!/usr/bin/env bash
# Regenerate the app's static datasets (app/static/data/<dataset>/) from the pipeline, then
# rebuild app/static/data/index.json (dataset manifest + address search index).
# Needs network (USDA NAIP, UGRC, Overture, Meta CHM). Roughly 1 min per 1,000 parcels.
#
#   scripts/build-data.sh                  # all datasets
#   scripts/build-data.sh 84102 downtown   # just these
#   scripts/build-data.sh --index          # only rebuild index.json from what is on disk
#
# Datasets: 84102 central-city liberty-wells downtown avenues (SLC, polygon AOIs in
# pipeline/data/aoi/), sandy (suburban comparison, bbox).
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-.venv/bin/python}
ALL=(84102 central-city liberty-wells downtown avenues sandy)
# Showcase parcels kept even though they aren't residential: the Governor's Mansion
# (Kearns Mansion, 603 E South Temple), the app's example address.
SHOWCASE=09314870040000
# Address reported in 84102's summary.json; with TRUTH_SQFT set, it is validated against it.
ADDRESS=${ADDRESS:-603 E SOUTH TEMPLE}
datasets=("$@")
[ ${#datasets[@]} -eq 0 ] && datasets=("${ALL[@]}")

for ds in "${datasets[@]}"; do
	[ "$ds" = "--index" ] && continue
	out="data/out/$ds"
	case "$ds" in
	sandy)
		# Sandy test area: SLCo Recorder fabric, 1970s-90s subdivisions.
		$PY -m pipeline.run_spike --bbox -111.875 40.565 -111.865 40.573 --parcels sandy \
			--imagery usda --out "$out" --save-rasters ;;
	84102)
		$PY -m pipeline.run_spike --aoi 84102 --parcels ugrc --imagery usda --out "$out" --keep-parcels "$SHOWCASE" \
			--address "$ADDRESS" ${TRUTH_SQFT:+--truth-sqft $TRUTH_SQFT} --save-rasters ;;
	avenues)
		$PY -m pipeline.run_spike --aoi avenues --parcels ugrc --imagery usda --out "$out" --keep-parcels "$SHOWCASE" --save-rasters ;;
	central-city | liberty-wells | downtown)
		$PY -m pipeline.run_spike --aoi "$ds" --parcels ugrc --imagery usda --out "$out" --save-rasters ;;
	*) echo "unknown dataset $ds (known: ${ALL[*]})" >&2; exit 1 ;;
	esac
	rm -rf "app/static/data/$ds"
	mkdir -p app/static/data
	cp -r "$out/app" "app/static/data/$ds"
	echo "-> app/static/data/$ds"
done

$PY -m pipeline.app_index app/static/data
