#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { validateSecopsConfig } from './config/validate';
import type { SecOpsConfig } from './config/types';
import { validateProjectConfigFileAtRepoRoot } from './policy/project-binding';
import { validateOrganizationId, validateTargetRepository } from './policy/target-policy';
import { runPrCheckIngest } from './pr-check/ingest';

function readPkgVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '../package.json'), 'utf-8');
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function loadConfig(configPath: string): SecOpsConfig {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  const v = validateSecopsConfig(parsed);
  if (!v.ok) {
    process.stderr.write(`secops: invalid config: ${v.errors.join('; ')}\n`);
    process.exit(1);
  }
  return v.config;
}

/** Repo root: parent of `.github-secops-agent.json` when config lives at repo root. */
function resolveRepoRoot(configPathAbs: string): string {
  const ws = process.env.GITHUB_WORKSPACE;
  if (typeof ws === 'string' && ws.length > 0) {
    return resolve(ws);
  }
  return dirname(configPathAbs);
}

function runConfigSchema(): void {
  const schemaPath = join(__dirname, 'config', 'secops-config.schema.json');
  try {
    const raw = readFileSync(schemaPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    process.stdout.write(`${JSON.stringify(parsed, null, 2)}\n`);
    process.exit(0);
  } catch (e) {
    process.stderr.write(
      `secops: could not read JSON Schema: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(1);
  }
}

const DEFAULT_CONFIG_PATH = process.env.SECOPS_CONFIG ?? '.github-secops-agent.json';

/**
 * Repeat `--config` on subcommands so invocations like `validate-repo OWNER/REPO --config PATH` work
 * (Commander does not apply parent-only options after the subcommand). Merge with parent for
 * `github-secops-guard --config PATH validate-repo …`.
 */
function addConfigOption(cmd: Command): Command {
  return cmd.option('--config <path>', 'Path to .github-secops-agent.json', DEFAULT_CONFIG_PATH);
}

function resolveConfigPath(cmd: Command): string {
  const child = cmd.opts() as { config?: string };
  const parent = cmd.parent?.opts() as { config?: string } | undefined;
  const p = child.config ?? parent?.config ?? DEFAULT_CONFIG_PATH;
  return resolve(process.cwd(), p);
}

type PolicyCheckResult = { ok: true } | { ok: false; reason: string };

function exitAfterPolicyCheck(
  cmd: Command,
  arg: string,
  check: (config: SecOpsConfig, arg: string) => PolicyCheckResult,
  successLine: (trimmed: string) => string,
): void {
  const absConfig = resolveConfigPath(cmd);
  const config = loadConfig(absConfig);
  const r = check(config, arg);
  if (!r.ok) {
    process.stderr.write(`secops: REJECTED: ${r.reason}\n`);
    process.exit(1);
  }
  process.stderr.write(`${successLine(arg.trim())}\n`);
  process.exit(0);
}

function runValidateConfig(absConfig: string): void {
  loadConfig(absConfig);
  const repoRoot = resolveRepoRoot(absConfig);
  const proj = validateProjectConfigFileAtRepoRoot(repoRoot);
  if (!proj.ok) {
    for (const e of proj.errors) {
      process.stderr.write(`secops: ${e}\n`);
    }
    process.exit(1);
  }
  if (proj.status === 'absent') {
    process.stderr.write(
      `secops: note: project-config.json not found at repo root (optional; add for GitHub Project v2 binding)\n`,
    );
  }
  process.stderr.write(`secops: config OK (${absConfig})\n`);
  process.exit(0);
}

/** Build the CLI program (exported for tests). */
export function createProgram(): Command {
  const program = addConfigOption(
    new Command()
      .name('github-secops-guard')
      .description(
        'Validate SecOps policy before gh mutations. pr-check classifies JSON from gh pr view / gh run list; gh is not invoked here.',
      )
      .version(readPkgVersion(), '-V, --version')
      .enablePositionalOptions()
      .showHelpAfterError(),
  );

  program
    .command('config-schema')
    .description('Print JSON Schema (draft-07) for .github-secops-agent.json to stdout')
    .action(() => {
      runConfigSchema();
    });

  addConfigOption(
    program
      .command('validate-config')
      .description(
        'Validate .github-secops-agent.json and repo-root project-config.json when present',
      ),
  ).action((_opts, cmd) => {
    const absConfig = resolveConfigPath(cmd);
    runValidateConfig(absConfig);
  });

  addConfigOption(
    program
      .command('validate-repo')
      .description('Check whether owner/repo is allowed by policy')
      .argument('<ownerRepo>', 'Repository as owner/name'),
  ).action((ownerRepo: string, _opts, cmd) => {
    exitAfterPolicyCheck(
      cmd,
      ownerRepo,
      validateTargetRepository,
      (t) => `secops: repo allowed: ${t}`,
    );
  });

  addConfigOption(
    program
      .command('validate-org')
      .description('Check whether an organization is allowed by policy')
      .argument('<org>', 'Organization id'),
  ).action((org: string, _opts, cmd) => {
    exitAfterPolicyCheck(cmd, org, validateOrganizationId, (t) => `secops: org allowed: ${t}`);
  });

  addConfigOption(
    program
      .command('pr-check')
      .description('Classify PR/check status from JSON files produced by gh (does not invoke gh)')
      .requiredOption('--repo <owner/repo>', 'Repository owner/name')
      .requiredOption('--pr-json-file <path>', 'Path to gh pr view --json output')
      .option('--runs-json-file <path>', 'Path to gh run list --json output'),
  ).action((_opts, cmd) => {
    const o = cmd.opts() as {
      repo: string;
      prJsonFile: string;
      runsJsonFile?: string;
    };
    const absConfig = resolveConfigPath(cmd);
    const config = loadConfig(absConfig);
    runPrCheckIngest(config, {
      repoFull: o.repo,
      prJsonFile: o.prJsonFile,
      runsJsonFile: o.runsJsonFile,
    });
  });

  return program;
}

export function main(argv: string[] = process.argv): void {
  createProgram().parse(argv);
}

if (require.main === module) {
  main();
}
