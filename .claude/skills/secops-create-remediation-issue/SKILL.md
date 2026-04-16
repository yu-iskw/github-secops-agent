---
name: secops-create-remediation-issue
description: Create a SecOps remediation issue on the target repo (after policy guard). Link a GitHub Project at create time via --project (gh issue create -p); optional @copilot assign. For assign-after-Project, use secops-assign-copilot-to-issue. Uses gh issue create; does not push branch code.
---

# secops-create-remediation-issue

**Workflow:** **Submit** phase — run the shell script below directly (no mega-wrapper). For Project **node id** and **`project_title`** (`gh issue create --project`), use repo-root **`project-config.json`** ([template](../../../project-config.json.template)), not `.github-secops-agent.json`. See [docs/product_design.md](../../../docs/product_design.md).

## When to use

- **Create** a tracked remediation issue when a repo is dequeued.
- If the org requires **Project link before Copilot**, create the issue **with `--project`** but **without** `--assign-copilot`, then **secops-assign-copilot-to-issue** (and **secops-project-board-sync** for fields if needed). Or use `--assign-copilot` and `--project` in one shot when allowed. Details: [references/gh-issue-copilot.md](references/gh-issue-copilot.md).
- **Comment** or relabel via **gh-issue-management** when the github-project-skills plugin is available.

## Inputs

- **Target:** `owner/repo`.
- **Alert context:** GHSA/CVE summaries for the issue body (append after the canonical prompt).
- **Canonical prompt (in-repo):** [references/security_remedation_prompt.md](references/security_remedation_prompt.md) — **authoritative** instruction block for Copilot; versioned with this repository.
- **Optional external mirror:** [Supply-chain remediation gist](https://gist.github.com/yu-iskw/7a7412abd7d332fc09f428b8d0d90998) — use if your org standardizes on the URL; keep content aligned with the reference file above.
- **Project (required at create):** pass **`--project "Exact board title"`** to [submit-copilot-task.sh](scripts/submit-copilot-task.sh) (maps to `gh issue create -p`; needs `gh auth refresh -s project`), **or** set **`SECOPS_DEFAULT_PROJECT`**, **or** set **`project_title`** in repo-root **`project-config.json`** (resolved after CLI flags and env). **`--no-project`** is an escape hatch only (prints a warning). Repair paths: **`gh issue edit --add-project`** or **secops-project-board-sync** / **gh-project-management** for issues created without `-p`, or extra boards / fields—not a substitute for create-time linking when you control the create command.

## Workflow (Issue → Project → Copilot)

1. **Create issue** — [scripts/submit-copilot-task.sh](scripts/submit-copilot-task.sh) (`--repo`, `--body-file`, **`--project`** or `SECOPS_DEFAULT_PROJECT` or **`project_title` in `project-config.json`**, optional `--title`, `--assign-copilot`). Prerequisites: `pnpm --filter @github-secops-agent/ghclt build`, `gh`; optional `SECOPS_CONFIG`. Or raw `gh issue create --repo … --body-file … --project …` after **`github-secops-guard validate-repo`** on that repo.
2. Set **Status** / board fields — **secops-project-board-sync** sub-agent (Task tool) when automations do not cover it.
3. Assign Copilot if not done in step 1 — **[secops-assign-copilot-to-issue](../secops-assign-copilot-to-issue/SKILL.md)** / [assign-copilot-issue.sh](../secops-assign-copilot-to-issue/scripts/assign-copilot-issue.sh) or `gh issue edit … --add-assignee "@copilot"`.

One-shot on create: `--assign-copilot` and repeated `--project "Title"` (needs `gh auth refresh -s project`). Wrapper details: `submit-copilot-task.sh --help`. Richer edits: **gh-issue-management** per [github-project-skills](https://github.com/yu-iskw/github-project-skills).

## Building `task.md` for `--body-file`

Concatenate the security reference with **Tracking** / **Alerts** (and any orchestrator placeholders):

```bash
# From repo root; adjust paths and alert text
{
  cat .claude/skills/secops-create-remediation-issue/references/security_remedation_prompt.md
  echo ""
  echo "## Tracking"
  echo "- Repo: org/repo"
  echo "## Alerts"
  echo "- GHSA-… (summary)"
} > /tmp/secops-task.md

.claude/skills/secops-create-remediation-issue/scripts/submit-copilot-task.sh \
  --repo OWNER/REPO --body-file /tmp/secops-task.md \
  --assign-copilot \
  --project "[SecOps] security remediation"
```

## Issue body structure

Title (e.g. `SecOps: dependency remediation (orchestrated)`), then the **security_remedation_prompt** content, then **Tracking**, **Alerts**, **Orchestrator rules**, **Evidence** as needed. On GitHub.com use issue assignee **`@copilot`**, not the `gh copilot` CLI for assignment — see [references/gh-issue-copilot.md](references/gh-issue-copilot.md).

## Constraints

- **No `git push`** to the target repository.
- Prompts aligned with **minimal bumps** and **required CI green** per [security_remedation_prompt.md](references/security_remedation_prompt.md).

## Handoff

Issue **URL** and number → **secops-check-pr-checks**, **secops-project-board-sync** sub-agent, and **secops-assign-copilot-to-issue** when assign was deferred.

## References

- [security_remedation_prompt.md](references/security_remedation_prompt.md) (canonical Copilot task spec)
- [gh-issue-copilot.md](references/gh-issue-copilot.md)
