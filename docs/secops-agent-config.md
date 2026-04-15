# `.github-secops-agent.json` schema

Copy [`.github-secops-agent.json.template`](../.github-secops-agent.json.template) to the repository root as `.github-secops-agent.json` and adjust for your organization. The orchestrator **secops-build-dependabot-queue** skill reads this file.

## Security

Treat this file as **policy**: wrong org or repo lists can cause tools to target the wrong GitHub resources. Keep changes reviewable—see [.github/CODEOWNERS](../.github/CODEOWNERS) for `.github-secops-agent.json`.

Skill shell scripts and [`github-secops-guard`](../packages/ghclt) **enforce** `organizations[]`, `includedRepositories`, and `excludedRepositories` before `gh` mutations. **No shared sourced shell library**—each script inlines the same guard pattern for clarity.

## Canonical guard stanza (copy into scripts; do not `source` a common file)

After `pnpm --filter @github-secops-agent/ghclt build`:

```bash
ROOT="$(git rev-parse --show-toplevel)"
CONFIG="${SECOPS_CONFIG:-$ROOT/.github-secops-agent.json}"
[[ -f "$CONFIG" ]] || { echo "secops: missing $CONFIG" >&2; exit 1; }
node "$ROOT/packages/ghclt/dist/cli.js" validate-repo "OWNER/REPO" --config "$CONFIG"
# … then gh …
```

Override config path: `export SECOPS_CONFIG=/path/to/.github-secops-agent.json`.

## Top-level

| Field           | Type     | Description                                                                                  |
| --------------- | -------- | -------------------------------------------------------------------------------------------- |
| `version`       | `number` | Schema version. Currently `1`.                                                               |
| `organizations` | `array`  | One entry per GitHub org to scan.                                                            |
| `orchestration` | `object` | Queue, polling, and nudge limits.                                                            |
| `githubProject` | `object` | Notes linking to `.github/project-config.json` (see [produt_design.md](./produt_design.md)). |
| `evidence`      | `object` | `mvp_links_only` or target `structured_plus_run_log`.                                        |

## `organizations[]`

| Field                  | Type       | Description                                                                                                                                    |
| ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | `string`   | GitHub organization login (e.g. `my-org`).                                                                                                     |
| `includedRepositories` | `string[]` | Optional. Glob-style or exact `owner/repo` entries to **include**. If omitted or empty, discovery uses org-wide APIs subject to filters below. |
| `excludedRepositories` | `string[]` | Optional. Patterns or exact names to **exclude** (archives, sandboxes).                                                                        |
| `discovery`            | `object`   | How to select candidate repos (see below).                                                                                                     |

### `discovery`

| Field             | Type      | Description                                                                                                                                                            |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`            | `string`  | `dependabot_alerts` — use Dependabot alert APIs via `gh api` (requires appropriate org permissions / GHAS where applicable).                                           |
| `minimumSeverity` | `string`  | e.g. `low` \| `medium` \| `high` \| `critical` — filter alerts before enqueueing a repo.                                                                               |
| `preferPerRepo`   | `boolean` | Optional. Default `false`. If `true`, discovery **skips** org-level Dependabot alerts and uses **per-repo** APIs only (for tokens without org-level alert permission). |

**Note:** Org-level `GET /orgs/{org}/dependabot/alerts` requires a token with **`security_events`** and org access where applicable. If that call fails (**403** / **404**), `runDiscoverQueue` (e.g. via `run-discover-queue.cjs`) **automatically falls back** to listing org repos (`GET /orgs/{org}/repos`) and then per-repo Dependabot alerts, subject to `includedRepositories` / `excludedRepositories`. If both org alerts and org repo listing fail, use **`preferPerRepo`: `true`** and explicit **`includedRepositories`** (exact `owner/repo` rows work without listing).

## `orchestration`

| Field                 | Type       | Description                                                                                        |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `maxConcurrentRepos`  | `number`   | Parallel **orchestrator repo threads** (issue/Project/poll steps), not GitHub Copilot queue depth. |
| `priority`            | `string[]` | Ordered tie-breakers, e.g. `criticality`, `severity`, `oldest_alert`.                              |
| `nudgeRounds`         | `number`   | Max Copilot nudge iterations per repo thread.                                                      |
| `pollIntervalSeconds` | `number`   | Sleep between `gh pr checks` polls.                                                                |
| `partialAfterMinutes` | `number`   | After this duration without required checks green, mark **partial** and notify the user.           |

## `evidence`

| Field        | Type     | Description                                                     |
| ------------ | -------- | --------------------------------------------------------------- |
| `mode`       | `string` | `mvp_links_only` — issue/PR/check URLs only.                    |
| `targetMode` | `string` | `structured_plus_run_log` — full evidence (see product design). |

## Example

See [`.github-secops-agent.json.template`](../.github-secops-agent.json.template).
