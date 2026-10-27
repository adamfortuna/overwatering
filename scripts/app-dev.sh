#!/usr/bin/env bash
# What `npm run dev` runs (app/package.json). Self-sufficient so any launcher works, including
# a Conductor run button pointed at a folder that has never been set up:
#   1. a new-enough Node (nvm + .nvmrc if PATH has an old one),
#   2. first run: scripts/setup.sh (deps + the 84102 dataset, ~3 min),
#   3. this project's Vite, never a global `vite` (rbenv's vite_ruby shim shadowed it once).
# Extra args (e.g. --host localhost --port 55080) pass through to `vite dev`.
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/node-env.sh
ensure_node

if [ ! -x app/node_modules/.bin/vite ] || [ ! -f app/static/data/index.json ]; then
	echo "First run in $(pwd): installing dependencies and building the 84102 dataset (~3 min)..."
	scripts/setup.sh
fi

# An empty EXTERNAL_ANTHROPIC_API_KEY would shadow app/.env (Vite lets process env win).
[ -n "${EXTERNAL_ANTHROPIC_API_KEY:-}" ] || unset EXTERNAL_ANTHROPIC_API_KEY

cd app
exec node node_modules/vite/bin/vite.js dev "$@"
