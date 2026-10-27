#!/usr/bin/env bash
# Start the app's dev server (Conductor's "dev" action). Installs app deps if they're missing.
# Local: localhost:$CONDUCTOR_PORT (or 5173). Cloud: 0.0.0.0:5173 for `conductor preview`.
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/node-env.sh
ensure_node

[ -d app/node_modules ] || (cd app && npm ci)
if [ ! -f app/static/data/index.json ]; then
	echo "No datasets built yet, so search will be empty. Run scripts/setup.sh (builds 84102) or scripts/build-data.sh." >&2
fi

# An empty EXTERNAL_ANTHROPIC_API_KEY would shadow app/.env (Vite lets process env win).
[ -n "${EXTERNAL_ANTHROPIC_API_KEY:-}" ] || unset EXTERNAL_ANTHROPIC_API_KEY

if [ "${CONDUCTOR_IS_LOCAL:-1}" = 0 ]; then
	export __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.conductor.show
	host=0.0.0.0
else
	host=localhost
fi
cd app
exec npm run dev -- --host "$host" --port "${CONDUCTOR_PORT:-5173}"
