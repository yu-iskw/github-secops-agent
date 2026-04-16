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

  it('allows repo when not excluded', () => {
    const r = validateTargetRepository(baseOrg(), 'acme/allowed');
    expect(r.ok).toBe(true);
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
