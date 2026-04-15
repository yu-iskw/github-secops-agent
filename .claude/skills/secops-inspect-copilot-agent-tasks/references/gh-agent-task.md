# `gh agent-task` (optional, preview)

GitHub CLI exposes **`gh agent-task`** (aliases: `agent-tasks`, `agent`, `agents`) for **agent task sessions**—often tied to **pull requests**. It is **preview** and subject to change.

This is **not** the same as assigning **`@copilot`** on an issue ([gh-issue-copilot](../../secops-create-remediation-issue/references/gh-issue-copilot.md)).

## When to use

- Inspect **session state** or **logs** for a Copilot coding agent run linked to a PR.
- Disambiguate multiple tasks per PR (see `gh agent-task --help`: PR number alone may be ambiguous for non-interactive use).

## Common commands

```bash
gh agent-task list
gh agent-task create "Description of work" --repo OWNER/REPO
gh agent-task view PR_NUMBER --repo OWNER/REPO
gh agent-task view SESSION_ID
```

With the SecOps wrapper (validate-repo first):

```bash
.claude/skills/secops-inspect-copilot-agent-tasks/scripts/copilot-agent-tasks.sh --repo OWNER/REPO list
```

Use `gh agent-task --help` and `gh agent-task create --help` for current flags (`--follow`, `--base`, `--custom-agent`, etc.).

## Relation to secops-inspect-copilot-agent-tasks

- Use the **secops-inspect-copilot-agent-tasks** skill and **[scripts/copilot-agent-tasks.sh](../scripts/copilot-agent-tasks.sh)** so **`validate-repo`** runs before **`gh agent-task`**.
- **secops-check-pr-checks** remains the path for **PR checks** (`gh pr checks` / `statusCheckRollup`) and merge health—**not** a substitute for agent-task metadata.
