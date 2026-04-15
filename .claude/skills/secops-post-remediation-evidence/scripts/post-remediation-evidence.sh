#!/usr/bin/env bash
# Post remediation closeout / evidence on an issue after validating OWNER/REPO against policy.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
CLI="$ROOT/packages/ghclt/dist/cli.js"

REPO=""
ISSUE=""
BODY_FILE=""

usage() {
	echo "Usage: $0 --repo OWNER/REPO --issue NUMBER --body-file PATH" >&2
	exit 1
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
	--body-file)
		BODY_FILE="${2-}"
		shift 2
		;;
	-h | --help)
		usage
		;;
	*)
		echo "secops: unknown arg: $1" >&2
		usage
		;;
	esac
done

[[ -n $REPO && -n $ISSUE && -n $BODY_FILE ]] || usage
[[ -f $BODY_FILE ]] || {
	echo "secops: body file not found: $BODY_FILE" >&2
	exit 1
}
[[ -f $CONFIG ]] || {
	echo "secops: missing config: $CONFIG" >&2
	exit 1
}
[[ -f $CLI ]] || {
	echo "secops: build ghclt first: pnpm --filter @github-secops-agent/ghclt build" >&2
	exit 1
}

node "$CLI" validate-repo "$REPO" --config "$CONFIG"
exec gh issue comment "$ISSUE" --repo "$REPO" --body-file "$BODY_FILE"
