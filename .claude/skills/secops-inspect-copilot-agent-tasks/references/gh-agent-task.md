# `gh agent-task` (optional, preview)

GitHub CLI exposes **`gh agent-task`** (aliases: `agent-tasks`, `agent`, `agents`) for **agent task sessions**—often tied to **pull requests**. It is **preview** and subject to change.

This is **not** the same as assigning **`@copilot`** on an issue ([gh-issue-copilot](../../secops-create-remediation-issue/references/gh-issue-copilot.md)).

## When to use

- Inspect **session state** or **logs** for a Copilot coding agent run linked to a PR.
- Disambiguate multiple tasks per PR (see `gh agent-task --help`).

## `list`: scope and noise

**`gh agent-task list`** may return rows from **many repositories**, not only the repo you care about. For automation, **filter** the output (e.g. `grep 'OWNER/REPO'`, `grep '#PR_NUMBER'`) or scan visually for the matching line. Example with the SecOps wrapper:

```bash
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh \
  --repo OWNER/REPO list 2>/dev/null | grep 'OWNER/REPO' | grep '#42'
```

## `view`: interactive vs non-interactive

| Context                            | What works                                                                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Interactive terminal (TTY)**     | `gh agent-task view PR_NUMBER --repo OWNER/REPO` may prompt or resolve context; behavior depends on `gh` version.                                                                                                                                    |
| **Scripts / agents / CI (no TTY)** | **`view` may require a session ID.** If you see `session ID is required when not running interactively`, pass the **session identifier** from **`list`** output or the GitHub UI: `gh agent-task view SESSION_ID` (see `gh agent-task view --help`). |

Do **not** assume `view PR_NUMBER` alone is sufficient for headless runs.

## Common commands

```bash
gh agent-task list
gh agent-task create "Description of work" --repo OWNER/REPO
gh agent-task view SESSION_ID
# Interactive only (verify locally): may work with PR number + repo — see Non-interactive above
gh agent-task view PR_NUMBER --repo OWNER/REPO
```

With the SecOps wrapper (validate-repo first):

```bash
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh --repo OWNER/REPO list
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh --repo OWNER/REPO view SESSION_ID --repo OWNER/REPO
```

Use `gh agent-task --help` and `gh agent-task create --help` for current flags (`--follow`, `--base`, `--custom-agent`, etc.).

## Relation to secops-inspect-copilot-agent-tasks

- Use the **secops-inspect-copilot-agent-tasks** skill and **[scripts/copilot-agent-tasks.sh](../scripts/copilot-agent-tasks.sh)** so **`validate-repo`** runs before **`gh agent-task`**.
- **secops-check-pr-checks** remains the path for **PR checks** (`gh pr checks` / `statusCheckRollup`) and merge health—**not** a substitute for agent-task metadata.
- Ordered Observe steps (issue → PR → checks → agent-task): [docs/secops-observe-flow.md](../../../../docs/secops-observe-flow.md).
