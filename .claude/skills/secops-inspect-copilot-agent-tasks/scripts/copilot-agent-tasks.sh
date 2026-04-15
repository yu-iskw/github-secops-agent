#!/usr/bin/env bash
# Run gh agent-task after validating OWNER/REPO (preview CLI; output may change).
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
CLI="$ROOT/packages/ghclt/dist/cli.js"

usage() {
	cat >&2 <<'EOF'
Usage:
  copilot-agent-tasks.sh --repo OWNER/REPO [gh agent-task args...]

Runs `gh agent-task` after validate-repo. Put --repo first, then pass through
subcommands such as: list, view PR_NUMBER --repo OWNER/REPO, view SESSION_ID

Examples:
  copilot-agent-tasks.sh --repo org/repo list
  copilot-agent-tasks.sh --repo org/repo view 42 --repo org/repo

Prerequisites: pnpm --filter @github-secops-agent/ghclt build; gh with agent-task support.
See references/gh-agent-task.md in secops-inspect-copilot-agent-tasks skill.
EOF
	exit "${1:-1}"
}

[[ ${1-} == --repo ]] || {
	echo "secops: --repo OWNER/REPO must be first" >&2
	usage 1
}
[[ -n ${2-} ]] || usage 1
REPO="${2-}"
shift 2

[[ -f $CONFIG ]] || die "missing config: $CONFIG"
[[ -f $CLI ]] || die "build ghclt first: pnpm --filter @github-secops-agent/ghclt build"

node "$CLI" validate-repo "$REPO" --config "$CONFIG"
exec gh agent-task "$@"
