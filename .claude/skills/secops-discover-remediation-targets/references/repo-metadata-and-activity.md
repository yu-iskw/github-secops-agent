# Repo metadata and activity (`gh api`)

**Staleness** and **“actively developed”** come from **repository metadata** (e.g. last push), not from Dependabot alone. Combine these signals with [Dependabot alerts](dependabot-alerts.md) by intersecting or ranking in the agent.

## Preferred: scripts

From the repo root:

```bash
# Repos with last push older than N days (oldest first), default --limit 20
.claude/skills/secops-discover-remediation-targets/scripts/org-repos-stale.sh --org ORG --days 180 --limit 20

# Repos with most recent pushed_at first (activity proxy), default --limit 20
.claude/skills/secops-discover-remediation-targets/scripts/org-repos-recent.sh --org ORG --limit 20
```

## Tradeoffs

- **`pushed_at`** is a simple **proxy**: it reflects last push to **any** branch GitHub exposes for the repo, not “meaningful product commits” or default-branch-only activity.
- Deeper signals (merged PR rate, commit counts, GraphQL views) need extra API calls and permissions; start with REST unless you need them.

## Manual equivalent: staleness

Set a cutoff ISO 8601 timestamp, then filter repos whose **`pushed_at`** is **before** the cutoff. Sort **oldest first** and take the top **K**. Embed **`${CUTOFF}`** in the **`--jq`** string from bash (same idea as **`org-repos-stale.sh`**):

```bash
CUTOFF=$(date -u -v-180d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '180 days ago' +%Y-%m-%dT%H:%M:%SZ)
gh api "orgs/ORG/repos" --paginate --jq "[.[] | select(.archived==false and .pushed_at < \"${CUTOFF}\")] | sort_by(.pushed_at) | .[:20] | map({name, full_name, pushed_at})"
```

Adjust `180` / `20` / `ORG` for your question, or use **`org-repos-stale.sh`**.

## Manual equivalent: recent activity

```bash
gh api "orgs/ORG/repos" --paginate --jq '
  [.[] | select(.archived==false)] | sort_by(.pushed_at) | reverse | .[:20] | .[] | {name, full_name, pushed_at}
'
```

## Composition with Dependabot

Two common orders:

1. **Security-first** — Start from repos with high-severity open alerts; then filter by staleness or activity if the user asked for it.
2. **Hygiene-first** — Start from stale (or active) repo sets; then query Dependabot per repo (or intersect with an org alert export if you have one).

Intersect sets with **`gh` `--jq`** (e.g. match on `full_name` / `owner/repo`) or filter in the agent. There is no single GitHub API that encodes all org policies and custom rankings; **`orchestration.priority`** in config guides **your** ordering after discovery.
