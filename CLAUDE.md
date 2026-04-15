# github-secops-agent — Claude Code

This repository defines **SecOps dependency remediation orchestration**: **granular skills**, **sub-agents**, and **`gh`-first** GitHub automation. **Only GitHub Copilot** writes commits on target branches; orchestration uses **issues, PRs, comments, and GitHub Projects**.

## Documentation

- **Product design:** [docs/produt_design.md](docs/produt_design.md)
- **Config schema:** [docs/secops-agent-config.md](docs/secops-agent-config.md)
- **Config file:** copy `.github-secops-agent.json.template` to `.github-secops-agent.json` and edit.
- **Architecture decisions (ADRs):** [docs/adr/README.md](docs/adr/README.md) — when and how to add records under `docs/adr/`.

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

Run the **`gh-set-active-project`** skill so `.github/project-config.json` points at the **batch** GitHub Project (v2). Commit that file so teammates share context. Changes should be reviewed via **CODEOWNERS** (see below).

Other plugin skills used with SecOps flows: **`gh-issue-management`**, **`gh-project-management`**, **`gh-verifying-context`**.

## SecOps skills and sub-agents (this repo)

**Taxonomy:** Granular **skills** are single-outcome verbs (policy guard + one `gh`/CLI surface); **sub-agents** orchestrate sequences or plugin-heavy Project work. When to add a new SecOps skill: see [ADR 0005](docs/adr/0005-secops-granular-skills-vs-subagents.md).

| Skill                                                                                            | Purpose                                                              |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [secops-build-dependabot-queue](.claude/skills/secops-build-dependabot-queue/SKILL.md)           | Queue repos from config + alerts                                     |
| [secops-create-remediation-issue](.claude/skills/secops-create-remediation-issue/SKILL.md)       | Create remediation issue + task body                                 |
| [secops-assign-copilot-to-issue](.claude/skills/secops-assign-copilot-to-issue/SKILL.md)         | Assign @copilot on existing issue                                    |
| [secops-check-pr-checks](.claude/skills/secops-check-pr-checks/SKILL.md)                         | One-shot PR checks JSON + exit codes (read-only); orchestrators loop |
| [secops-inspect-copilot-agent-tasks](.claude/skills/secops-inspect-copilot-agent-tasks/SKILL.md) | List/view Copilot agent tasks (preview `gh`)                         |
| [secops-post-ci-nudge-comment](.claude/skills/secops-post-ci-nudge-comment/SKILL.md)             | Nudge Copilot on failing CI (issue comment)                          |
| [secops-post-remediation-evidence](.claude/skills/secops-post-remediation-evidence/SKILL.md)     | Post remediation evidence on issue                                   |

| Sub-agent                                                                | Purpose                                    |
| ------------------------------------------------------------------------ | ------------------------------------------ |
| [secops-batch-orchestrator](.claude/agents/secops-batch-orchestrator.md) | Batch queue + concurrency                  |
| [secops-repo-runner](.claude/agents/secops-repo-runner.md)               | Single-repo lifecycle                      |
| [secops-project-board-sync](.claude/agents/secops-project-board-sync.md) | Sync GitHub Project fields (plugin skills) |

## Policy guard CLI (`github-secops-guard`)

Build once: `pnpm --filter @github-secops-agent/ghclt build`.

- `node packages/ghclt/dist/cli.js validate-config --config .github-secops-agent.json`
- `node packages/ghclt/dist/cli.js validate-repo OWNER/REPO --config .github-secops-agent.json`
- `node packages/ghclt/dist/cli.js validate-org ORG --config .github-secops-agent.json`
- `node packages/ghclt/dist/cli.js discover-queue --config .github-secops-agent.json` — JSON work queue from Dependabot alerts (org API with automatic per-repo fallback; see [docs/secops-agent-config.md](docs/secops-agent-config.md) `preferPerRepo`).

SecOps skill scripts under [`.claude/skills/`](.claude/skills/) call this **before** `gh` so issues are not opened against unexpected orgs/repos. See [docs/secops-agent-config.md](docs/secops-agent-config.md) **Canonical guard stanza**.

## Optional helpers

[`packages/ghclt`](packages/ghclt) provides config validation, target policy checks, `github-secops-guard`, and **`gh`** command builders for scripts and tests.

## CODEOWNERS

[.github/CODEOWNERS](.github/CODEOWNERS) requires review for `.github/project-config.json` and `.github-secops-agent.json` so project binding and SecOps policy changes are intentional.
