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

/** Fields for `gh pr view --json` (PR CI classification + display). */
export const GH_PR_VIEW_JSON_FIELDS =
  'statusCheckRollup,mergeStateStatus,url,number,mergeable,headRefName,isDraft,reviewDecision' as const;

/** `gh pr view` JSON for status rollup and merge metadata. */
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
    GH_PR_VIEW_JSON_FIELDS,
  ];
}

/** `gh run list` JSON for workflow approval / action_required signals. */
export function ghRunListForBranchArgs(
  owner: string,
  repo: string,
  branch: string,
  limit: number,
): readonly string[] {
  if (!owner || !repo || !branch) {
    throw new Error('owner, repo, and branch are required');
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new Error('limit must be between 1 and 100');
  }
  return [
    'run',
    'list',
    '--repo',
    `${owner}/${repo}`,
    '--branch',
    branch,
    '--limit',
    String(limit),
    '--json',
    'databaseId,workflowName,conclusion,status,displayTitle,url,headBranch',
  ];
}
