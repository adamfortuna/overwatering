#!/usr/bin/env bash
# Regenerate the app's static datasets (app/static/data/<dataset>/) from the pipeline.
# ~1 minute per neighborhood; needs network (USDA NAIP, UGRC, Overture, Meta CHM on S3).
# Usage: scripts/build-data.sh [sandy|home ...]   (default: all)
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-.venv/bin/python}
datasets=("$@")
[ ${#datasets[@]} -eq 0 ] && datasets=(sandy home)

for ds in "${datasets[@]}"; do
	case "$ds" in
	sandy)
		# Sandy test area: 497 residential parcels, SLCo Recorder fabric.
		$PY -m pipeline.run_spike --bbox -111.875 40.565 -111.865 40.573 --parcels sandy \
			--imagery usda --out data/out/sandy_naip --save-rasters
		src=data/out/sandy_naip/app ;;
	home)
		# 816 S 600 E, Salt Lake City (Adam's lot) and ~400 m around it, UGRC LIR parcels.
		$PY -m pipeline.run_spike --center -111.87428 40.75143 --radius-m 400 --parcels ugrc \
			--imagery usda --out data/out/home --address "816 S 600 E" --save-rasters ${TRUTH_SQFT:+--truth-sqft $TRUTH_SQFT}
		src=data/out/home/app ;;
	*) echo "unknown dataset $ds" >&2; exit 1 ;;
	esac
	rm -rf "app/static/data/$ds"
	mkdir -p app/static/data
	cp -r "$src" "app/static/data/$ds"
	echo "-> app/static/data/$ds"
done
