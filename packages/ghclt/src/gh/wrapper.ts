import { spawnSync } from 'node:child_process';

/** `gh api` args for org Dependabot alerts (paginated). */
export function ghApiDependabotAlertsOrgArgs(org: string): readonly string[] {
  if (!org || typeof org !== 'string') {
    throw new Error('org must be a non-empty string');
  }
  return ['api', `orgs/${org}/dependabot/alerts`, '--paginate'];
}

/** `gh pr checks` args for a pull request. */
export function ghPrChecksArgs(owner: string, repo: string, prNumber: number): readonly string[] {
  if (!owner || !repo || !Number.isFinite(prNumber) || prNumber < 1) {
    throw new Error('owner, repo, and positive prNumber are required');
  }
  return ['pr', 'checks', String(prNumber), '--repo', `${owner}/${repo}`];
}

/** `gh pr view` JSON for status rollup. */
export function ghPrViewJsonArgs(owner: string, repo: string, prNumber: number): readonly string[] {
  if (!owner || !repo || !Number.isFinite(prNumber) || prNumber < 1) {
    throw new Error('owner, repo, and positive prNumber are required');
  }
  return [
    'pr',
    'view',
    String(prNumber),
    '--repo',
    `${owner}/${repo}`,
    '--json',
    'statusCheckRollup,mergeStateStatus,url,number',
  ];
}

/**
 * Run `gh` with the given arguments (thin wrapper for scripts; tests avoid calling this).
 */
export function runGh(args: readonly string[]): { ok: boolean; stdout: string; stderr: string } {
  const r = spawnSync('gh', [...args], { encoding: 'utf-8' });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}
