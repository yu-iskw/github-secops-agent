# SecOps Observe flow (issue → PR checks → agent task)

Single ordered recipe for the **Observe** plane when tracking a dependency remediation: resolve the pull request tied to an issue, snapshot CI / merge classification, then inspect Copilot **agent-task** metadata. Complements [product_design.md](product_design.md) (“Planes: submit, observe, act”).

## Prerequisites

- **GitHub CLI:** `gh` authenticated for the target org/repo.
- **Policy guard:** [`.github-secops-agent.json`](../.github-secops-agent.json) (or `SECOPS_CONFIG`) so `validate-repo` accepts **`OWNER/REPO`** before scripts call `gh`.
- **ghclt built:** `pnpm --filter @github-secops-agent/ghclt build` (required by `check-repo-ci.sh` and agent-task wrapper scripts).

## Step A — Resolve issue → PR number

Use these in order until you have a PR number.

1. **Known PR** — skip discovery.
2. **Title / branch heuristics** (fast when they match):
   - `gh pr list --repo OWNER/REPO --state open --search "in:title SecOps" --json number,url,headRefName`
   - If you know Copilot’s branch: `gh pr view BRANCH --repo OWNER/REPO --json url,number,statusCheckRollup`
3. **Issue-linked PR (reliable)** — when the issue title is generic (e.g. “security remediation”), use GraphQL **connected** pull requests or the helper script below.

**GraphQL (ConnectedEvent):**

```bash
gh api graphql -f query='query($o:String!,$n:String!,$i:Int!){
  repository(owner:$o,name:$n){
    issue(number:$i){
      timelineItems(first:20,itemTypes:[CONNECTED_EVENT]){
        nodes{
          ... on ConnectedEvent{
            subject{ ... on PullRequest{ number url state title } }
          }
        }
      }
    }
  }
}' -f o=OWNER -f n=REPO -F i=ISSUE_NUMBER
```

**Multiple PRs:** timeline may list more than one connection; pick the **open** remediation PR or the one referenced in the issue/comment thread.

**Helper (validate-repo + query):** [issue-linked-pr.sh](../.claude/skills/secops-check-pr-checks/scripts/issue-linked-pr.sh)

```bash
.claude/skills/secops-check-pr-checks/scripts/issue-linked-pr.sh --repo OWNER/REPO --issue ISSUE_NUMBER
```

## Step B — PR checks (merge + required checks)

Run the SecOps classifier (read-only on the repo):

```bash
.claude/skills/secops-check-pr-checks/scripts/check-repo-ci.sh --repo OWNER/REPO --pr PR_NUMBER
```

- **Stdout:** one JSON line with `outcome`, `mergeStateStatus`, `checksSummary`, optional `isDraft`, `reviewDecision`, etc.
- **Exit codes:** `0` = green, `1` = failing, `2` = pending or unknown, `3` = `blocked_manual_ci` (heuristic).

See [secops-check-pr-checks SKILL](../.claude/skills/secops-check-pr-checks/SKILL.md) for the outcome table and orchestration handoff.

## Step C — Copilot agent task (optional metadata)

**Not** a substitute for Step B — use both for a full picture.

```bash
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh --repo OWNER/REPO list
```

**Noisy list:** `gh agent-task list` output may include **many repositories**. Filter for your target, for example:

```bash
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh --repo OWNER/REPO list 2>/dev/null | grep 'OWNER/REPO' | grep '#PR_NUMBER'
```

**View session details:** In **non-interactive** environments, `gh agent-task view` may require a **session ID** (not only a PR number). Obtain the session from the list line, the GitHub UI, or run `view` in an interactive terminal. Details: [gh-agent-task.md](../.claude/skills/secops-inspect-copilot-agent-tasks/references/gh-agent-task.md).

## Interpretation: checks vs `outcome: green`

| Situation                    | Typical JSON signals                                                                                                                                      | Meaning                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ready to merge per **ghclt** | `outcome: green`, `mergeStateStatus: CLEAN`                                                                                                               | Required-check snapshot matches **green**; follow your evidence / Project handoff.                                                   |
| Checks passed but PR blocked | Rollup all success, `mergeStateStatus: BLOCKED`, `isDraft: true` and/or `reviewDecision: REVIEW_REQUIRED`, often `outcome: blocked_manual_ci`, exit **3** | **Not** merge-clean yet: draft, review, or branch rules. “All checks passed” is **not** the same as **`green`** in classifier terms. |
| Failing / pending            | `outcome: failing` or `pending`                                                                                                                           | See [secops-check-pr-checks](../.claude/skills/secops-check-pr-checks/SKILL.md) and nudge skills as needed.                          |

## References

- [secops-check-pr-checks SKILL](../.claude/skills/secops-check-pr-checks/SKILL.md)
- [secops-inspect-copilot-agent-tasks SKILL](../.claude/skills/secops-inspect-copilot-agent-tasks/SKILL.md)
- [gh-agent-task.md](../.claude/skills/secops-inspect-copilot-agent-tasks/references/gh-agent-task.md)
