import type { SecOpsConfig } from './types';
import { isRecord } from '../utils/is-record';

const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function expectString(value: unknown, path: string): string | string[] {
  if (typeof value !== 'string' || value.length === 0) {
    return [`${path} must be a non-empty string`];
  }
  return value;
}

function validateOptionalStringArray(value: unknown, path: string, fieldLabel: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((x) => typeof x === 'string')) {
    return [`${path}.${fieldLabel} must be string[]`];
  }
  return [];
}

function validateDiscovery(discovery: Record<string, unknown>, i: number): string[] {
  const errors: string[] = [];
  const prefix = `organizations[${i}].discovery`;

  const mode = expectString(discovery.mode, `${prefix}.mode`);
  if (Array.isArray(mode)) errors.push(...mode);

  const sev = expectString(discovery.minimumSeverity, `${prefix}.minimumSeverity`);
  if (Array.isArray(sev)) errors.push(...sev);
  else if (!SEVERITIES.has(sev.toLowerCase())) {
    errors.push(`${prefix}.minimumSeverity must be one of: ${[...SEVERITIES].join(', ')}`);
  }

  if (discovery.preferPerRepo !== undefined && typeof discovery.preferPerRepo !== 'boolean') {
    errors.push(`${prefix}.preferPerRepo must be a boolean when set`);
  }

  return errors;
}

function validateOrganization(org: unknown, i: number): string[] {
  const errors: string[] = [];
  if (!isRecord(org)) {
    return [`organizations[${i}] must be an object`];
  }

  const id = expectString(org.id, `organizations[${i}].id`);
  if (Array.isArray(id)) errors.push(...id);

  errors.push(
    ...validateOptionalStringArray(
      org.includedRepositories,
      `organizations[${i}]`,
      'includedRepositories',
    ),
    ...validateOptionalStringArray(
      org.excludedRepositories,
      `organizations[${i}]`,
      'excludedRepositories',
    ),
  );

  if (!isRecord(org.discovery)) {
    errors.push(`organizations[${i}].discovery must be an object`);
    return errors;
  }

  errors.push(...validateDiscovery(org.discovery, i));
  return errors;
}

function validateOrganizations(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!Array.isArray(input.organizations) || input.organizations.length === 0) {
    errors.push('organizations must be a non-empty array');
    return errors;
  }
  for (let i = 0; i < input.organizations.length; i++) {
    errors.push(...validateOrganization(input.organizations[i], i));
  }
  return errors;
}

function validateOrchestration(o: Record<string, unknown>): string[] {
  const errors: string[] = [];
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
  return errors;
}

function validateEvidence(ev: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const mode = expectString(ev.mode, 'evidence.mode');
  if (Array.isArray(mode)) errors.push(...mode);
  const tm = expectString(ev.targetMode, 'evidence.targetMode');
  if (Array.isArray(tm)) errors.push(...tm);
  return errors;
}

function validateGithubProject(gp: Record<string, unknown>): string[] {
  const errors: string[] = [];
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
  return errors;
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

  errors.push(...validateOrganizations(input));

  if (!isRecord(input.orchestration)) {
    errors.push('orchestration must be an object');
  } else {
    errors.push(...validateOrchestration(input.orchestration));
  }

  if (!isRecord(input.evidence)) {
    errors.push('evidence must be an object');
  } else {
    errors.push(...validateEvidence(input.evidence));
  }

  if (input.githubProject !== undefined) {
    if (!isRecord(input.githubProject)) {
      errors.push('githubProject must be an object when set');
    } else {
      errors.push(...validateGithubProject(input.githubProject));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, config: input as unknown as SecOpsConfig };
}
