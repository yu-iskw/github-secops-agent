import { describe, it, expect } from 'vitest';
import { ghApiDependabotAlertsOrgArgs, ghPrChecksArgs, ghPrViewJsonArgs } from './wrapper';

describe('gh command builders', () => {
  it('builds dependabot org alerts args', () => {
    expect([...ghApiDependabotAlertsOrgArgs('acme')]).toEqual([
      'api',
      'orgs/acme/dependabot/alerts',
      '--paginate',
    ]);
  });

  it('builds pr checks args', () => {
    expect([...ghPrChecksArgs('o', 'r', 3)]).toEqual(['pr', 'checks', '3', '--repo', 'o/r']);
  });

  it('builds pr view json args', () => {
    expect(ghPrViewJsonArgs('o', 'r', 1).join(' ')).toContain('statusCheckRollup');
  });
});
