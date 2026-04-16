# Dependabot alerts (`gh api`)

Use these patterns with **`.github-secops-agent.json`**: **`excludedRepositories`**, **`discovery.minimumSeverity`**, and **`discovery.preferPerRepo`** when you must avoid org-level alert APIs. **`validate-repo`** allows any repo under a configured org except **excluded** patterns—there is **no** config allowlist; narrow discovery with **`gh api`** filters or an explicit repo list in your session.

## Preferred: script

From the repo root:

```bash
.claude/skills/secops-discover-remediation-targets/scripts/org-dependabot-alerts.sh --org ORG
.claude/skills/secops-discover-remediation-targets/scripts/org-dependabot-alerts.sh --org ORG --limit 50
```

Prints a JSON array of **open** alerts (`state == "open"`). Requires org-level access / `security_events` where applicable.

## Manual equivalent (org-level)

```bash
gh api "orgs/ORG/dependabot/alerts" --paginate --jq '[.[] | select(.state=="open")]'
```

Replace `ORG` with your organization login. Add **`gh` `--jq`** filters for severity, ecosystem, or repo name as needed.

## Per-repo fallback

When org alerts are unavailable or **`discovery.preferPerRepo`** applies:

1. Enumerate repos: **`gh api orgs/ORG/repos --paginate`**, or paste an explicit **`owner/repo`** list for this run.
2. Intersect with **excluded** patterns from policy (and your own session filters).
3. For each candidate: **`gh api repos/OWNER/REPO/dependabot/alerts --paginate`**.

If org repo listing fails, query **specific repos** you name explicitly (no `*` in the repo segment) via per-repo alert APIs.

## Severity

Use `security_advisory.severity` and/or `security_vulnerability.severity` on each alert; consider **open** alerts only. Compare to **`discovery.minimumSeverity`** in config (map mentally or in **`gh` `--jq`**—see **`packages/ghclt`** severity ordering if you need consistency with other tools).

## Output

Shape JSON for your orchestrator, notes, or spreadsheet. There is no single canonical schema enforced by this repository.
