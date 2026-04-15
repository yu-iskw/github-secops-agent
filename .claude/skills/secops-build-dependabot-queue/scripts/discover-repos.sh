#!/usr/bin/env bash
# Emit a JSON work queue from Dependabot alerts using policy in .github-secops-agent.json only.
# Orgs are never taken from argv — only from config (guard against wrong-org API calls).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
CLI="$ROOT/packages/ghclt/dist/cli.js"

if [[ ! -f $CONFIG ]]; then
	echo "secops: missing config: $CONFIG (copy from .github-secops-agent.json.template)" >&2
	exit 1
fi
if [[ ! -f $CLI ]]; then
	echo "secops: build ghclt first: pnpm --filter @github-secops-agent/ghclt build" >&2
	exit 1
fi

exec node "$CLI" discover-queue --config "$CONFIG"
