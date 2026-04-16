---
name: secops-inspect-copilot-agent-tasks
description: List or view Copilot coding agent task sessions via gh agent-task (preview CLI)—not PR merge health; use secops-check-pr-checks for PR checks. Not issue assignee @copilot; use secops-assign-copilot-to-issue. Policy guard before gh.
---

# secops-inspect-copilot-agent-tasks

**Workflow:** **Observe** phase — complements **secops-check-pr-checks**; use both for a full picture. Run [scripts/copilot-agent-tasks.sh](scripts/copilot-agent-tasks.sh) directly. See [docs/product_design.md](../../../docs/product_design.md).

## When to use

- **List** or **view** Copilot **agent task** sessions (often tied to a PR)—debugging, auditing, or disambiguating multiple tasks per PR.
- **Not** for **required check** status—use **secops-check-pr-checks** and `check-repo-ci.sh`.
- **Not** for assigning **`@copilot`** on an issue—use **secops-assign-copilot-to-issue** ([gh-issue-copilot semantics](../secops-create-remediation-issue/references/gh-issue-copilot.md)).

The **`gh agent-task`** command is **preview**; flags and output may change with `gh` upgrades. Details: [references/gh-agent-task.md](references/gh-agent-task.md).

## Inputs

- **Policy target:** `owner/repo` (passed as **`--repo`** to the wrapper first).
- **Passthrough:** remaining arguments go to **`gh agent-task`** (e.g. `list`, `view …`).

## Script

**[scripts/copilot-agent-tasks.sh](scripts/copilot-agent-tasks.sh)** — `validate-repo`, then `exec gh agent-task "$@"`. **`--repo OWNER/REPO` must be the first two arguments.**

```bash
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh \
  --repo OWNER/REPO list

# Passthrough matches `gh agent-task` (e.g. view needs --repo again for the subcommand):
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh \
  --repo OWNER/REPO view TASK_ID --repo OWNER/REPO
```

**Prerequisites:** `pnpm --filter @github-secops-agent/ghclt build`, `gh` with `agent-task`. Optional `SECOPS_CONFIG`.

### Automation notes

- **`list`** output can span **many repos** — filter with `grep` for `OWNER/REPO` and the PR (see [references/gh-agent-task.md](references/gh-agent-task.md)).
- **`view`** in non-interactive environments often needs a **session ID**, not only a PR number — see **gh-agent-task.md**.
- Full Observe order (issue → PR → checks → agent-task): [docs/secops-observe-flow.md](../../../docs/secops-observe-flow.md).

## Constraints

- **No `git push`** to the target repository from this skill.
- Do **not** treat agent-task output as a substitute for **CI green** or **merge** readiness.

## Handoff

Use alongside **secops-check-pr-checks** (checks) and **secops-assign-copilot-to-issue** (issue assignee) as needed; see [references/gh-agent-task.md](references/gh-agent-task.md).

## References

- [docs/secops-observe-flow.md](../../../docs/secops-observe-flow.md) — ordered Observe recipe (issue → PR checks → agent-task)
- [gh-agent-task.md](references/gh-agent-task.md)
