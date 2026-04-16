#!/usr/bin/env bash
# List open Dependabot alerts for an organization (read-only). Uses gh built-in --jq.
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "run from a git clone (repo root)"
cd "$ROOT"

ORG=""
LIMIT=""

usage() {
	cat >&2 <<'EOF'
Usage:
  org-dependabot-alerts.sh --org ORG [--limit N]

Prints a JSON array of open Dependabot alerts for the org (org-level security API).
Optional --limit keeps the first N alerts after filtering to state==open.

Prerequisites: gh authenticated with access to org Dependabot alerts.
Does not read .github-secops-agent.json; intersect with policy in your orchestrator or jq.
EOF
	exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--org)
		ORG="${2-}"
		shift 2
		;;
	--limit)
		LIMIT="${2-}"
		shift 2
		;;
	-h | --help)
		usage 0
		;;
	*)
		echo "secops: unknown arg: $1" >&2
		usage 1
		;;
	esac
done

[[ -n $ORG ]] || usage 1
command -v gh >/dev/null || die "gh not found"

if [[ -n $LIMIT ]]; then
	[[ $LIMIT =~ ^[0-9]+$ ]] || die "--limit must be a non-negative integer"
	JQ="[.[] | select(.state==\"open\")] | .[0:$LIMIT]"
else
	JQ='[.[] | select(.state=="open")]'
fi

exec gh api "orgs/${ORG}/dependabot/alerts" --paginate --jq "$JQ"
