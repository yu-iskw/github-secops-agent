---
name: secops-create-remediation-issue
description: Create a SecOps remediation issue on the target repo (after policy guard) with optional @copilot assign and Project in one step when policy allows. For assign-after-Project, use secops-assign-copilot-to-issue. Uses gh issue create; does not push branch code.
---

# secops-create-remediation-issue

## When to use

- **Create** a tracked remediation issue when a repo is dequeued.
- If the org requires **Project link before Copilot**, create the issue **without** `--assign-copilot`, run **secops-project-board-sync**, then **secops-assign-copilot-to-issue**. Or use `--assign-copilot` / `--project` in one shot when allowed. Details: [references/gh-issue-copilot.md](references/gh-issue-copilot.md).
- **Comment** or relabel via **gh-issue-management** when the github-project-skills plugin is available.

## Inputs

- **Target:** `owner/repo`.
- **Alert context:** GHSA/CVE summaries for the issue body (append after the canonical prompt).
- **Canonical prompt (in-repo):** [../secops-assign-copilot-to-issue/references/security_remedation_prompt.md](../secops-assign-copilot-to-issue/references/security_remedation_prompt.md) — **authoritative** instruction block for Copilot; versioned with this repository (owned by **secops-assign-copilot-to-issue**).
- **Optional external mirror:** [Supply-chain remediation gist](https://gist.github.com/yu-iskw/7a7412abd7d332fc09f428b8d0d90998) — use if your org standardizes on the URL; keep content aligned with the reference file above.
- **Project:** On-create `--project` (script), or link later via the **secops-project-board-sync** sub-agent (Task tool) / **gh-project-management**.

## Workflow (Issue → Project → Copilot)

1. **Create issue** — [scripts/submit-copilot-task.sh](scripts/submit-copilot-task.sh) (`--repo`, `--body-file`, optional `--title`, `--assign-copilot`, `--project`). Prerequisites: `pnpm --filter @github-secops-agent/ghclt build`, `gh`; optional `SECOPS_CONFIG`. Or raw `gh issue create --repo … --body-file …` after **`github-secops-guard validate-repo`** on that repo.
2. Link to batch Project and set **Status** — **secops-project-board-sync** sub-agent (Task tool).
3. Assign Copilot if not done in step 1 — **[secops-assign-copilot-to-issue](../secops-assign-copilot-to-issue/SKILL.md)** / [assign-copilot-issue.sh](../secops-assign-copilot-to-issue/scripts/assign-copilot-issue.sh) or `gh issue edit … --add-assignee "@copilot"`.

One-shot on create: `--assign-copilot` and repeated `--project "Title"` (needs `gh auth refresh -s project`). Wrapper details: `submit-copilot-task.sh --help`. Richer edits: **gh-issue-management** per [github-project-skills](https://github.com/yu-iskw/github-project-skills).

## Building `task.md` for `--body-file`

Concatenate the security reference with **Tracking** / **Alerts** (and any orchestrator placeholders):

```bash
# From repo root; adjust paths and alert text
{
  cat .claude/skills/secops-assign-copilot-to-issue/references/security_remedation_prompt.md
  echo ""
  echo "## Tracking"
  echo "- Repo: org/repo"
  echo "## Alerts"
  echo "- GHSA-… (summary)"
} > /tmp/secops-task.md

.claude/skills/secops-create-remediation-issue/scripts/submit-copilot-task.sh \
  --repo OWNER/REPO --body-file /tmp/secops-task.md --assign-copilot
```

## Issue body structure

Title (e.g. `SecOps: dependency remediation (orchestrated)`), then the **security_remedation_prompt** content, then **Tracking**, **Alerts**, **Orchestrator rules**, **Evidence** as needed. On GitHub.com use issue assignee **`@copilot`**, not the `gh copilot` CLI for assignment — see [references/gh-issue-copilot.md](references/gh-issue-copilot.md).

## Constraints

- **No `git push`** to the target repository.
- Prompts aligned with **minimal bumps** and **required CI green** per [security_remedation_prompt.md](../secops-assign-copilot-to-issue/references/security_remedation_prompt.md).

## Handoff

Issue **URL** and number → **secops-check-pr-checks**, **secops-project-board-sync** sub-agent, and **secops-assign-copilot-to-issue** when assign was deferred.

## References

- [security_remedation_prompt.md](../secops-assign-copilot-to-issue/references/security_remedation_prompt.md) (canonical Copilot task spec)
- [gh-issue-copilot.md](references/gh-issue-copilot.md)
