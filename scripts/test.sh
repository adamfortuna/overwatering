#!/usr/bin/env bash
# Pipeline tests + app type check (Conductor's "test" action).
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/node-env.sh
ensure_node
.venv/bin/python -m pytest -q pipeline/tests
cd app && npx vitest run && npm run check
