#!/usr/bin/env bash
# List org repos whose pushed_at is before a cutoff (staleness). Read-only; uses gh built-in --jq.
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "run from a git clone (repo root)"
cd "$ROOT"

ORG=""
DAYS=""
LIMIT="20"

usage() {
	cat >&2 <<'EOF'
Usage:
  org-repos-stale.sh --org ORG --days N [--limit K]

Prints a JSON array of non-archived repos with pushed_at strictly before N days ago,
sorted oldest first, then keeps the first K rows (default 20). Each element includes
name, full_name, pushed_at.

Cutoff uses BSD date first, then GNU date (portable).

Prerequisites: gh authenticated. Does not apply allow/exclude from policy; do that in jq or the agent.
EOF
	exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--org)
		ORG="${2-}"
		shift 2
		;;
	--days)
		DAYS="${2-}"
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

[[ -n $ORG && -n $DAYS ]] || usage 1
[[ $DAYS =~ ^[0-9]+$ ]] || die "--days must be a non-negative integer"
[[ $LIMIT =~ ^[0-9]+$ ]] || die "--limit must be a non-negative integer"
command -v gh >/dev/null || die "gh not found"

CUTOFF=$(date -u -v-"${DAYS}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "${DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)

JQ="[.[] | select(.archived==false and .pushed_at < \"${CUTOFF}\")] | sort_by(.pushed_at) | .[0:${LIMIT}] | map({name, full_name, pushed_at})"

exec gh api "orgs/${ORG}/repos" --paginate --jq "$JQ"
