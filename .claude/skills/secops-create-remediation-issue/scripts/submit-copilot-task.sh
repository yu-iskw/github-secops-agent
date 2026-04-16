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
ALLOW_NO_PROJECT=0

usage() {
	cat >&2 <<'EOF'
Usage:
  submit-copilot-task.sh --repo OWNER/REPO --body-file PATH [--title TITLE] [--assign-copilot] [--project TITLE]... [--no-project]

Policy: pass at least one --project TITLE (maps to gh issue create -p), or set SECOPS_DEFAULT_PROJECT,
or set project_title in repo-root project-config.json, or pass --no-project only when you intentionally
skip linking at create.

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
	--no-project)
		ALLOW_NO_PROJECT=1
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

[[ -n $REPO ]] || usage 1
[[ -n $BODY_FILE ]] || {
	echo "secops: --body-file PATH is required" >&2
	usage 1
}
[[ -f $BODY_FILE ]] || die "body file not found: $BODY_FILE"
[[ -f $CONFIG ]] || die "missing config: $CONFIG"
[[ -f $CLI ]] || die "build ghclt first: pnpm --filter @github-secops-agent/ghclt build"

if [[ ${#PROJECTS[@]} -eq 0 && -n ${SECOPS_DEFAULT_PROJECT-} ]]; then
	PROJECTS+=("$SECOPS_DEFAULT_PROJECT")
fi

if [[ ${#PROJECTS[@]} -eq 0 && -f $ROOT/project-config.json ]]; then
	_pt_from_file="$(
		node -e "
const fs = require('fs');
const p = process.argv[1];
try {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const t = j.project_title;
  process.stdout.write(typeof t === 'string' ? t.trim() : '');
} catch {
  process.exit(0);
}
" "$ROOT/project-config.json"
	)" || true
	[[ -n ${_pt_from_file-} ]] && PROJECTS+=("$_pt_from_file")
fi

if [[ ${#PROJECTS[@]} -eq 0 && $ALLOW_NO_PROJECT -eq 0 ]]; then
	die "missing --project TITLE (gh issue create -p). Link at create, set SECOPS_DEFAULT_PROJECT, add project_title to repo-root project-config.json, or pass --no-project (escape hatch only)"
fi
if [[ $ALLOW_NO_PROJECT -eq 1 && ${#PROJECTS[@]} -gt 0 ]]; then
	die "cannot combine --no-project with --project"
fi
if [[ $ALLOW_NO_PROJECT -eq 1 ]]; then
	echo "secops: warning: creating issue without --project (not linked to a board at create)" >&2
fi

node "$CLI" validate-repo "$REPO" --config "$CONFIG"

cmd=(gh issue create --repo "$REPO" --title "$TITLE" --body-file "$BODY_FILE")
[[ $ASSIGN_COPILOT -eq 1 ]] && cmd+=(--assignee "@copilot")
for p in "${PROJECTS[@]}"; do
	cmd+=(-p "$p")
done
exec "${cmd[@]}"
