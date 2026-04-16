# secops-init-config — validation rules

**Human-facing interview** (plain-English prompts, multiple-choice options, and JSON mapping per step) lives in [questionnaire.md](questionnaire.md). This file is the **validator contract**: exact types, forbidden fields, and CLI usage — keep it authoritative for `validate-config` behavior.

For **`.github-secops-agent.json`**, prefer the JSON Schema from **`github-secops-guard config-schema`** after building `ghclt` (contract-tested against [`validateSecopsConfig`](../../../../packages/ghclt/src/config/validate.ts)). The CLI uses **Commander**; **`github-secops-guard --help`** lists subcommands.

Supplementary detail and runtime-only behavior: [`validate.ts`](../../../../packages/ghclt/src/config/validate.ts), [`severity.ts`](../../../../packages/ghclt/src/config/severity.ts), [`project-binding.ts`](../../../../packages/ghclt/src/policy/project-binding.ts).

## `.github-secops-agent.json`

| Rule                          | Detail                                                                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root                          | JSON object.                                                                                                                                                                                                                            |
| **version**                   | Must be exactly `1`.                                                                                                                                                                                                                    |
| **githubProject**             | **Forbidden.** Rejected with error; use `project-config.json` for Project binding.                                                                                                                                                      |
| **organizations**             | Non-empty array. Each element: object with **id** (non-empty string), optional **excludedRepositories** (string array if present), **discovery** object.                                                                                |
| **discovery.minimumSeverity** | Must be one of: **`low`**, **`medium`**, **`high`**, **`critical`** (case-insensitive accepted; compared via severity set).                                                                                                             |
| **discovery.preferPerRepo**   | If present, must be boolean.                                                                                                                                                                                                            |
| **orchestration**             | Object. **priority**: non-empty string array. **nudgeRounds**: positive finite number. **maxConcurrentRepos** must **not** appear (removed field).                                                                                      |
| **notifications**             | If present: object with **agentTaskEscalation** and **prOrCiEscalation** (both required), each an array of valid GitHub login strings. Optional **byOrganization**: object keyed by org id; values may override the two arrays per org. |

Login pattern (simplified): GitHub login format enforced for notification entries and `byOrganization` keys — see `GH_LOGIN` in `validate.ts`.

## `project-config.json` (when file exists at repo root)

| Rule                            | Detail                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Root                            | JSON object.                                                                                                        |
| **project_id**                  | **Required**, non-empty string (Projects v2 node id).                                                               |
| **project_title**               | If present, non-empty string — exact Project **title** for `gh issue create --project` (same as `gh project list`). |
| **owner**, **repo**, **set_at** | If present, must be strings.                                                                                        |
| **project_number**              | If present, must be a finite number ≥ 1.                                                                            |

If the file is **absent**, validation does not require it (optional file).

## CLI

```bash
pnpm --filter @github-secops-agent/ghclt build
node packages/ghclt/dist/cli.js --help
node packages/ghclt/dist/cli.js config-schema
node packages/ghclt/dist/cli.js validate-config --config .github-secops-agent.json
```

`--config` may appear on the root command or on each subcommand that loads policy (e.g. `validate-repo OWNER/REPO --config PATH`). Exit code **0** on **`validate-config`** means SecOps config is valid and, if `project-config.json` is present, it passed project binding validation.
