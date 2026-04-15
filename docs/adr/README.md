# Architecture Decision Records (ADRs)

This directory holds [Architecture Decision Records](https://adr.github.io/) for **durable design choices** in this repository.

## Index

| ADR                                                                  | Title                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [0001](0001-record-architecture-decisions.md)                        | Record architecture decisions (meta: why ADRs).                                                               |
| [0002](0002-secops-policy-guardrails-and-skill-shell-scripts.md)     | SecOps policy guardrails, `github-secops-guard`, self-contained skill shell scripts.                          |
| [0003](0003-secops-orchestration-with-claude-code-copilot-and-gh.md) | SecOps orchestration: Claude Code skills/sub-agents, Copilot-only branch author, `gh`, github-project-skills. |
| [0004](0004-issue-project-copilot-workflow-order-and-kanban.md)      | Issue → Project → Copilot order, `maxConcurrentRepos`, Kanban automations vs fallback sync.                   |
| [0005](0005-secops-granular-skills-vs-subagents.md)                  | SecOps granular skills vs sub-agents: taxonomy, when to add a skill, deferred options.                        |

The ADR directory is configured via [`.adr-dir`](../../.adr-dir) at the repo root (for `adr-tools`).

## When to add a new ADR

Record an ADR when the change is **architecturally significant**, not for every PR. Good triggers:

- New orchestration boundary (e.g. a runtime beyond local Claude Code).
- Security or policy model change (who may edit `.github-secops-agent.json`, new guard semantics).
- Replacing a major integration (e.g. GitHub Project strategy).
- Formalizing a pattern reused across multiple skills or agents.

Skip an ADR for small fixes, typos, or one-off refactors with no lasting design impact.

## How to add an ADR

**Prerequisite:** [`adr-tools`](https://github.com/npryce/adr-tools) installed (`adr` on your `PATH`).

1. From the repository root, create a new ADR (non-interactive stub):

   ```bash
   .claude/skills/dev/manage-adr/scripts/create-adr.sh "Short imperative title"
   ```

   The script prints the new file path (for example `docs/adr/0003-your-title.md`).

2. Edit that file: fill in **Context**, **Decision**, and **Consequences** (and **Status**, usually `Proposed` then `Accepted`). Add a Mermaid diagram if it clarifies components or flows.

3. To **supersede** an older ADR instead of editing it in place:

   ```bash
   .claude/skills/dev/manage-adr/scripts/create-adr.sh -s <N> "New decision title"
   ```

4. Verify: `adr list` from the repo root.

Full agent-oriented instructions: [.claude/skills/dev/manage-adr/SKILL.md](../../.claude/skills/dev/manage-adr/SKILL.md).
