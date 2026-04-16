---
name: secops-discover-remediation-targets
description: >-
  Discover candidate repos for SecOps dependency remediation using policy (.github-secops-agent.json)
  and gh api. Scripts under scripts/ for Dependabot org alerts, stale repos (pushed_at), and recent activity;
  combine with optional jq and config. Triggers: open Dependabot alerts, repos not updated in N days, most recently pushed repos.
  Always github-secops-guard validate-repo before creating issues. No ghclt batch queue emitter.
---

# secops-discover-remediation-targets

**Workflow:** **Discover** phase — reasoning and **`gh`** against **`.github-secops-agent.json`** only (not `project-config.json`). See [docs/product_design.md](../../../docs/product_design.md).

## Invariants (every run)

1. **Policy** — Read **`.github-secops-agent.json`** (template: [`.github-secops-agent.json.template`](../../../.github-secops-agent.json.template)).
2. **Validate config** — `github-secops-guard validate-config` after edits (optional **`--config PATH`** or **`SECOPS_CONFIG`**; see **`github-secops-guard --help`** — CLI uses **Commander**).
3. **Before mutations** — `github-secops-guard validate-repo OWNER/REPO` with **`--config`** when not using the default path (or `validate-org` when applicable) before creating issues, assigning Copilot, or commenting.

## Which script to run

Pick the script that matches the user’s request. Each script is **read-only**, uses **`gh api`** with **`gh`’s built-in `--jq`** (no separate `jq` binary), and prints **one JSON array** to stdout. They do **not** read `.github-secops-agent.json`; **you** intersect output with **excludedRepositories**, severity, and any **session-scoped** repo list (see [references](references/dependabot-alerts.md)).

| User asks for…                                                            | Script                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Open **Dependabot alerts** (org-wide)                                     | [scripts/org-dependabot-alerts.sh](scripts/org-dependabot-alerts.sh) |
| Repos **not updated** within the last _N_ days (staleness by `pushed_at`) | [scripts/org-repos-stale.sh](scripts/org-repos-stale.sh)             |
| **Most recently pushed** repos (activity proxy)                           | [scripts/org-repos-recent.sh](scripts/org-repos-recent.sh)           |

### Example invocations

Run from this repository root (same pattern as other SecOps skills).

```bash
.claude/skills/secops-discover-remediation-targets/scripts/org-dependabot-alerts.sh --org ORG
.claude/skills/secops-discover-remediation-targets/scripts/org-dependabot-alerts.sh --org ORG --limit 50

.claude/skills/secops-discover-remediation-targets/scripts/org-repos-stale.sh --org ORG --days 180 --limit 20

.claude/skills/secops-discover-remediation-targets/scripts/org-repos-recent.sh --org ORG --limit 20
```

Use **`--help`** on any script for usage. Per-repo Dependabot fallback, severity notes, and manual `gh api` equivalents: [references/dependabot-alerts.md](references/dependabot-alerts.md). Staleness tradeoffs and composition: [references/repo-metadata-and-activity.md](references/repo-metadata-and-activity.md).

There is **no** `packages/ghclt` batch JSON emitter for discovery.

## MVP path (simple — start here)

You do **not** need a generated JSON queue file to begin remediation.

1. Build policy CLI: `pnpm --filter @github-secops-agent/ghclt build`.
2. **`github-secops-guard validate-config`** and **`validate-repo` / `validate-org`** against your config (use **`config-schema`** for JSON Schema of the SecOps file; **`--help`** for flags).
3. Use other SecOps skills (e.g. **secops-create-remediation-issue**, **secops-assign-copilot-to-issue**) and **`gh`** per [docs/product_design.md](../../../docs/product_design.md).

## When to use this skill

- **Dependabot-led** — List open alerts, intersect with **excludedRepositories** / session filters and **`discovery.minimumSeverity`**.
- **Staleness-led** — Find repos whose last push is older than _N_ days, then optionally check alerts (hygiene-first).
- **Activity-led** — Find “most recently pushed” or similar proxies for “actively developed,” then optionally filter by alerts (security-first).
- **Combined** — Intersect or rank sets (e.g. critical alerts ∩ stale repos); ordering is **your** orchestrator or spreadsheet, guided by **`orchestration.priority`** in config.

## Inputs

- **Config:** `.github-secops-agent.json` (field descriptions in the template).
- **Auth:** `gh auth status` must succeed for the target orgs.

## Constraints

- **Do not** push git changes to target repos.
- **Do not** claim a single canonical JSON schema from this repo—**`ghclt`** does not ship Dependabot queue aggregation.

## Handoff

Prefer **script JSON output** (above) or **`gh api` + `gh`’s `--jq`** for structured lists; add spreadsheets or an external tool as needed. Pass **your** list to **secops-batch-orchestrator** / **secops-repo-runner** if you use those patterns—define the contract in your runbook.
