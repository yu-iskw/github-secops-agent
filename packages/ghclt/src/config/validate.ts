import type { SecOpsConfig } from './types';
import { isRecord } from '../utils/is-record';

const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function expectString(value: unknown, path: string): string | string[] {
  if (typeof value !== 'string' || value.length === 0) {
    return [`${path} must be a non-empty string`];
  }
  return value;
}

/**
 * Validate config shape for the SecOps orchestrator. Pure — no `gh` calls.
 */
export function validateSecopsConfig(
  input: unknown,
): { ok: true; config: SecOpsConfig } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['Root must be an object'] };
  }
  if (input.version !== 1) {
    errors.push('version must be 1');
  }
  if (!Array.isArray(input.organizations) || input.organizations.length === 0) {
    errors.push('organizations must be a non-empty array');
  } else {
    input.organizations.forEach((org, i) => {
      if (!isRecord(org)) {
        errors.push(`organizations[${i}] must be an object`);
        return;
      }
      const id = expectString(org.id, `organizations[${i}].id`);
      if (Array.isArray(id)) errors.push(...id);
      if (org.includedRepositories !== undefined) {
        if (
          !Array.isArray(org.includedRepositories) ||
          !org.includedRepositories.every((x) => typeof x === 'string')
        ) {
          errors.push(`organizations[${i}].includedRepositories must be string[]`);
        }
      }
      if (org.excludedRepositories !== undefined) {
        if (
          !Array.isArray(org.excludedRepositories) ||
          !org.excludedRepositories.every((x) => typeof x === 'string')
        ) {
          errors.push(`organizations[${i}].excludedRepositories must be string[]`);
        }
      }
      if (!isRecord(org.discovery)) {
        errors.push(`organizations[${i}].discovery must be an object`);
      } else {
        const mode = expectString(org.discovery.mode, `organizations[${i}].discovery.mode`);
        if (Array.isArray(mode)) errors.push(...mode);
        const sev = expectString(
          org.discovery.minimumSeverity,
          `organizations[${i}].discovery.minimumSeverity`,
        );
        if (Array.isArray(sev)) errors.push(...sev);
        else if (!SEVERITIES.has(sev.toLowerCase())) {
          errors.push(
            `organizations[${i}].discovery.minimumSeverity must be one of: ${[...SEVERITIES].join(', ')}`,
          );
        }
        if (
          org.discovery.preferPerRepo !== undefined &&
          typeof org.discovery.preferPerRepo !== 'boolean'
        ) {
          errors.push(`organizations[${i}].discovery.preferPerRepo must be a boolean when set`);
        }
      }
    });
  }
  if (!isRecord(input.orchestration)) {
    errors.push('orchestration must be an object');
  } else {
    const o = input.orchestration;
    const numericFields: string[] = [
      'maxConcurrentRepos',
      'nudgeRounds',
      'pollIntervalSeconds',
      'partialAfterMinutes',
    ];
    for (const label of numericFields) {
      const v = o[label];
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        errors.push(`orchestration.${label} must be a positive number`);
      }
    }
    if (
      !Array.isArray(o.priority) ||
      o.priority.length === 0 ||
      !o.priority.every((p: unknown) => typeof p === 'string')
    ) {
      errors.push('orchestration.priority must be a non-empty string array');
    }
  }
  if (!isRecord(input.evidence)) {
    errors.push('evidence must be an object');
  } else {
    const mode = expectString(input.evidence.mode, 'evidence.mode');
    if (Array.isArray(mode)) errors.push(...mode);
    const tm = expectString(input.evidence.targetMode, 'evidence.targetMode');
    if (Array.isArray(tm)) errors.push(...tm);
  }
  if (input.githubProject !== undefined) {
    if (!isRecord(input.githubProject)) {
      errors.push('githubProject must be an object when set');
    } else {
      const gp = input.githubProject;
      const pid = expectString(gp.projectNodeId, 'githubProject.projectNodeId');
      if (Array.isArray(pid)) errors.push(...pid);
      if (gp.owner !== undefined && typeof gp.owner !== 'string') {
        errors.push('githubProject.owner must be a string when set');
      }
      if (gp.projectNumber !== undefined) {
        if (
          typeof gp.projectNumber !== 'number' ||
          !Number.isFinite(gp.projectNumber) ||
          gp.projectNumber < 1
        ) {
          errors.push('githubProject.projectNumber must be a positive number when set');
        }
      }
      if (gp.title !== undefined && typeof gp.title !== 'string') {
        errors.push('githubProject.title must be a string when set');
      }
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, config: input as unknown as SecOpsConfig };
}
