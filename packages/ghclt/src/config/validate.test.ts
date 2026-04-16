import { describe, it, expect } from 'vitest';
import type { SecOpsConfig } from './types';
import { validateSecopsConfig } from './validate';

const validConfig = {
  version: 1,
  organizations: [
    {
      id: 'acme',
      includedRepositories: [],
      excludedRepositories: ['acme/skip'],
      discovery: {
        mode: 'dependabot_alerts',
        minimumSeverity: 'high',
      },
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
};

describe('validateSecopsConfig', () => {
  it('accepts a valid config', () => {
    const r = validateSecopsConfig(validConfig);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.organizations[0].id).toBe('acme');
    }
  });

  it('rejects invalid version', () => {
    const r = validateSecopsConfig({ ...validConfig, version: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('version'))).toBe(true);
    }
  });

  it('rejects bad severity', () => {
    const bad = structuredClone(validConfig) as typeof validConfig;
    bad.organizations[0].discovery.minimumSeverity = 'mega';
    const r = validateSecopsConfig(bad);
    expect(r.ok).toBe(false);
  });

  it('rejects non-boolean preferPerRepo', () => {
    const bad = structuredClone(validConfig) as Record<string, unknown>;
    (bad.organizations as { discovery: { preferPerRepo: string } }[])[0].discovery.preferPerRepo =
      'yes' as unknown as string;
    const r = validateSecopsConfig(bad);
    expect(r.ok).toBe(false);
  });

  it('accepts preferPerRepo boolean', () => {
    const ok = structuredClone(validConfig) as typeof validConfig;
    ok.organizations[0].discovery = {
      ...ok.organizations[0].discovery,
      preferPerRepo: true,
    } as SecOpsConfig['organizations'][0]['discovery'];
    const r = validateSecopsConfig(ok);
    expect(r.ok).toBe(true);
  });

  it('rejects deprecated githubProject', () => {
    const bad = { ...validConfig, githubProject: { projectNodeId: 'PVT_x' } };
    const r = validateSecopsConfig(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('githubProject'))).toBe(true);
    }
  });

  it('accepts optional notifications', () => {
    const ok = {
      ...validConfig,
      notifications: {
        agentTaskEscalation: ['alice'],
        prOrCiEscalation: ['bob'],
      },
    };
    const r = validateSecopsConfig(ok);
    expect(r.ok).toBe(true);
  });

  it('rejects invalid login in notifications', () => {
    const bad = {
      ...validConfig,
      notifications: {
        agentTaskEscalation: ['bad login'],
        prOrCiEscalation: ['bob'],
      },
    };
    const r = validateSecopsConfig(bad);
    expect(r.ok).toBe(false);
  });

  it('rejects legacy orchestration.maxConcurrentRepos', () => {
    const bad = {
      ...validConfig,
      orchestration: {
        ...validConfig.orchestration,
        maxConcurrentRepos: 2,
      },
    };
    const r = validateSecopsConfig(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('maxConcurrentRepos'))).toBe(true);
    }
  });
});
