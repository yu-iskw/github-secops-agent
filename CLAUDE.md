# github-secops-agent — Claude Code

This repository defines **SecOps dependency remediation orchestration**: **granular skills**, optional **sub-agents**, and **`gh`-first** GitHub automation. **Only GitHub Copilot** writes commits on target branches; orchestration uses **issues, PRs, comments, and GitHub Projects**.

## Documentation

- **Product design:** [docs/product_design.md](docs/product_design.md) — submit / observe / act, **no monolithic facade**; role-aligned skill scripts + `gh`.
- **Config (two independent files at repo root):**
  - Copy [.github-secops-agent.json.template](.github-secops-agent.json.template) to **`.github-secops-agent.json`** (SecOps policy; optional **`notifications`** for @mentions).
  - Copy [project-config.json.template](project-config.json.template) to **`project-config.json`** when using a GitHub Project (v2) — **`project_id`** plus **`project_title`** (exact title for `gh issue create --project`); do not duplicate Project ids in the SecOps file.
- **Architecture decisions (ADRs):** [docs/adr/README.md](docs/adr/README.md) — including [ADR 0006](docs/adr/0006-submit-observe-act-and-independent-project-config.md).

## Claude Code documentation

- [Skills](https://code.claude.com/docs/en/skills)
- [Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Agent teams](https://code.claude.com/docs/en/agent-teams)

## Plugins: github-project-skills

This project uses **[github-project-skills](https://github.com/yu-iskw/github-project-skills)** (see [.claude/settings.json](.claude/settings.json) `enabledPlugins`).

Install (from Claude Code):

```text
/plugin marketplace add yu-iskw/github-project-skills
/plugin install github-project-skills@github-project-skills
/reload-plugins
```

### One-time: active GitHub Project

Run the **`gh-set-active-project`** skill so the batch GitHub Project (v2) is recorded. Maintain repo-root **`project-config.json`** (see [project-config.json.template](project-config.json.template)) — if the plugin writes under `.github/`, **copy** the file to the repo root so tooling has one path. Commit **`project-config.json`** so teammates share context. Changes should be reviewed via **CODEOWNERS** (see below).

Other plugin skills used with SecOps flows: **`gh-issue-management`**, **`gh-project-management`**, **`gh-verifying-context`**.

## SecOps skills and sub-agents (this repo)

**Taxonomy:** Granular **skills** are single-outcome verbs (policy guard + one `gh`/CLI surface); **sub-agents** are optional for batch orchestration. When to add a new SecOps skill: see [ADR 0005](docs/adr/0005-secops-granular-skills-vs-subagents.md). **Observe/act** uses the same scripts as humans—invoke skills and `gh` on your schedule ([ADR 0006](docs/adr/0006-submit-observe-act-and-independent-project-config.md)).

| Skill                                                                                              | Purpose                                                                                            |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [secops-discover-remediation-targets](.claude/skills/secops-discover-remediation-targets/SKILL.md) | Discover remediation targets: `gh` + policy; Dependabot, staleness, activity (no ghclt batch JSON) |
| [secops-create-remediation-issue](.claude/skills/secops-create-remediation-issue/SKILL.md)         | Create remediation issue + task body                                                               |
| [secops-assign-copilot-to-issue](.claude/skills/secops-assign-copilot-to-issue/SKILL.md)           | Assign @copilot on existing issue                                                                  |
| [secops-check-pr-checks](.claude/skills/secops-check-pr-checks/SKILL.md)                           | One-shot PR checks JSON + exit codes (read-only)                                                   |
| [secops-inspect-copilot-agent-tasks](.claude/skills/secops-inspect-copilot-agent-tasks/SKILL.md)   | List/view Copilot agent tasks (preview `gh`)                                                       |
| [secops-post-ci-nudge-comment](.claude/skills/secops-post-ci-nudge-comment/SKILL.md)               | Nudge Copilot on failing CI (issue comment)                                                        |
| [secops-post-remediation-evidence](.claude/skills/secops-post-remediation-evidence/SKILL.md)       | Post remediation evidence on issue                                                                 |
| [postmortem](.claude/skills/postmortem/SKILL.md)                                                   | End-of-session retrospective in chat (ranked improvements; no repo edits unless asked)             |

| Sub-agent                     | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| **secops-batch-orchestrator** | Batch queue + concurrency (optional)       |
| **secops-repo-runner**        | Single-repo automation (optional)          |
| **secops-project-board-sync** | Sync GitHub Project fields (plugin skills) |

Sub-agent files under `.claude/agents/` are not in the repo yet; they will be added in a later, organized pass.

## Policy guard CLI (`github-secops-guard`)

Build once: `pnpm --filter @github-secops-agent/ghclt build`.

**MVP — run these first:**

- `node packages/ghclt/dist/cli.js --help` — lists subcommands (`config-schema`, `validate-config`, `validate-repo`, `validate-org`, `pr-check`); implemented with **Commander** (`--config` is accepted on the root command and repeated on each subcommand that loads policy).
- `node packages/ghclt/dist/cli.js config-schema` — prints JSON Schema (draft-07) for `.github-secops-agent.json` to stdout (contract-tested; use as agent context for config shape).
- `node packages/ghclt/dist/cli.js validate-config --config .github-secops-agent.json` — validates SecOps JSON and **`project-config.json`** when present at repo root (no cross-file id matching).
- `node packages/ghclt/dist/cli.js validate-repo OWNER/REPO --config .github-secops-agent.json` (or `github-secops-guard --config PATH validate-repo OWNER/REPO`)
- `node packages/ghclt/dist/cli.js validate-org ORG --config .github-secops-agent.json`

SecOps skill scripts under [`.claude/skills/`](.claude/skills/) call this **before** `gh` so issues are not opened against unexpected orgs/repos. See [.github-secops-agent.json.template](.github-secops-agent.json.template) **Canonical guard stanza**.

Remediation target **discovery** (repos, alerts, optional metadata filters) is **manual `gh api` + jq** per [secops-discover-remediation-targets](.claude/skills/secops-discover-remediation-targets/SKILL.md)—there is no batch JSON emitter in **`packages/ghclt`**.

## Optional helpers

[`packages/ghclt`](packages/ghclt) provides config validation, target policy checks, `github-secops-guard`, PR/check **parsers**, **`gh` argv helpers** for Dependabot alerts, and **`severityRank`** for shared severity ordering. **`ghclt` does not spawn `gh`** for guard or pr-check; invoke `gh` from skills or your shell.

## CODEOWNERS

[.github/CODEOWNERS](.github/CODEOWNERS) requires review for **`project-config.json`** (repo root) and **`.github-secops-agent.json`** so project binding and SecOps policy changes are intentional.
