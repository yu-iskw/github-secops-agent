import type { SecOpsConfig } from './types';
import { isRecord } from '../utils/is-record';

const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

/** GitHub username / org login (simplified; no consecutive hyphens enforcement). */
const GH_LOGIN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9]))*$/;

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
  if (Object.prototype.hasOwnProperty.call(o, 'maxConcurrentRepos')) {
    errors.push(
      'orchestration.maxConcurrentRepos was removed; control batch parallelism in your orchestrator (shell, CI, or agent fan-out), not in .github-secops-agent.json — see docs/product_design.md',
    );
  }
  const numericFields: string[] = ['nudgeRounds', 'pollIntervalSeconds', 'partialAfterMinutes'];
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

function validateLoginArray(arr: unknown, path: string): string[] {
  if (!Array.isArray(arr)) {
    return [`${path} must be an array of GitHub logins`];
  }
  const errors: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const s = arr[i];
    if (typeof s !== 'string' || !GH_LOGIN.test(s)) {
      errors.push(`${path}[${i}] must be a valid GitHub login string`);
    }
  }
  return errors;
}

function validateNotificationsByOrg(byOrg: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const [orgId, ov] of Object.entries(byOrg)) {
    if (!GH_LOGIN.test(orgId)) {
      errors.push(`notifications.byOrganization key "${orgId}" must be a valid org id`);
      continue;
    }
    if (!isRecord(ov)) {
      errors.push(`notifications.byOrganization.${orgId} must be an object`);
      continue;
    }
    if (ov.agentTaskEscalation !== undefined) {
      errors.push(
        ...validateLoginArray(
          ov.agentTaskEscalation,
          `notifications.byOrganization.${orgId}.agentTaskEscalation`,
        ),
      );
    }
    if (ov.prOrCiEscalation !== undefined) {
      errors.push(
        ...validateLoginArray(
          ov.prOrCiEscalation,
          `notifications.byOrganization.${orgId}.prOrCiEscalation`,
        ),
      );
    }
  }
  return errors;
}

function validateNotifications(n: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (n.agentTaskEscalation === undefined) {
    errors.push('notifications.agentTaskEscalation is required when notifications is set');
  } else {
    errors.push(...validateLoginArray(n.agentTaskEscalation, 'notifications.agentTaskEscalation'));
  }
  if (n.prOrCiEscalation === undefined) {
    errors.push('notifications.prOrCiEscalation is required when notifications is set');
  } else {
    errors.push(...validateLoginArray(n.prOrCiEscalation, 'notifications.prOrCiEscalation'));
  }

  if (n.byOrganization === undefined) {
    return errors;
  }
  if (!isRecord(n.byOrganization)) {
    errors.push('notifications.byOrganization must be an object when set');
    return errors;
  }
  errors.push(...validateNotificationsByOrg(n.byOrganization));
  return errors;
}

/**
 * Validate config shape for the SecOps orchestrator. Pure — no `gh` calls.
 * `githubProject` is rejected — use repo-root `project-config.json` for Project binding.
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

  if (input.githubProject !== undefined) {
    errors.push(
      'githubProject is no longer supported in .github-secops-agent.json; use repo-root project-config.json for GitHub Project binding (see project-config.json.template)',
    );
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

  if (input.notifications !== undefined) {
    if (!isRecord(input.notifications)) {
      errors.push('notifications must be an object when set');
    } else {
      errors.push(...validateNotifications(input.notifications));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, config: input as unknown as SecOpsConfig };
}
