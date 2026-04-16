#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validateSecopsConfig } from './config/validate';
import type { SecOpsConfig } from './config/types';
import { validateProjectConfigFileAtRepoRoot } from './policy/project-binding';
import { validateOrganizationId, validateTargetRepository } from './policy/target-policy';
import { parsePrCheckIngestArgs, runPrCheckIngest } from './pr-check/ingest';

function usage(): void {
  process.stderr.write(`github-secops-guard — validate policy before gh mutations

Usage:
  github-secops-guard validate-config [--config PATH]
    validates .github-secops-agent.json and repo-root project-config.json when present
  github-secops-guard validate-repo OWNER/REPO [--config PATH]
  github-secops-guard validate-org ORG [--config PATH]
  github-secops-guard pr-check --repo OWNER/REPO --pr-json-file PATH [--runs-json-file PATH] [--config PATH]

pr-check reads JSON from files produced by \`gh pr view --json …\` and optional \`gh run list --json …\`.
  gh is not invoked here — run gh in your shell/skill first.

Discover-queue: use packages/ghclt/scripts/run-discover-queue.mjs (injects gh) or call runDiscoverQueue from Node with { gh }.

Environment:
  SECOPS_CONFIG   Default config path (default: .github-secops-agent.json relative to cwd)

Exit 0 if allowed / valid; exit 1 otherwise (pr-check uses 0–3 for CI outcomes).
`);
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

function runWithConfig(sub: string, args: string[], config: SecOpsConfig): void {
  if (sub === 'pr-check') {
    const flags = parsePrCheckIngestArgs(args.slice(1));
    if (!flags) {
      usage();
      process.exit(1);
    }
    runPrCheckIngest(config, flags);
    return;
  }

  if (sub === 'validate-repo') {
    const full = args[1];
    if (!full) {
      usage();
      process.exit(1);
    }
    const r = validateTargetRepository(config, full);
    if (!r.ok) {
      process.stderr.write(`secops: REJECTED: ${r.reason}\n`);
      process.exit(1);
    }
    process.stderr.write(`secops: repo allowed: ${full.trim()}\n`);
    process.exit(0);
  }

  if (sub === 'validate-org') {
    const org = args[1];
    if (!org) {
      usage();
      process.exit(1);
    }
    const r = validateOrganizationId(config, org);
    if (!r.ok) {
      process.stderr.write(`secops: REJECTED: ${r.reason}\n`);
      process.exit(1);
    }
    process.stderr.write(`secops: org allowed: ${org.trim()}\n`);
    process.exit(0);
  }

  usage();
  process.exit(1);
}

function main(argv: string[]): void {
  const args = [...argv];
  let configPath = process.env.SECOPS_CONFIG ?? '.github-secops-agent.json';

  const cfgIdx = args.indexOf('--config');
  if (cfgIdx !== -1) {
    const p = args[cfgIdx + 1];
    if (!p) {
      process.stderr.write('secops: --config requires a path\n');
      process.exit(1);
    }
    configPath = p;
    args.splice(cfgIdx, 2);
  }

  const sub = args[0];
  if (!sub || sub === '-h' || sub === '--help') {
    usage();
    process.exit(sub ? 0 : 1);
  }

  const absConfig = resolve(process.cwd(), configPath);

  if (sub === 'validate-config') {
    runValidateConfig(absConfig);
    return;
  }

  const config = loadConfig(absConfig);
  runWithConfig(sub, args, config);
}

main(process.argv.slice(2));
