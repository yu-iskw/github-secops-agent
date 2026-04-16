---
name: secops-post-remediation-evidence
description: Post remediation closeout / evidence on the SecOps issue—MVP links-only or structured summary plus orchestrator run log (format per skill conventions; not configured in JSON). Uses gh issue comment and gh api.
---

# secops-post-remediation-evidence

**Workflow:** **Act** / closeout — post evidence via **`gh`** using the **MVP vs structured** conventions below (see [docs/product_design.md](../../../docs/product_design.md) — Visibility / Evidence).

## When to use

- When a repo thread reaches **green**, **partial**, or **blocked**.
- At the end of each **nudge round** when you are targeting **structured + run log** (not links-only MVP).

## Inputs

- **MVP:** treat as **`mvp_links_only`** unless the team agreed to structured closeout for this run.
- **Artifacts:** issue URL, PR URL, list of **GHSA/CVE** addressed (from Copilot or discovery), **commands** or **CI job names** referenced.

## MVP: links-only

Post a short comment:

- Issue link, PR link, **required checks** page / summary from `gh pr checks`.
- Explicit line: **“Structured run log deferred (mvp_links_only).”**

## Target: structured + run log

Include:

1. **Summary / Why:** advisories, packages, version changes (from PR or Copilot comment).
2. **Verification:** what ran locally vs CI (job names).
3. **Session postmortem** (aligned with [gist](https://gist.github.com/yu-iskw/7a7412abd7d332fc09f428b8d0d90998)): outcome, verification, friction, Copilot-environment notes.

## Post the comment

**Script:** [scripts/post-remediation-evidence.sh](scripts/post-remediation-evidence.sh) — `validate-repo`, then `gh issue comment`. Args: `--repo OWNER/REPO` `--issue NUMBER` `--body-file PATH`. Prerequisites: `pnpm --filter @github-secops-agent/ghclt build`, `gh`; optional `SECOPS_CONFIG`.

Or invoke `gh` directly if policy was validated elsewhere:

```bash
gh issue comment ISSUE --repo OWNER/REPO --body-file evidence.md
```

## Constraints

- Do not claim **DB-backed scanners** (e.g. osv-scanner) ran unless they actually did.
- List **exceptions/suppressions** with IDs if any.
