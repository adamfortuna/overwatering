#!/usr/bin/env bash
# Start the app's dev server (Conductor's "dev" action). `npm run dev` -> scripts/app-dev.sh
# handles Node, first-run setup and the API key.
# Local: localhost:$CONDUCTOR_PORT (or 5173). Cloud: 0.0.0.0:5173 for `conductor preview`.
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/node-env.sh
ensure_node

if [ "${CONDUCTOR_IS_LOCAL:-1}" = 0 ]; then
	export __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.conductor.show
	host=0.0.0.0
else
	host=localhost
fi
cd app
exec npm run dev -- --host "$host" --port "${CONDUCTOR_PORT:-5173}"
