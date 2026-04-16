import { describe, it, expect } from 'vitest';
import type { SecOpsConfig } from '../config/types';
import {
  matchRepositoryPattern,
  validateOrganizationId,
  validateTargetRepository,
} from './target-policy';

const baseOrg = (overrides?: Partial<SecOpsConfig['organizations'][0]>): SecOpsConfig => ({
  version: 1,
  organizations: [
    {
      id: 'acme',
      includedRepositories: [],
      excludedRepositories: ['acme/skip-*'],
      discovery: {
        mode: 'dependabot_alerts',
        minimumSeverity: 'high',
      },
      ...overrides,
    },
  ],
  orchestration: {
    priority: ['severity'],
    nudgeRounds: 10,
    pollIntervalSeconds: 45,
    partialAfterMinutes: 120,
  },
  evidence: {
    mode: 'mvp_links_only',
    targetMode: 'structured_plus_run_log',
  },
});

describe('matchRepositoryPattern', () => {
  it('matches star wildcard', () => {
    expect(matchRepositoryPattern('acme/foo-bar', 'acme/foo-*')).toBe(true);
    expect(matchRepositoryPattern('acme/foo', 'acme/bar-*')).toBe(false);
  });
});

describe('validateTargetRepository', () => {
  it('rejects unknown org', () => {
    const r = validateTargetRepository(baseOrg(), 'evil/other');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('not listed');
  });

  it('rejects excluded pattern', () => {
    const r = validateTargetRepository(baseOrg(), 'acme/skip-repo');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('excluded');
  });

  it('allows repo when included empty', () => {
    const r = validateTargetRepository(baseOrg(), 'acme/allowed');
    expect(r.ok).toBe(true);
  });

  it('requires included when non-empty', () => {
    const cfg = baseOrg({
      includedRepositories: ['acme/app-*'],
    });
    expect(validateTargetRepository(cfg, 'acme/app-web').ok).toBe(true);
    expect(validateTargetRepository(cfg, 'acme/other').ok).toBe(false);
  });
});

describe('validateOrganizationId', () => {
  it('rejects org not in config', () => {
    const r = validateOrganizationId(baseOrg(), 'evil');
    expect(r.ok).toBe(false);
  });

  it('allows listed org', () => {
    expect(validateOrganizationId(baseOrg(), 'acme').ok).toBe(true);
  });
});
