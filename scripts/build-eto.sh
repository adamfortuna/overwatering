#!/usr/bin/env bash
# Monthly reference ET (gridMET 2023-25, FAO-56) for one populated point per Utah county
# (pipeline/data/eto_points.csv), combined into app/src/lib/eto_utah.json. The app uses the
# nearest point for on-demand addresses. ~1 min per county.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-.venv/bin/python}
tail -n +2 pipeline/data/eto_points.csv | while IFS=, read -r county place lat lon elev; do
	slug=$(echo "$county" | tr 'A-Z ' 'a-z_')
	f=pipeline/data/eto/eto_$slug.json
	mkdir -p pipeline/data/eto
	[ -f "$f" ] && continue
	$PY -m pipeline.eto_table --lat "$lat" --lon "$lon" --elev-m "$elev" --name "tmp_$slug" >/dev/null
	mv "pipeline/data/eto_tmp_$slug.json" "$f"
	echo "$county ($place): $(python3 -c "import json;print(json.load(open('$f'))['annual_eto_in'])") in/yr"
done
$PY - <<'PY'
import csv, json, os
pts = []
for r in csv.DictReader(open("pipeline/data/eto_points.csv")):
    slug = r["county"].lower().replace(" ", "_")
    e = json.load(open(f"pipeline/data/eto/eto_{slug}.json"))
    pts.append({"county": r["county"], "place": r["place"], "lat": float(r["lat"]), "lon": float(r["lon"]), "annual_eto_in": e["annual_eto_in"], "eto_in": e["eto_in"], "precip_in": e["precip_in"]})
json.dump({"source": "gridMET daily 2023-2025, FAO-56 Penman-Monteith short reference, wind 2 m/s assumed; one point per county", "points": pts}, open("app/src/lib/eto_utah.json", "w"), indent=1)
print(f"app/src/lib/eto_utah.json: {len(pts)} points")
PY
