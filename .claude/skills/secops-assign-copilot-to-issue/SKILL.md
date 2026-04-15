---
name: secops-assign-copilot-to-issue
description: Assign @copilot on an existing SecOps remediation issue after policy guard—use when Project link or org policy requires Issue → Project before assignee. Uses gh issue edit; does not push branch code.
---

# secops-assign-copilot-to-issue

## When to use

- **Second step** after **secops-create-remediation-issue** when the org requires **Project link before Copilot** (create issue without assignee, sync Project, then assign).
- Any time you need **`@copilot`** on an **existing** issue number without recreating the body.

Assignment semantics and GHES limits: [../secops-create-remediation-issue/references/gh-issue-copilot.md](../secops-create-remediation-issue/references/gh-issue-copilot.md).

## Inputs

- **Target:** `owner/repo`, **issue number**.

## Script

**[scripts/assign-copilot-issue.sh](scripts/assign-copilot-issue.sh)** — `validate-repo`, then `gh issue edit … --add-assignee "@copilot"`. Args: `--repo OWNER/REPO` `--issue NUMBER`.

```bash
.claude/skills/secops-assign-copilot-to-issue/scripts/assign-copilot-issue.sh \
  --repo OWNER/REPO --issue 42
```

**Prerequisites:** `pnpm --filter @github-secops-agent/ghclt build`, `gh`. Optional `SECOPS_CONFIG`. Next: **secops-check-pr-checks** when a PR exists; **secops-project-board-sync** as needed for board fields.

## Constraints

- **No `git push`** to the target repository.
- Do not use this skill to **create** issues—use **secops-create-remediation-issue** with `--body-file`.

## References

- **[security_remedation_prompt.md](references/security_remedation_prompt.md)** — canonical long-form Copilot remediation rules (supply-chain scope, host constraints, phases). **secops-create-remediation-issue** concatenates this into `--body-file` when opening an issue; this skill only adds **`@copilot`** when assign was deferred (e.g. after Project link).
