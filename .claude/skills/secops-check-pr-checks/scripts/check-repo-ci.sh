#!/usr/bin/env bash
# One-shot PR check after validating OWNER/REPO; emit one JSON line and exit with outcome code.
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

usage() {
	cat >&2 <<'EOF'
Usage: check-repo-ci.sh --repo OWNER/REPO --pr NUMBER

Single invocation (no loop). Writes one JSON object to stdout (outcome, pr, url, mergeStateStatus, mergeable, checksSummary).
Exit code: 0=green, 1=failing, 2=pending or unknown, 3=blocked_manual_ci (heuristic).

Requires jq for classification; without jq, prints raw gh JSON with outcome "unknown" (exit 2).

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

RAW=$(
	gh pr view "$PR" --repo "$REPO" --json \
		statusCheckRollup,mergeStateStatus,url,number,mergeable,headRefName \
		2>/dev/null
) || die "gh pr view failed for $REPO#$PR"

echo "secops: gh pr checks $PR --repo $REPO (human-readable)" >&2
gh pr checks "$PR" --repo "$REPO" >&2 || true

if ! command -v jq >/dev/null 2>&1; then
	OUT=$(
		python3 -c '
import json, sys
raw = json.loads(sys.stdin.read())
raw["outcome"] = "unknown"
raw["checksSummary"] = "install jq for structured outcome and exit codes"
print(json.dumps(raw))
' <<<"$RAW"
	) || die "python3 required when jq is missing"
	echo "$OUT"
	exit 2
fi

# shellcheck disable=SC2016
RESULT=$(echo "$RAW" | jq -c '
  . as $pr
  | ($pr.statusCheckRollup // []) as $rollup
  | ($rollup | map(select(
      (.conclusion == "FAILURE") or (.conclusion == "TIMED_OUT") or (.conclusion == "CANCELLED")
    )) | length) as $failures
  | ($rollup | map(select(
      (.status == "QUEUED") or (.status == "IN_PROGRESS") or (.status == "WAITING") or (.status == "PENDING")
    )) | length) as $inflight
  | ($rollup | length) as $n
  | (
      if $pr.mergeStateStatus == "CLEAN" then
        "green"
      elif ($pr.mergeStateStatus == "UNSTABLE") or ($failures > 0) then
        "failing"
      elif ($inflight > 0) then
        "pending"
      elif ($pr.mergeStateStatus == "BLOCKED") and ($inflight == 0) and ($failures == 0) then
        "blocked_manual_ci"
      else
        "unknown"
      end
    ) as $outcome
  | {
      outcome: $outcome,
      pr: $pr.number,
      url: $pr.url,
      mergeStateStatus: $pr.mergeStateStatus,
      mergeable: $pr.mergeable,
      headRefName: $pr.headRefName,
      checksSummary: (
        "rollup checks=\($n); inflight=\($inflight); failures=\($failures)"
      )
    }
')

echo "$RESULT"

o=$(echo "$RESULT" | jq -r '.outcome')
case "$o" in
green) exit 0 ;;
failing) exit 1 ;;
blocked_manual_ci) exit 3 ;;
pending | unknown) exit 2 ;;
*) exit 2 ;;
esac
