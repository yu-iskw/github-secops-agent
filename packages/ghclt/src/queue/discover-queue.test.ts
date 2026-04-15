import { describe, it, expect } from 'vitest';
import type { SecOpsConfig } from '../config/types';
import { validateSecopsConfig } from '../config/validate';
import {
  runDiscoverQueue,
  severityRank,
  sortReposByPriority,
  type GhRunner,
  type DiscoverQueueRepo,
} from './discover-queue';

const baseConfig: SecOpsConfig = {
  version: 1,
  organizations: [
    {
      id: 'acme',
      discovery: {
        mode: 'dependabot_alerts',
        minimumSeverity: 'high',
      },
    },
  ],
  orchestration: {
    maxConcurrentRepos: 2,
    priority: ['severity', 'oldest_alert'],
    nudgeRounds: 10,
    pollIntervalSeconds: 45,
    partialAfterMinutes: 120,
  },
  evidence: {
    mode: 'mvp_links_only',
    targetMode: 'structured_plus_run_log',
  },
};

function mkAlert(overrides: {
  number: number;
  fullName: string;
  severity: string;
  createdAt?: string;
  state?: string;
}): Record<string, unknown> {
  const createdAt = overrides.createdAt ?? '2026-01-15T00:00:00Z';
  return {
    number: overrides.number,
    state: overrides.state ?? 'open',
    created_at: createdAt,
    repository: { full_name: overrides.fullName },
    security_advisory: { severity: overrides.severity },
  };
}

describe('severityRank', () => {
  it('orders severities', () => {
    expect(severityRank('low')).toBeLessThan(severityRank('critical'));
    expect(severityRank(null)).toBe(-1);
  });
});

describe('sortReposByPriority', () => {
  it('sorts by severity then oldest_alert', () => {
    const repos: DiscoverQueueRepo[] = [
      {
        fullName: 'acme/a',
        worstSeverity: 'medium',
        oldestOpenAlertAt: '2026-01-01T00:00:00Z',
        alerts: [],
      },
      {
        fullName: 'acme/b',
        worstSeverity: 'critical',
        oldestOpenAlertAt: '2026-06-01T00:00:00Z',
        alerts: [],
      },
      {
        fullName: 'acme/c',
        worstSeverity: 'critical',
        oldestOpenAlertAt: '2026-01-01T00:00:00Z',
        alerts: [],
      },
    ];
    const sorted = sortReposByPriority(repos, ['severity', 'oldest_alert']);
    expect(sorted.map((r) => r.fullName)).toEqual(['acme/c', 'acme/b', 'acme/a']);
  });
});

describe('runDiscoverQueue', () => {
  it('uses org dependabot API when it succeeds', () => {
    const cfg = validateSecopsConfig(baseConfig);
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;

    const alerts = [
      mkAlert({
        number: 1,
        fullName: 'acme/svc',
        severity: 'high',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ];
    const gh: GhRunner = (args) => {
      if (args[1] === 'orgs/acme/dependabot/alerts') {
        return { ok: true, stdout: JSON.stringify(alerts), stderr: '' };
      }
      return { ok: false, stdout: '', stderr: `unexpected: ${args.join(' ')}` };
    };

    const out = runDiscoverQueue(cfg.config, '/tmp/cfg.json', { gh, log: () => {} });
    expect(out.organizations[0].source).toBe('dependabot_org_api');
    expect(out.organizations[0].repos).toHaveLength(1);
    expect(out.organizations[0].repos[0].fullName).toBe('acme/svc');
  });

  it('filters by minimumSeverity', () => {
    const cfg = validateSecopsConfig(baseConfig);
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;

    const alerts = [
      mkAlert({
        number: 1,
        fullName: 'acme/svc',
        severity: 'medium',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ];
    const gh: GhRunner = (args) => {
      if (args[1] === 'orgs/acme/dependabot/alerts') {
        return { ok: true, stdout: JSON.stringify(alerts), stderr: '' };
      }
      return { ok: false, stdout: '', stderr: '' };
    };

    const out = runDiscoverQueue(cfg.config, '/tmp/cfg.json', { gh, log: () => {} });
    expect(out.organizations[0].repos).toHaveLength(0);
  });

  it('falls back to per-repo when org dependabot fails', () => {
    const cfg = validateSecopsConfig(baseConfig);
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;

    const perRepoAlerts = [
      {
        number: 2,
        state: 'open',
        created_at: '2026-02-01T00:00:00Z',
        security_advisory: { severity: 'high' },
      },
    ];

    const gh: GhRunner = (args) => {
      const path = args[1] ?? '';
      if (path === 'orgs/acme/dependabot/alerts') {
        return { ok: false, stdout: '', stderr: 'HTTP 404' };
      }
      if (path === 'orgs/acme/repos') {
        return { ok: true, stdout: JSON.stringify([{ full_name: 'acme/svc' }]), stderr: '' };
      }
      if (path === 'repos/acme/svc/dependabot/alerts') {
        return { ok: true, stdout: JSON.stringify(perRepoAlerts), stderr: '' };
      }
      return { ok: false, stdout: '', stderr: `unexpected: ${path}` };
    };

    const out = runDiscoverQueue(cfg.config, '/tmp/cfg.json', { gh, log: () => {} });
    expect(out.organizations[0].source).toBe('dependabot_per_repo_fallback');
    expect(out.organizations[0].repos).toHaveLength(1);
    expect(out.organizations[0].repos[0].fullName).toBe('acme/svc');
  });

  it('skips org dependabot when preferPerRepo is true', () => {
    const c = structuredClone(baseConfig) as typeof baseConfig;
    c.organizations[0].discovery = {
      ...c.organizations[0].discovery,
      preferPerRepo: true,
    } as SecOpsConfig['organizations'][0]['discovery'];
    const cfg = validateSecopsConfig(c);
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;

    let orgDependabotCalls = 0;
    const perRepoAlerts = [
      {
        number: 1,
        state: 'open',
        created_at: '2026-02-01T00:00:00Z',
        security_advisory: { severity: 'high' },
      },
    ];

    const gh: GhRunner = (args) => {
      const path = args[1] ?? '';
      if (path === 'orgs/acme/dependabot/alerts') orgDependabotCalls++;
      if (path === 'orgs/acme/repos') {
        return { ok: true, stdout: JSON.stringify([{ full_name: 'acme/svc' }]), stderr: '' };
      }
      if (path === 'repos/acme/svc/dependabot/alerts') {
        return { ok: true, stdout: JSON.stringify(perRepoAlerts), stderr: '' };
      }
      return { ok: false, stdout: '', stderr: `unexpected: ${path}` };
    };

    const out = runDiscoverQueue(cfg.config, '/tmp/cfg.json', { gh, log: () => {} });
    expect(orgDependabotCalls).toBe(0);
    expect(out.organizations[0].source).toBe('dependabot_per_repo_fallback');
    expect(out.organizations[0].repos).toHaveLength(1);
  });

  it('rejects repos excluded by policy', () => {
    const c = structuredClone(baseConfig) as typeof baseConfig;
    c.organizations[0].excludedRepositories = ['acme/svc'];
    const cfg = validateSecopsConfig(c);
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;

    const alerts = [mkAlert({ number: 1, fullName: 'acme/svc', severity: 'high' })];
    const gh: GhRunner = (args) => {
      if (args[1] === 'orgs/acme/dependabot/alerts') {
        return { ok: true, stdout: JSON.stringify(alerts), stderr: '' };
      }
      return { ok: false, stdout: '', stderr: '' };
    };

    const out = runDiscoverQueue(cfg.config, '/tmp/cfg.json', { gh, log: () => {} });
    expect(out.organizations[0].repos).toHaveLength(0);
  });
});
