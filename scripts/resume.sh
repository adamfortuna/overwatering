#!/usr/bin/env bash
# Pick up where the last session left off (see "Next session" in HANDOFF.md).
#
# 1. Preflight (fast): required env vars are set, non-empty, and accepted by the APIs.
#    Exits 1 within a few seconds if anything is missing, so you get control back.
# 2. Bootstrap: scripts/setup.sh (deps), then build any datasets not yet in app/static/data.
#
#   scripts/resume.sh             # preflight + setup + all datasets (~10 min first time)
#   scripts/resume.sh --check     # preflight only
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
for v in EXTERNAL_ANTHROPIC_API_KEY CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
	if [ -z "${!v:-}" ]; then
		echo "MISSING: $v is unset or empty in this workspace's environment" >&2
		fail=1
	else
		echo "ok: $v is set"
	fi
done
if [ "$fail" = 1 ]; then
	echo "Set the variables in Conductor and create a new workspace (env is fixed when the workspace starts)." >&2
	exit 1
fi

# Validate against the APIs (read-only, 10 s timeouts). Values are never printed.
code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.anthropic.com/v1/models \
	-H "x-api-key: $EXTERNAL_ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" || echo 000)
if [ "$code" != 200 ]; then
	echo "FAIL: Anthropic rejected EXTERNAL_ANTHROPIC_API_KEY (HTTP $code)" >&2
	exit 1
fi
echo "ok: Anthropic key accepted"

cf=$(curl -s -m 10 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
	"https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" || true)
if ! printf %s "$cf" | grep -q '"status":"active"'; then
	echo "FAIL: Cloudflare token not active for account $CLOUDFLARE_ACCOUNT_ID" >&2
	exit 1
fi
echo "ok: Cloudflare token active"

# Permissions the deploy needs. Workers Scripts was the only one the old token had.
for check in "workers/scripts:Workers Scripts" "d1/database:D1" "r2/buckets:R2"; do
	path=${check%%:*} name=${check#*:}
	if curl -s -m 10 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
		"https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/$path" | grep -q '"success":true'; then
		echo "ok: token can read $name"
	else
		echo "WARN: token cannot read $name (needed for deploy: D1 for corrections, R2 if data moves there)" >&2
	fi
done

[ "${1:-}" = "--check" ] && exit 0

SKIP_DATA=1 scripts/setup.sh
missing=()
for ds in 84102 central-city liberty-wells downtown avenues sandy; do
	[ -f "app/static/data/$ds/parcels.json" ] || missing+=("$ds")
done
if [ ${#missing[@]} -gt 0 ]; then
	scripts/build-data.sh "${missing[@]}"
fi
echo "Ready. Next steps: HANDOFF.md -> Next session."
