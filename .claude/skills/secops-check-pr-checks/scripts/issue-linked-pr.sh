#!/usr/bin/env bash
# List pull requests connected to an issue (timeline ConnectedEvent). Read-only.
# Runs validate-repo then gh api graphql. Requires gh; uses gh's built-in --jq (no jq binary).
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
Usage: issue-linked-pr.sh --repo OWNER/REPO --issue NUMBER

Runs validate-repo, then GraphQL timeline ConnectedEvent for the issue.
Prints a JSON array of {number,url,state,title} for linked pull requests (may be empty).

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
	--issue)
		ISSUE="${2-}"
		shift 2
		;;
	-h | --help)
		usage 0
		;;
	*)
		die "unknown argument: $1"
		;;
	esac
done

[[ -n $REPO ]] || usage 1
[[ -n $ISSUE ]] || usage 1

[[ -f $CONFIG ]] || die "missing config: $CONFIG"
[[ -f $CLI ]] || die "build ghclt first: pnpm --filter @github-secops-agent/ghclt build"

node "$CLI" validate-repo "$REPO" --config "$CONFIG"

OWNER="${REPO%%/*}"
NAME="${REPO#*/}"
[[ $OWNER != "$REPO" && -n $NAME ]] || die "invalid repo: $REPO (expected OWNER/REPO)"

# GraphQL uses $ for variables (not shell). Single-quoted so bash does not expand; SC2016 is a false positive here.
# shellcheck disable=SC2016
QUERY='query($o:String!,$n:String!,$i:Int!){
  repository(owner:$o,name:$n){
    issue(number:$i){
      timelineItems(first:30,itemTypes:[CONNECTED_EVENT]){
        nodes{
          ... on ConnectedEvent{
            subject{
              ... on PullRequest{ number url state title }
            }
          }
        }
      }
    }
  }
}'

gh api graphql \
	-f query="$QUERY" \
	-f o="$OWNER" \
	-f n="$NAME" \
	-F i="$ISSUE" \
	--jq '[.data.repository.issue.timelineItems.nodes[] | .subject | select(.number != null) | {number, url, state, title}]'
