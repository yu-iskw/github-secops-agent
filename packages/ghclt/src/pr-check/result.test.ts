import { describe, it, expect } from 'vitest';
import {
  blockedHintFromRuns,
  composePrCheckJson,
  hasActionRequiredRun,
  prViewFromGhJson,
} from './result';

describe('prViewFromGhJson', () => {
  it('parses minimal valid pr view', () => {
    const v = prViewFromGhJson({
      number: 1,
      url: 'https://github.com/o/r/pull/1',
      mergeStateStatus: 'BLOCKED',
      statusCheckRollup: [],
      mergeable: 'MERGEABLE',
      headRefName: 'feat',
      isDraft: false,
      reviewDecision: null,
    });
    expect(v.number).toBe(1);
    expect(v.headRefName).toBe('feat');
  });

  it('throws on invalid input', () => {
    expect(() => prViewFromGhJson(null)).toThrow();
  });
});

describe('hasActionRequiredRun / blockedHintFromRuns', () => {
  it('detects action_required', () => {
    expect(hasActionRequiredRun([{ conclusion: 'action_required' }])).toBe(true);
    expect(blockedHintFromRuns([{ conclusion: 'action_required' }])).toBe(
      'workflow_action_required',
    );
  });

  it('false when absent', () => {
    expect(hasActionRequiredRun([])).toBe(false);
    expect(blockedHintFromRuns([{ conclusion: 'success' }])).toBe(null);
  });
});

describe('composePrCheckJson', () => {
  it('adds blockedHint when runs have action_required', () => {
    const pr = {
      number: 2,
      url: 'https://github.com/o/r/pull/2',
      mergeStateStatus: 'BLOCKED',
      statusCheckRollup: [],
    };
    const { json } = composePrCheckJson({
      prRaw: pr,
      workflowRuns: [{ conclusion: 'action_required', status: 'completed' }],
      workflowRunsAnalyzed: 3,
    });
    expect(json.blockedHint).toBe('workflow_action_required');
    expect(json.workflowRunsAnalyzed).toBe(3);
  });

  it('omits run fields when --no-runs', () => {
    const pr = {
      number: 3,
      url: 'https://github.com/o/r/pull/3',
      mergeStateStatus: 'CLEAN',
      statusCheckRollup: [],
    };
    const { json } = composePrCheckJson({ prRaw: pr });
    expect(json.blockedHint).toBeUndefined();
    expect(json.workflowRunsAnalyzed).toBeUndefined();
  });
});
