import { describe, it, expect } from 'vitest';
import { parseProjectConfigJson, validateProjectConfigJson } from './project-binding';

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

describe('validateProjectConfigJson', () => {
  it('accepts minimal valid project config', () => {
    const r = validateProjectConfigJson({ project_id: 'PVT_kwX' });
    expect(r.ok).toBe(true);
  });

  it('rejects missing project_id', () => {
    const r = validateProjectConfigJson({ owner: 'o' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('project_id'))).toBe(true);
    }
  });

  it('rejects bad project_number', () => {
    const r = validateProjectConfigJson({ project_id: 'PVT_a', project_number: 0 });
    expect(r.ok).toBe(false);
  });
});
