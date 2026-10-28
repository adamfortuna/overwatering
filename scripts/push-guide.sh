#!/usr/bin/env bash
# Fetch Utah's Weekly Lawn Watering Guide page and post it to overwater.ing, which parses and
# stores it (Cloudflare's network often can't reach wateringindex.utah.gov itself).
# Run by .github/workflows/guide.yml, which authenticates with GitHub's OIDC token (no stored
# secret). By hand: GUIDE_PUSH_SECRET=<the Worker secret> scripts/push-guide.sh
set -euo pipefail
if [ -z "${GUIDE_PUSH_SECRET:-}" ] && [ -n "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ]; then
	GUIDE_PUSH_SECRET=$(curl -fsS -H "authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=https://overwater.ing" | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"])')
fi
: "${GUIDE_PUSH_SECRET:?set GUIDE_PUSH_SECRET, or run in GitHub Actions with id-token: write}"
SITE="${SITE:-https://overwater.ing}"
page=$(mktemp)
curl -fsS -m 60 --retry 3 -A 'overwater.ing guide sync (+https://overwater.ing/connect)' -o "$page" https://wateringindex.utah.gov/traditional-wlwg.html
curl -fsS -m 60 -X POST -H "authorization: Bearer $GUIDE_PUSH_SECRET" -H 'content-type: text/html' --data-binary @"$page" "$SITE/api/guide"
echo
rm -f "$page"
