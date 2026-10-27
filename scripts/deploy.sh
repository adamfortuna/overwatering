#!/usr/bin/env bash
# Build and deploy to Cloudflare Workers (overwater.ing). Needs CLOUDFLARE_API_TOKEN with
# Account: Workers Scripts Edit (+ D1 Edit for the labels DB) and Zone overwater.ing: Workers
# Routes + DNS Write. Data in app/static/data/ (gitignored) is uploaded as static assets; the
# ~25.8k files need the Workers Paid plan (free allows 20k).
#
#   scripts/deploy.sh               # build + deploy
#   scripts/deploy.sh --secret      # also (re)store EXTERNAL_ANTHROPIC_API_KEY as a Worker secret
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/node-env.sh
ensure_node
[ -f app/static/data/index.json ] || { echo "No datasets in app/static/data; run scripts/build-data.sh first." >&2; exit 1; }

cd app
# Build with the key unset so it can never be inlined, then make sure it isn't in the bundle.
rm -rf .svelte-kit/cloudflare
env -u EXTERNAL_ANTHROPIC_API_KEY npm run build
if [ -n "${EXTERNAL_ANTHROPIC_API_KEY:-}" ] && grep -rqF "$EXTERNAL_ANTHROPIC_API_KEY" .svelte-kit/cloudflare .svelte-kit/output; then
	echo "Refusing to deploy: the Anthropic key is in the build output." >&2
	exit 1
fi
npx wrangler d1 execute lawn-labels --remote --file=schema.sql -y >/dev/null
npx wrangler deploy
if [ "${1:-}" = "--secret" ]; then
	printf %s "${EXTERNAL_ANTHROPIC_API_KEY:?EXTERNAL_ANTHROPIC_API_KEY is empty}" | npx wrangler secret put EXTERNAL_ANTHROPIC_API_KEY
fi
