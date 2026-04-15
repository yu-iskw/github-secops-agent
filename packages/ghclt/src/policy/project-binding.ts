import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SecOpsConfig } from '../config/types';
import { isRecord } from '../utils/is-record';

/** Shape written by github-project-skills `gh-set-active-project` (see plugin docs). */
export interface GithubProjectConfigFile {
  owner?: string;
  repo?: string;
  project_number?: number;
  /** Projects v2 node id (e.g. PVT_kwDO...). */
  project_id?: string;
  set_at?: string;
}

/**
 * Parse `.github/project-config.json` content and return the Projects v2 node id.
 */
export function parseProjectConfigJson(raw: unknown): { projectNodeId: string } | null {
  if (!isRecord(raw)) return null;
  const id = raw.project_id;
  if (typeof id !== 'string' || id.length === 0) return null;
  return { projectNodeId: id };
}

/**
 * When `config.githubProject.projectNodeId` is set, require `.github/project-config.json`
 * to exist and list the same `project_id` (github-project-skills field name).
 */
export function validateGithubProjectBinding(
  config: SecOpsConfig,
  repoRoot: string,
): { ok: true } | { ok: false; errors: string[] } {
  const expected = config.githubProject?.projectNodeId;
  if (expected === undefined || expected === '') {
    return { ok: true };
  }

  const path = resolve(repoRoot, '.github/project-config.json');
  let rawText: string;
  try {
    rawText = readFileSync(path, 'utf-8');
  } catch {
    return {
      ok: false,
      errors: [
        `githubProject.projectNodeId is set but ${path} is missing; run gh-set-active-project (github-project-skills) or add the file.`,
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, errors: [`invalid JSON: ${path}`] };
  }

  const fromFile = parseProjectConfigJson(parsed);
  if (!fromFile) {
    return {
      ok: false,
      errors: [
        `${path} must contain a non-empty string project_id (Projects v2 node id from gh project list).`,
      ],
    };
  }

  if (fromFile.projectNodeId !== expected) {
    return {
      ok: false,
      errors: [
        `GitHub Project mismatch: .github-secops-agent.json githubProject.projectNodeId is ${expected} but ${path} project_id is ${fromFile.projectNodeId}`,
      ],
    };
  }

  return { ok: true };
}
