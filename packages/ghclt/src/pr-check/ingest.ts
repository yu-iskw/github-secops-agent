import { readFileSync } from 'node:fs';
import type { SecOpsConfig } from '../config/types';
import { validateTargetRepository } from '../policy/target-policy';
import { composePrCheckJson, parseGhWorkflowRunsStdout } from './result';

export type PrCheckIngestFlags = {
  repoFull: string;
  prJsonFile: string;
  runsJsonFile?: string;
};

/** Parse argv after `pr-check` for ingest mode. */
export function parsePrCheckIngestArgs(tail: string[]): PrCheckIngestFlags | null {
  let repoFull: string | undefined;
  let prJsonFile: string | undefined;
  let runsJsonFile: string | undefined;
  for (let i = 0; i < tail.length; i++) {
    const a = tail[i];
    if (a === '--repo') {
      repoFull = tail[++i];
      if (!repoFull) return null;
      continue;
    }
    if (a === '--pr-json-file') {
      prJsonFile = tail[++i];
      if (!prJsonFile) return null;
      continue;
    }
    if (a === '--runs-json-file') {
      runsJsonFile = tail[++i];
      if (!runsJsonFile) return null;
      continue;
    }
    return null;
  }
  if (!repoFull || !prJsonFile) {
    return null;
  }
  return { repoFull, prJsonFile, runsJsonFile };
}

/**
 * Policy check + classify from gh-fetched JSON files. Exits process (stdout one JSON line, exit 0–3).
 */
export function runPrCheckIngest(config: SecOpsConfig, flags: PrCheckIngestFlags): void {
  const vr = validateTargetRepository(config, flags.repoFull);
  if (!vr.ok) {
    process.stderr.write(`secops: REJECTED: ${vr.reason}\n`);
    process.exit(1);
  }

  let prRaw: unknown;
  try {
    prRaw = JSON.parse(readFileSync(flags.prJsonFile, 'utf-8')) as unknown;
  } catch (e) {
    process.stderr.write(
      `secops: failed to read or parse --pr-json-file: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(2);
  }

  let workflowRuns: ReturnType<typeof parseGhWorkflowRunsStdout> | undefined;
  let workflowRunsAnalyzed: number | undefined;
  if (flags.runsJsonFile) {
    try {
      const text = readFileSync(flags.runsJsonFile, 'utf-8');
      workflowRuns = parseGhWorkflowRunsStdout(text);
      workflowRunsAnalyzed = workflowRuns.length;
    } catch (e) {
      process.stderr.write(
        `secops: failed to read --runs-json-file: ${e instanceof Error ? e.message : String(e)}\n`,
      );
      process.exit(2);
    }
  }

  const { json, exitCode } = composePrCheckJson({
    prRaw,
    workflowRuns,
    workflowRunsAnalyzed,
  });
  process.stdout.write(`${JSON.stringify(json)}\n`);
  process.exit(exitCode);
}
