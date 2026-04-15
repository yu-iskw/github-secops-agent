#!/usr/bin/env bash
# Create a GitHub issue with SecOps task body after validating OWNER/REPO.
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
CLI="$ROOT/packages/ghclt/dist/cli.js"

REPO=""
BODY_FILE=""
TITLE="SecOps: dependency remediation (orchestrated)"
ASSIGN_COPILOT=0
PROJECTS=()

usage() {
	cat >&2 <<'EOF'
Usage:
  submit-copilot-task.sh --repo OWNER/REPO --body-file PATH [--title TITLE] [--assign-copilot] [--project TITLE]...

Optional: --assign-copilot; repeat --project for multiple boards.
To assign @copilot on an existing issue (e.g. after Project link), use assign-copilot-issue.sh.

Prerequisites: pnpm --filter @github-secops-agent/ghclt build; gh authenticated.
For --project: gh auth refresh -s project. @copilot not on GHES (gh issue create --help).
EOF
	exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--repo)
		REPO="${2-}"
		shift 2
		;;
	--body-file)
		BODY_FILE="${2-}"
		shift 2
		;;
	--title)
		TITLE="${2-}"
		shift 2
		;;
	--assign-copilot)
		ASSIGN_COPILOT=1
		shift
		;;
	--project)
		PROJECTS+=("${2-}")
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

[[ -n $REPO ]] || usage 1
[[ -n $BODY_FILE ]] || {
	echo "secops: --body-file PATH is required" >&2
	usage 1
}
[[ -f $BODY_FILE ]] || die "body file not found: $BODY_FILE"
[[ -f $CONFIG ]] || die "missing config: $CONFIG"
[[ -f $CLI ]] || die "build ghclt first: pnpm --filter @github-secops-agent/ghclt build"

node "$CLI" validate-repo "$REPO" --config "$CONFIG"

cmd=(gh issue create --repo "$REPO" --title "$TITLE" --body-file "$BODY_FILE")
[[ $ASSIGN_COPILOT -eq 1 ]] && cmd+=(--assignee "@copilot")
for p in "${PROJECTS[@]}"; do
	cmd+=(-p "$p")
done
exec "${cmd[@]}"
