import { describe, it, expect } from 'vitest';
import { buildChecksSummary, classifyFromPrView } from './classify';
import type { PrViewForClassify } from './types';

describe('classifyFromPrView', () => {
  it('green when CLEAN', () => {
    const pr: PrViewForClassify = {
      mergeStateStatus: 'CLEAN',
      statusCheckRollup: [{ status: 'FAILURE', conclusion: 'FAILURE' }],
    };
    expect(classifyFromPrView(pr)).toBe('green');
  });

  it('failing when UNSTABLE', () => {
    expect(classifyFromPrView({ mergeStateStatus: 'UNSTABLE', statusCheckRollup: [] })).toBe(
      'failing',
    );
  });

  it('failing when any rollup conclusion is FAILURE', () => {
    expect(
      classifyFromPrView({
        mergeStateStatus: 'BLOCKED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'FAILURE' }],
      }),
    ).toBe('failing');
  });

  it('failing for TIMED_OUT and CANCELLED when not CLEAN', () => {
    const timed: PrViewForClassify = {
      mergeStateStatus: 'BLOCKED',
      statusCheckRollup: [{ conclusion: 'TIMED_OUT' }],
    };
    expect(classifyFromPrView(timed)).toBe('failing');
    expect(
      classifyFromPrView({
        mergeStateStatus: 'BLOCKED',
        statusCheckRollup: [{ conclusion: 'CANCELLED' }],
      }),
    ).toBe('failing');
  });

  it('pending when inflight rollup', () => {
    expect(
      classifyFromPrView({
        mergeStateStatus: 'BLOCKED',
        statusCheckRollup: [{ status: 'IN_PROGRESS', conclusion: '' }],
      }),
    ).toBe('pending');
  });

  it('blocked_manual_ci when BLOCKED and no inflight or failures', () => {
    expect(
      classifyFromPrView({
        mergeStateStatus: 'BLOCKED',
        statusCheckRollup: [],
      }),
    ).toBe('blocked_manual_ci');
  });

  it('unknown for unexpected merge state with empty rollup', () => {
    expect(
      classifyFromPrView({
        mergeStateStatus: 'UNKNOWN',
        statusCheckRollup: [],
      }),
    ).toBe('unknown');
  });

  it('unknown when mergeStateStatus missing', () => {
    expect(classifyFromPrView({ statusCheckRollup: [] })).toBe('unknown');
  });
});

describe('buildChecksSummary', () => {
  it('formats counts', () => {
    expect(buildChecksSummary([])).toBe('rollup checks=0; inflight=0; failures=0');
    expect(
      buildChecksSummary([
        { status: 'IN_PROGRESS', conclusion: '' },
        { status: 'COMPLETED', conclusion: 'FAILURE' },
      ]),
    ).toBe('rollup checks=2; inflight=1; failures=1');
  });
});
