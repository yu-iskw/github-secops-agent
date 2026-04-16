import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
 * Parse `project-config.json` content and return the Projects v2 node id.
 */
export function parseProjectConfigJson(raw: unknown): { projectNodeId: string } | null {
  if (!isRecord(raw)) return null;
  const id = raw.project_id;
  if (typeof id !== 'string' || id.length === 0) return null;
  return { projectNodeId: id };
}

function expectOptionalString(value: unknown, path: string): string[] {
  if (value === undefined) return [];
  if (typeof value !== 'string') {
    return [`${path} must be a string when set`];
  }
  return [];
}

/**
 * Validate parsed `project-config.json` (repo root). Pure — no filesystem.
 */
export function validateProjectConfigJson(
  parsed: unknown,
): { ok: true; config: GithubProjectConfigFile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(parsed)) {
    return { ok: false, errors: ['project-config.json root must be an object'] };
  }

  const pid = parsed.project_id;
  if (pid === undefined || typeof pid !== 'string' || pid.length === 0) {
    errors.push('project_id must be a non-empty string (Projects v2 node id)');
  }

  errors.push(...expectOptionalString(parsed.owner, 'owner'));
  errors.push(...expectOptionalString(parsed.repo, 'repo'));
  errors.push(...expectOptionalString(parsed.set_at, 'set_at'));

  if (parsed.project_number !== undefined) {
    if (
      typeof parsed.project_number !== 'number' ||
      !Number.isFinite(parsed.project_number) ||
      parsed.project_number < 1
    ) {
      errors.push('project_number must be a positive number when set');
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, config: parsed as GithubProjectConfigFile };
}

/**
 * If `project-config.json` exists at repo root, validate it. If missing, succeed (optional file).
 */
export function validateProjectConfigFileAtRepoRoot(repoRoot: string):
  | {
      ok: true;
      status: 'present' | 'absent';
    }
  | { ok: false; errors: string[] } {
  const path = resolve(repoRoot, 'project-config.json');
  if (!existsSync(path)) {
    return { ok: true, status: 'absent' };
  }

  let rawText: string;
  try {
    rawText = readFileSync(path, 'utf-8');
  } catch (e) {
    return {
      ok: false,
      errors: [`could not read ${path}: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, errors: [`invalid JSON: ${path}`] };
  }

  const v = validateProjectConfigJson(parsed);
  if (!v.ok) {
    return { ok: false, errors: v.errors.map((e) => `${path}: ${e}`) };
  }
  return { ok: true, status: 'present' };
}
