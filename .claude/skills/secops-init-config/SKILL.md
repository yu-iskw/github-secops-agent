---
name: secops-init-config
description: >-
  Structured interview with multiple-choice options and plain-English field context: create or update
  .github-secops-agent.json and optional repo-root project-config.json from operator answers; then run
  github-secops-guard validate-config and optionally config-schema for JSON Schema. Use when bootstrapping
  SecOps policy, GitHub Project binding, or onboarding a repo to this orchestration layout.
---

# secops-init-config

**Workflow:** **Bootstrap** — ask questions, emit JSON at the **repository root**, then **validate** with `ghclt`. Does not call `gh` or mutate GitHub state. SecOps policy and Project binding stay in **two separate files** (no Project id inside `.github-secops-agent.json`). See [docs/product_design.md](../../../docs/product_design.md) and [ADR 0006](../../../docs/adr/0006-submit-observe-act-and-independent-project-config.md).

## When to use

- **Create** or **refresh** `.github-secops-agent.json` from an operator interview.
- **Add** repo-root `project-config.json` when using a GitHub Project (v2).
- Triggers: “set up SecOps config”, “create policy file”, “bootstrap project-config”, “initialize github-secops-agent.json”, “secops-init-config”.

## Interview protocol

1. **Order** — Follow [references/questionnaire.md](references/questionnaire.md) **in sequence**. Each entry has **Ask**, **Plain English**, **Options**, and **Default**; use the Plain English line when presenting the question.
2. **Pace** — **One question at a time** unless the operator asks to batch or fill everything at once.
3. **Options** — Prefer **labeled multiple-choice** (use the host UI’s picker when available, e.g. AskQuestion in Cursor). Each option in the reference maps to an explicit JSON outcome.
4. **Freeform** — For values that are not enumerable, offer a choice first: placeholder / defer, paste in the next message, or resolve with tooling (`gh project view … --format json` for Projects v2 `id`, **`gh-set-active-project`** plugin). Then capture the value on the following turn.
5. **Deferrals** — If the operator says “default” or skips, apply the **Default** line from the questionnaire and [`.github-secops-agent.json.template`](../../../.github-secops-agent.json.template).
6. **Multi-org** — If more than one organization entry is needed, repeat the per-organization block (questionnaire steps 4–8) for each org before orchestration.

## Invariants (every run)

1. **Working directory** — Repo **root** (where the config files belong). Use `SECOPS_CONFIG` only if the operator uses a non-default path (advanced).
2. **Templates** — Start from [`.github-secops-agent.json.template`](../../../.github-secops-agent.json.template) and [`project-config.json.template`](../../../project-config.json.template) for shape and key order.
3. **Separation** — Never add `githubProject` (or any Project node id) to `.github-secops-agent.json`; Project binding is **`project-config.json` only**.
4. **Validate** — After writing files, run **`validate-config`** (see below). Fix errors and re-run until exit code 0.
5. **This repository** — `.github-secops-agent.json` may be **gitignored** here; in **consumer** orchestration repos, commit it and use CODEOWNERS as documented in [CLAUDE.md](../../../CLAUDE.md).

## Questionnaire

The ordered prompts, option labels, and JSON mapping live in [references/questionnaire.md](references/questionnaire.md). **Validator contract** (exact types and rules) remains in [references/validation-rules.md](references/validation-rules.md).

## SecOps JSON Schema (machine-readable)

After `pnpm --filter @github-secops-agent/ghclt build`, run **`github-secops-guard config-schema`** (or `node packages/ghclt/dist/cli.js config-schema`) and attach stdout as the authoritative JSON Schema for `.github-secops-agent.json`. The CLI is implemented with **Commander**; use **`github-secops-guard --help`** for subcommands and global **`--config`**.

Human notes and **`project-config.json`**: [references/validation-rules.md](references/validation-rules.md). When editing by hand, mirror those rules so **`validate-config`** passes.

## Branch A: `.github-secops-agent.json`

1. Collect **version** (must be `1`), **organizations** (non-empty array), **orchestration**, and optionally **notifications**.
2. For each organization: **id**, optional **excludedRepositories**, **discovery** (mode, **minimumSeverity**, optional **preferPerRepo**).
3. Emit **pretty-printed JSON** (2 spaces). Match the template’s top-level key order: `version`, `organizations`, `orchestration`, then `notifications` if present.

## Branch B: `project-config.json` (optional)

Skip if the operator does not use a GitHub Project for this orchestration.

**Preferred:** Run the **`gh-set-active-project`** skill (see [CLAUDE.md](../../../CLAUDE.md) — Plugins: github-project-skills) so **`project_id`** and metadata are correct. If the plugin writes under `.github/`, **copy** the file to repo-root **`project-config.json`** so `ghclt` and skills share one path.

**Alternative:** Ask for **`project_id`** (required non-empty string — Projects v2 node id, e.g. `PVT_kwDO…`) and recommended **`project_title`** (exact board title for `gh issue create --project`, from `gh project list`). Optionally collect **owner**, **repo**, **project_number** (positive integer), **set_at** per tooling. See [`GithubProjectConfigFile`](../../../packages/ghclt/src/policy/project-binding.ts).

**Note:** [`project-config.json.template`](../../../project-config.json.template) shows **project_id**, **project_title**, and optional metadata; **`validate-config` requires `project_id`** when the file exists. **`project_title`** is optional for validation but should be set for orchestration repos so **submit-copilot-task.sh** can default `-p` from the file. Do not ship a `project-config.json` without **`project_id`** unless the operator explicitly wants an invalid stub (discourage).

## Verify

Build `ghclt` if needed, then:

```bash
pnpm --filter @github-secops-agent/ghclt build
node packages/ghclt/dist/cli.js config-schema
node packages/ghclt/dist/cli.js validate-config --config .github-secops-agent.json
```

If `project-config.json` exists at repo root, **`validate-config`** validates it alongside the SecOps file. Address every error line; for SecOps shape prefer **`config-schema`** output; for project binding see [references/validation-rules.md](references/validation-rules.md) and [`project-binding.ts`](../../../packages/ghclt/src/policy/project-binding.ts).

## Related skills

- **secops-discover-remediation-targets** — Uses `.github-secops-agent.json` for policy after bootstrap.
- **gh-set-active-project** (plugin) — Preferred path to populate **`project_id`** for `project-config.json`.
