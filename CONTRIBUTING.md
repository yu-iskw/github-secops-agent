# Contributing

This guide is for **developers contributing to this repository**: the [`@github-secops-agent/ghclt`](packages/ghclt) CLI, SecOps skills under [`.claude/skills/`](.claude/skills/), and documentation.

If you are **operating** the SecOps workflow (policy, `gh`, skills as a user), start with [README.md](README.md) and [docs/product_design.md](docs/product_design.md).

## Prerequisites

- **Node.js** and **pnpm** — match [`.node-version`](.node-version) and root [`package.json`](package.json) `engines`.
- **[`gh`](https://cli.github.com/)** — useful for exercising skills and manual checks against real GitHub data (optional for pure `ghclt` unit tests).

Optional: install Trunk’s hermetic tools ahead of time (offline or CI):

```bash
pnpm exec trunk install
```

A global `trunk` on your PATH is optional; see [Trunk installation](https://docs.trunk.io/references/cli/getting-started/install).

## Setup

```bash
pnpm install
```

## Common commands

From the repository root (see [`package.json`](package.json) scripts):

| Script        | Purpose                                                  |
| ------------- | -------------------------------------------------------- |
| `pnpm build`  | Build all workspace packages (`pnpm --recursive build`). |
| `pnpm test`   | Run Vitest (`vitest run`).                               |
| `pnpm lint`   | Trunk check, ESLint, Knip.                               |
| `pnpm format` | Trunk fmt, ESLint `--fix`, Prettier write.               |

There is **no** root `pnpm dev` script.

## Package layout

- **[`packages/ghclt`](packages/ghclt)** — TypeScript library and **`github-secops-guard`** CLI ([`packages/ghclt/src/cli.ts`](packages/ghclt/src/cli.ts)). This is the only package under `packages/` today.

### Working on `ghclt`

```bash
pnpm --filter @github-secops-agent/ghclt build
pnpm test
```

`pnpm test` runs Vitest from the repo root ([`vitest.config.ts`](vitest.config.ts) includes `packages/*/src/**/*.test.ts`). To narrow to this package:

```bash
pnpm exec vitest run packages/ghclt
```

The build runs `tsc` and [`packages/ghclt/scripts/copy-schema.mjs`](packages/ghclt/scripts/copy-schema.mjs) so the JSON Schema at [`packages/ghclt/src/config/secops-config.schema.json`](packages/ghclt/src/config/secops-config.schema.json) is available next to compiled output for `github-secops-guard config-schema`. Contract tests include [`packages/ghclt/src/config/secops-config.schema.test.ts`](packages/ghclt/src/config/secops-config.schema.test.ts).

**Boundary:** `ghclt` validates config and classifies PR/check JSON from files; it **does not spawn `gh`** for guard or `pr-check`. Skills and operators invoke `gh` separately.

## SecOps skills and shell scripts

- **Policy first:** Scripts should resolve repo root, load config, run **`github-secops-guard`** (`validate-repo` or `validate-config` as appropriate), then `exec gh …` or a single CLI surface. See [ADR 0002](docs/adr/0002-secops-policy-guardrails-and-skill-shell-scripts.md).
- **One skill, one outcome:** Prefer small composable skills over monolithic runbooks. When to add a skill vs compose existing ones: [ADR 0005](docs/adr/0005-secops-granular-skills-vs-subagents.md).
- Scripts typically live under `.claude/skills/<skill-name>/scripts/`.

## Policy and project config files

Changes to **`.github-secops-agent.json`** (SecOps policy) or repo-root **`project-config.json`** (GitHub Project binding) should be intentional. [.github/CODEOWNERS](.github/CODEOWNERS) lists required reviewers for those paths.

Validate before committing:

```bash
pnpm --filter @github-secops-agent/ghclt build
node packages/ghclt/dist/cli.js validate-config --config .github-secops-agent.json
```

## Architecture Decision Records

Record **architecturally significant** changes in [docs/adr/](docs/adr/). See [docs/adr/README.md](docs/adr/README.md) for the index, when to add an ADR, and how to create one (including `adr-tools` and the helper script referenced there).

## License

By contributing, you agree that your contributions are licensed under the same terms as the project ([Apache-2.0](LICENSE)).
