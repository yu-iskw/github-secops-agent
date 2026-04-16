import Ajv from 'ajv';
import { describe, it, expect } from 'vitest';
import schema from './secops-config.schema.json';
import { validateSecopsConfig } from './validate';
import { validConfig } from './validate.test';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

describe('secops-config.schema.json', () => {
  it('declares draft-07', () => {
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  });

  it('accepts validator golden validConfig (schema + validateSecopsConfig)', () => {
    expect(validateSchema(validConfig)).toBe(true);
    expect(validateSecopsConfig(validConfig).ok).toBe(true);
  });

  it('rejects invalid version', () => {
    const bad = { ...validConfig, version: 2 };
    expect(validateSchema(bad)).toBe(false);
    expect(validateSecopsConfig(bad).ok).toBe(false);
  });

  it('rejects invalid minimumSeverity', () => {
    const bad = structuredClone(validConfig) as typeof validConfig;
    bad.organizations[0].discovery.minimumSeverity = 'mega';
    expect(validateSchema(bad)).toBe(false);
    expect(validateSecopsConfig(bad).ok).toBe(false);
  });

  it('rejects top-level githubProject', () => {
    const bad = { ...validConfig, githubProject: { projectNodeId: 'PVT_x' } };
    expect(validateSchema(bad)).toBe(false);
    expect(validateSecopsConfig(bad).ok).toBe(false);
  });

  it('rejects orchestration.maxConcurrentRepos', () => {
    const bad = {
      ...validConfig,
      orchestration: {
        ...validConfig.orchestration,
        maxConcurrentRepos: 2,
      },
    };
    expect(validateSchema(bad)).toBe(false);
    expect(validateSecopsConfig(bad).ok).toBe(false);
  });

  it('rejects invalid login in notifications', () => {
    const bad = {
      ...validConfig,
      notifications: {
        agentTaskEscalation: ['bad login'],
        prOrCiEscalation: ['bob'],
      },
    };
    expect(validateSchema(bad)).toBe(false);
    expect(validateSecopsConfig(bad).ok).toBe(false);
  });
});
