---
name: secops-check-pr-checks
description: One-shot PR status check with gh—structured JSON outcome and exit codes; classify green vs failing vs pending vs blocked. Read-only on the repo. Does not loop; orchestrating sub-agents sleep and re-invoke. No issue comments—use secops-post-ci-nudge-comment to nudge.
---

# secops-check-pr-checks

## When to use

- After **secops-create-remediation-issue** (issue exists) and Copilot may have opened a PR—**snapshot** required checks / merge state **at invocation time**.
- **Debugging** or **one-off** status when you already know `owner/repo` and PR number.
- As the **leaf step** inside a **sub-agent or orchestrator loop** (see **Orchestration** below)—this skill does **not** sleep or retry by itself.
- **Use secops-post-ci-nudge-comment** when you need to post a **comment** on the issue—not for status classification.

## Inputs

- `owner/repo`
- Issue URL or number (to find linked PRs / branch names)
- Optional: PR number if already known

## Discover PR

```bash
gh pr list --repo OWNER/REPO --state open --search "in:title SecOps" --json number,url,headRefName
```

Or from branch name Copilot used:

```bash
gh pr view BRANCH --repo OWNER/REPO --json url,number,statusCheckRollup
```

## Shell script (primary)

**[scripts/check-repo-ci.sh](scripts/check-repo-ci.sh)** — runs **`validate-repo`**, then **`gh pr view`** / optional **`gh run list`** (shell), human-readable **`gh pr checks`** on stderr, then **`github-secops-guard pr-check --pr-json-file …`** (Node does **not** invoke `gh`; it classifies saved JSON).

- `outcome`: `green` | `failing` | `pending` | `blocked_manual_ci` | `unknown`
- `pr`, `url`, `mergeStateStatus`, `mergeable`, `headRefName`, `checksSummary`
- Optional: `isDraft`, `reviewDecision` (code-review signals; not CI approval)
- Optional: `blockedHint`: `"workflow_action_required"` when **`gh run list`** shows any run with `conclusion: action_required` (e.g. approve workflows / environment gates)
- Optional: `workflowRunsAnalyzed` — number of runs parsed when the run list was fetched (omitted if `--no-runs`)

**Exit codes:** `0` = green, `1` = failing, `2` = pending or unknown, `3` = `blocked_manual_ci` (heuristic).

Classification is implemented in **`packages/ghclt`** (TypeScript), matching the previous `jq` behavior for rollup + `mergeStateStatus`.

```bash
.claude/skills/secops-check-pr-checks/scripts/check-repo-ci.sh --repo OWNER/REPO --pr NUMBER
.claude/skills/secops-check-pr-checks/scripts/check-repo-ci.sh --repo OWNER/REPO --pr NUMBER --no-runs
```

**Direct CLI** (after you have JSON files from `gh`; optional **`--runs-json-file`**):

```bash
pnpm --filter @github-secops-agent/ghclt exec github-secops-guard pr-check \
  --repo OWNER/REPO \
  --config /path/to/.github-secops-agent.json \
  --pr-json-file /tmp/pr.json \
  [--runs-json-file /tmp/runs.json]
```

**Prerequisites:** `pnpm --filter @github-secops-agent/ghclt build`, **`gh`**. Optional `SECOPS_CONFIG`. Policy guard prevents checks against out-of-policy repos.

### When the rollup is empty

`statusCheckRollup` can be **empty** while **`mergeStateStatus`** is **BLOCKED** (no queued checks yet). That often means **policy / approval** (including **workflow approval**). Use **`blockedHint`** when present, or inspect **`gh run list`** / the Actions tab on the PR’s head branch.

## Orchestration (sub-agents and batch runners)

**This skill runs once per invocation.** Sub-agents (**secops-repo-runner**, **secops-batch-orchestrator**, or a Task-tool loop) own **polling**:

1. Invoke `check-repo-ci.sh` (or the equivalent `gh` flow above).
2. If exit code **`2`** and `outcome` is **`pending`** (or **`unknown`** per your policy), **sleep** `orchestration.pollIntervalSeconds` from config, then **invoke again** until green, failing, blocked, or time/round limits.
3. On **`failing`** or long **`pending`**, follow **[secops-post-ci-nudge-comment](../secops-post-ci-nudge-comment/SKILL.md)** for nudge rounds and continuation text—**not** infinite nudges.
4. On **`blocked_manual_ci`** (exit **3**), do not spin—label and notify per nudge skill.

## Classify outcome (mapping)

| `outcome`           | Meaning                                                                                                            | Handoff                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `green`             | `mergeStateStatus` is **CLEAN**                                                                                    | **secops-post-remediation-evidence** success path; **secops-project-board-sync** sub-agent Done if policy says so |
| `failing`           | **UNSTABLE** or any check **FAILURE** / **TIMED_OUT** / **CANCELLED**                                              | **secops-post-ci-nudge-comment** if rounds allow; else mark blocked on repeated failure                           |
| `pending`           | Checks still **QUEUED** / **IN_PROGRESS** / **WAITING** / **PENDING**                                              | Sub-agent: re-run this skill after **`pollIntervalSeconds`** (or investigate if stuck)                            |
| `blocked_manual_ci` | **BLOCKED**, no failures and no in-flight checks in rollup (often approval, policy, or branch rules)—**heuristic** | Label `blocked:manual-ci`, **notify user**, do not spin nudges forever                                            |
| `unknown`           | Does not match the rollup + merge-state rules above                                                                | Sub-agent: treat like pending or investigate with `gh pr view` / `gh run list`                                    |

**Heuristic caveat:** `blocked_manual_ci` is **best-effort**. Validate against your org’s branch protection and environment rules.

## Manual commands (debugging)

```bash
gh pr checks PR_NUMBER --repo OWNER/REPO
gh pr view PR_NUMBER --repo OWNER/REPO --json statusCheckRollup,mergeStateStatus,url,mergeable
gh run list --repo OWNER/REPO --branch BRANCH --limit 15
```

## Nudges and partial (orchestration)

- **Nudge comments** (failing checks, round caps, continuation text): **[secops-post-ci-nudge-comment](../secops-post-ci-nudge-comment/SKILL.md)** and [copilot_continuation.md](../secops-post-ci-nudge-comment/references/copilot_continuation.md).
- **Partial / timeout** when **elapsed time exceeds orchestration.partialAfterMinutes** without green: mark **partial** for Project + evidence; do **not** claim success—see nudge skill and orchestrator.

## Constraints

- This skill does **not** post issue comments—use **secops-post-ci-nudge-comment** for Copilot nudges.
- **No commits** and **no push** to the target repo from this skill’s script.
- Do not disable security workflows or narrow scan scope to fake green.

## Handoff

Pass **PR URL**, **JSON line from check-repo-ci.sh**, and orchestration **outcome** (`green` | `partial` | `blocked`) to the **secops-project-board-sync** sub-agent (Task tool), **secops-post-remediation-evidence**, and **secops-post-ci-nudge-comment** when a nudge is appropriate.

## References

- [gh-agent-task.md](../secops-inspect-copilot-agent-tasks/references/gh-agent-task.md) — optional `gh agent-task` (preview), distinct from PR checks; skill **secops-inspect-copilot-agent-tasks**
