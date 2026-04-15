import { describe, it, expect } from 'vitest';
import * as api from './index';

describe('public API barrel', () => {
  it('exports core functions', () => {
    expect(typeof api.validateSecopsConfig).toBe('function');
    expect(typeof api.runDiscoverQueue).toBe('function');
    expect(typeof api.parseGhWorkflowRunsStdout).toBe('function');
    expect(typeof api.validateTargetRepository).toBe('function');
    expect(typeof api.classifyFromPrView).toBe('function');
    expect(typeof api.composePrCheckJson).toBe('function');
    expect(typeof api.validateGithubProjectBinding).toBe('function');
  });
});
