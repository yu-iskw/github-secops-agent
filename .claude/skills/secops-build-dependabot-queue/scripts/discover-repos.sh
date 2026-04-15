#!/usr/bin/env bash
# Emit a JSON work queue from Dependabot alerts using policy in .github-secops-agent.json only.
# Orgs are never taken from argv — only from config (guard against wrong-org API calls).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
RUNNER="$ROOT/packages/ghclt/scripts/run-discover-queue.cjs"

if [[ ! -f $CONFIG ]]; then
	echo "secops: missing config: $CONFIG (copy from .github-secops-agent.json.template)" >&2
	exit 1
fi
if [[ ! -f $RUNNER ]]; then
	echo "secops: missing $RUNNER (build ghclt first: pnpm --filter @github-secops-agent/ghclt build)" >&2
	exit 1
fi

exec node "$RUNNER" "$CONFIG"
