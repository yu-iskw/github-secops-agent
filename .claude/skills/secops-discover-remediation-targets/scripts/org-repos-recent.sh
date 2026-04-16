#!/usr/bin/env bash
# List org repos with most recent pushed_at first (activity proxy). Read-only; uses gh built-in --jq.
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "run from a git clone (repo root)"
cd "$ROOT"

ORG=""
LIMIT="20"

usage() {
	cat >&2 <<'EOF'
Usage:
  org-repos-recent.sh --org ORG [--limit K]

Prints a JSON array of non-archived repos sorted by pushed_at descending, keeping the first K
(default 20). Each element includes name, full_name, pushed_at (proxy for "actively developed").

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
[[ $LIMIT =~ ^[0-9]+$ ]] || die "--limit must be a non-negative integer"
command -v gh >/dev/null || die "gh not found"

JQ="[.[] | select(.archived==false)] | sort_by(.pushed_at) | reverse | .[0:${LIMIT}] | map({name, full_name, pushed_at})"

exec gh api "orgs/${ORG}/repos" --paginate --jq "$JQ"
