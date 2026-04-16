# `gh` issue commands vs Copilot CLI vs agent tasks

Use this when deciding **how to hand work to GitHub Copilot on an issue**.

## Assign Copilot on an issue (GitHub.com)

`gh issue create` and `gh issue edit` document special assignee values:

- **`@me`** — yourself
- **`@copilot`** — assign GitHub Copilot (see `gh issue create --help`, `gh issue edit --help`)

**GitHub Enterprise Server:** `@copilot` is **not** supported as an assignee (same help text).

## Project scope

Adding an issue to a Project with `gh issue create --project "Title"` (or `--add-project` on edit) needs OAuth scope **`project`**:

```bash
gh auth refresh -s project
```

## What is _not_ issue assignment

| Command         | Role                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `gh copilot`    | Local **Copilot CLI** (preview). Use `gh copilot -- --help`. Does **not** assign issues.        |
| `gh agent-task` | **Preview** agent tasks (often PR/session oriented). Not the same as issue assignee `@copilot`. |

## See also

- [SKILL.md](../SKILL.md) — workflow and [scripts/submit-copilot-task.sh](../scripts/submit-copilot-task.sh)
