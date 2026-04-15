import { describe, it, expect } from 'vitest';
import type { SecOpsConfig } from '../config/types';
import { parseProjectConfigJson, validateGithubProjectBinding } from './project-binding';

const minimalConfig = (): SecOpsConfig => ({
  version: 1,
  organizations: [
    {
      id: 'o',
      discovery: { mode: 'dependabot_alerts', minimumSeverity: 'high' },
    },
  ],
  orchestration: {
    maxConcurrentRepos: 1,
    priority: ['severity'],
    nudgeRounds: 1,
    pollIntervalSeconds: 1,
    partialAfterMinutes: 1,
  },
  evidence: { mode: 'mvp_links_only', targetMode: 'structured_plus_run_log' },
});

describe('parseProjectConfigJson', () => {
  it('reads project_id', () => {
    expect(
      parseProjectConfigJson({
        owner: 'acme',
        repo: 'r',
        project_number: 2,
        project_id: 'PVT_kwTEST',
        set_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({ projectNodeId: 'PVT_kwTEST' });
  });

  it('returns null when project_id missing', () => {
    expect(parseProjectConfigJson({ owner: 'a' })).toBeNull();
    expect(parseProjectConfigJson(null)).toBeNull();
  });
});

describe('validateGithubProjectBinding', () => {
  it('skips when githubProject.projectNodeId is unset', () => {
    const c = minimalConfig();
    const r = validateGithubProjectBinding(c, '/tmp/absent-repo-root-xyz');
    expect(r).toEqual({ ok: true });
  });

  it('fails when projectNodeId set but file missing', () => {
    const c = minimalConfig();
    c.githubProject = { projectNodeId: 'PVT_a' };
    const r = validateGithubProjectBinding(c, '/tmp/absent-repo-root-xyz');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]).toContain('missing');
    }
  });
});
