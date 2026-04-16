#!/usr/bin/env bash
# One-shot PR check: validate-repo, gh fetches JSON, ghclt classifies (no gh inside Node).
# Exit: 0=green, 1=failing, 2=pending or unknown, 3=blocked_manual_ci (heuristic)
set -euo pipefail

die() {
	echo "secops: $*" >&2
	exit 1
}

ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
CLI="$ROOT/packages/ghclt/dist/cli.js"

REPO=""
PR=""
NO_RUNS=()

usage() {
	cat >&2 <<'EOF'
Usage: check-repo-ci.sh --repo OWNER/REPO --pr NUMBER [--no-runs]

Runs gh pr view / optional gh run list, then github-secops-guard pr-check with JSON files.
Writes one JSON object to stdout. Exit 0–3 per pr-check.

Prerequisites: pnpm --filter @github-secops-agent/ghclt build; gh auth.
EOF
	exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--repo)
		REPO="${2-}"
		shift 2
		;;
	--pr)
		PR="${2-}"
		shift 2
		;;
	--no-runs)
		NO_RUNS=(--no-runs)
		shift
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

[[ -n $REPO && -n $PR ]] || usage 1
[[ -f $CONFIG ]] || die "missing config: $CONFIG"
[[ -f $CLI ]] || die "build ghclt first: pnpm --filter @github-secops-agent/ghclt build"

node "$CLI" validate-repo "$REPO" --config "$CONFIG"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

FIELDS=$(node -e "console.log(require('$ROOT/packages/ghclt/dist/index.js').GH_PR_VIEW_JSON_FIELDS)")
gh pr view "$PR" --repo "$REPO" --json "$FIELDS" >"$TMP/pr.json"

RUNS_ARGS=()
if [[ ${#NO_RUNS[@]} -eq 0 ]]; then
	HEAD=$(node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync(process.argv[1],'utf8')).headRefName || '')" "$TMP/pr.json")
	if [[ -n $HEAD ]]; then
		if gh run list --repo "$REPO" --branch "$HEAD" --limit 15 \
			--json databaseId,workflowName,conclusion,status,displayTitle,url,headBranch >"$TMP/runs.json" 2>/dev/null; then
			RUNS_ARGS=(--runs-json-file "$TMP/runs.json")
		fi
	fi
fi

echo "secops: gh pr checks $PR --repo $REPO (human-readable)" >&2
gh pr checks "$PR" --repo "$REPO" >&2 || true

exec node "$CLI" pr-check --repo "$REPO" --config "$CONFIG" --pr-json-file "$TMP/pr.json" "${RUNS_ARGS[@]}"
