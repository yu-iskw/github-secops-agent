---
name: secops-build-dependabot-queue
description: Discover target repositories for SecOps dependency remediation using .github-secops-agent.json, allow/exclude lists, and Dependabot alert signals via gh api. Produces a priority-ordered queue for the batch orchestrator.
---

# secops-build-dependabot-queue

## When to use

- Starting a **batch** remediation run.
- Refreshing the **work queue** after config changes.
- Debugging **which repos** are in scope.

## Inputs

- **Config:** `.github-secops-agent.json` (copy from [.github-secops-agent.json.template](../../../.github-secops-agent.json.template); field descriptions are in the template).
- **Auth:** `gh auth status` must succeed for the target orgs.

## Outputs

- **JSON queue (stdout):** One document from **`packages/ghclt/scripts/run-discover-queue.cjs`** (injects `gh`; the library does not spawn `gh`) with `organizations[].repos[]` (`fullName`, `worstSeverity`, `oldestOpenAlertAt`, `alerts[]`), **`organizations[].source`** (`dependabot_org_api` or `dependabot_per_repo_fallback`), and optional **`notes`** (e.g. policy filtering, listing failures).
- **Priority:** Repos sorted per **`orchestration.priority`** (e.g. `severity`, then `oldest_alert`).
- **Filtering:** **`includedRepositories`** / **`excludedRepositories`**, **`discovery.minimumSeverity`**, and **`discovery.preferPerRepo`** (skip org-level alerts; use per-repo APIs only).

## Discovery behavior (`gh`-first)

1. **Try org-level Dependabot alerts** — `gh api orgs/ORG/dependabot/alerts --paginate` (requires org-level access / `security_events` where applicable), **unless** `discovery.preferPerRepo` is `true`.
2. **Automatic fallback** — If that call fails (**403**, **404**, etc.) or **`preferPerRepo`** is set, enumerate candidates via **`gh api orgs/ORG/repos --paginate`**, apply policy, then **`gh api repos/OWNER/REPO/dependabot/alerts --paginate`** per allowed repo. If org repo listing fails, exact **`includedRepositories`** entries (no `*`) can still be used as candidates.
3. **Severity** — Taken from `security_advisory.severity` / `security_vulnerability.severity`; open alerts only; compared to **`discovery.minimumSeverity`**.

Manual **`jq`** examples are optional for debugging raw `gh api` output; the supported path is **`run-discover-queue.cjs`** (or embed `runDiscoverQueue` with your own `gh` runner).

## Shell script / CLI

**[scripts/discover-repos.sh](scripts/discover-repos.sh)** runs **`packages/ghclt/scripts/run-discover-queue.cjs`** with the config path (default: repo root `.github-secops-agent.json`); orgs come **only** from config, never argv. Prerequisites: `pnpm --filter @github-secops-agent/ghclt build`, `gh`; optional `SECOPS_CONFIG`.

## Constraints

- **Do not** push git changes to target repos.
- **Do not** claim scanners ran if only GitHub APIs were queried—state assumptions in the handoff notes (the JSON includes an **`assumptions`** array).

## Handoff

Pass the **JSON stdout** to **secops-batch-orchestrator** / **secops-repo-runner** as structured input (repo list + alert numbers per repo).
