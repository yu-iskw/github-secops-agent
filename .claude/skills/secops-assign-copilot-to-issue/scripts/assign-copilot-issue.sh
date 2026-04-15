#!/usr/bin/env bash
# Assign @copilot on an existing issue after validating OWNER/REPO.
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
CLI="$ROOT/packages/ghclt/dist/cli.js"

REPO=""
ISSUE=""

usage() {
	cat >&2 <<'EOF'
Usage:
  assign-copilot-issue.sh --repo OWNER/REPO --issue NUMBER

Adds assignee @copilot only (e.g. after Project link). For creating issues use submit-copilot-task.sh.

Prerequisites: pnpm --filter @github-secops-agent/ghclt build; gh authenticated.
@copilot not on GHES (gh issue edit --help).
EOF
	exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--repo)
		REPO="${2-}"
		shift 2
		;;
	--issue)
		ISSUE="${2-}"
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

[[ -n $REPO && -n $ISSUE ]] || usage 1
[[ $ISSUE =~ ^[0-9]+$ ]] || die "--issue must be a positive issue number"
[[ -f $CONFIG ]] || die "missing config: $CONFIG"
[[ -f $CLI ]] || die "build ghclt first: pnpm --filter @github-secops-agent/ghclt build"

node "$CLI" validate-repo "$REPO" --config "$CONFIG"
exec gh issue edit "$ISSUE" --repo "$REPO" --add-assignee "@copilot"
