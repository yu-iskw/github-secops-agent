import { describe, it, expect } from 'vitest';
import {
  ghApiDependabotAlertsOrgArgs,
  ghPrChecksArgs,
  ghPrViewJsonArgs,
  ghRunListForBranchArgs,
} from './wrapper';

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
    const args = ghPrViewJsonArgs('o', 'r', 1);
    expect(args.join(' ')).toContain('statusCheckRollup');
    expect(args.join(' ')).toContain('mergeable');
    expect(args.join(' ')).toContain('headRefName');
  });

  it('builds run list args for branch', () => {
    expect([...ghRunListForBranchArgs('o', 'r', 'feat/x', 15)]).toEqual([
      'run',
      'list',
      '--repo',
      'o/r',
      '--branch',
      'feat/x',
      '--limit',
      '15',
      '--json',
      'databaseId,workflowName,conclusion,status,displayTitle,url,headBranch',
    ]);
  });
});
