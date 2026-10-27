#!/usr/bin/env bash
# Workspace bootstrap: Python pipeline venv, app deps, and (if missing) app datasets.
# Run by Conductor's setup script (Mac or cloud); safe to re-run.
#
#   SETUP_DATASETS="84102 central-city" scripts/setup.sh   # which datasets to build if missing
#   SKIP_DATA=1 scripts/setup.sh                           # deps only
#
# Needs: curl, Node >= 20.19 (Vite 8). Python comes from uv (downloads 3.12 if needed).
set -euo pipefail
cd "$(dirname "$0")/.."

node_ok=$(node -e 'const [a,b]=process.versions.node.split(".").map(Number); console.log(a>22||(a===22&&b>=12)||(a===20&&b>=19)?1:0)' 2>/dev/null || echo 0)
if [ "$node_ok" != 1 ]; then
	echo "Node >= 20.19 (or >= 22.12) is required; found $(node -v 2>/dev/null || echo none). Try: brew install node" >&2
	exit 1
fi

if ! command -v uv >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/uv" ]; then
	curl -LsSf https://astral.sh/uv/install.sh | sh
fi
UV=$(command -v uv || echo "$HOME/.local/bin/uv")
[ -d .venv ] || "$UV" venv -q -p 3.12 .venv
"$UV" pip install -q -p .venv -r pipeline/requirements.txt

(cd app && npm ci)

# app/static/data is generated and gitignored. Build the first dataset here (~2 min, needs
# network); the rest via the "data" run action or scripts/build-data.sh.
missing=()
for ds in ${SETUP_DATASETS:-84102}; do [ -f "app/static/data/$ds/parcels.json" ] || missing+=("$ds"); done
if [ ${#missing[@]} -gt 0 ] && [ -z "${SKIP_DATA:-}" ]; then
	scripts/build-data.sh "${missing[@]}"
fi
