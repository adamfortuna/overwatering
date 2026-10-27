#!/usr/bin/env bash
# Workspace bootstrap: Python pipeline venv, app deps, and (if missing) app datasets.
# Run by Conductor's setup script (Mac or cloud); safe to re-run.
#
#   SETUP_DATASETS="84102 central-city" scripts/setup.sh   # which datasets to build if missing
#   SKIP_DATA=1 scripts/setup.sh                           # deps only
#
# Needs: curl, and Node >= 20.19 (uses nvm + .nvmrc if the Node on PATH is older).
# Python comes from uv (downloads 3.12 if needed).
set -euo pipefail
cd "$(dirname "$0")/.."

. scripts/node-env.sh
ensure_node

if ! command -v uv >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/uv" ]; then
	curl -LsSf https://astral.sh/uv/install.sh | sh
fi
UV=$(command -v uv || echo "$HOME/.local/bin/uv")
[ -d .venv ] || "$UV" venv -q -p 3.12 .venv
"$UV" pip install -q -p .venv -r pipeline/requirements.txt

(cd app && npm ci)
# Local D1 for corrections in dev (production D1 is in wrangler.jsonc). Idempotent, offline.
(cd app && npx wrangler d1 execute lawn-labels --local --file=schema.sql >/dev/null)

# app/static/data is generated and gitignored. Build the first dataset here (~2 min, needs
# network); the rest via the "data" run action or scripts/build-data.sh.
missing=()
for ds in ${SETUP_DATASETS:-84102}; do [ -f "app/static/data/$ds/parcels.json" ] || missing+=("$ds"); done
if [ ${#missing[@]} -gt 0 ] && [ -z "${SKIP_DATA:-}" ]; then
	scripts/build-data.sh "${missing[@]}"
fi
