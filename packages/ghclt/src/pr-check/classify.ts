import type { CiOutcome, PrViewForClassify, StatusCheckRollupEntry } from './types';

const FAILURE_CONCLUSIONS = new Set(['FAILURE', 'TIMED_OUT', 'CANCELLED']);
const INFLIGHT_STATUSES = new Set(['QUEUED', 'IN_PROGRESS', 'WAITING', 'PENDING']);

function countFailures(rollup: StatusCheckRollupEntry[]): number {
  return rollup.filter((e) => FAILURE_CONCLUSIONS.has(String(e.conclusion ?? ''))).length;
}

function countInflight(rollup: StatusCheckRollupEntry[]): number {
  return rollup.filter((e) => INFLIGHT_STATUSES.has(String(e.status ?? ''))).length;
}

/** Build summary string matching prior jq `checksSummary` shape. */
export function buildChecksSummary(rollup: StatusCheckRollupEntry[]): string {
  const n = rollup.length;
  const inflight = countInflight(rollup);
  const failures = countFailures(rollup);
  return `rollup checks=${n}; inflight=${inflight}; failures=${failures}`;
}

/**
 * Classify CI outcome from PR view JSON (rollup + merge state only).
 * Mirrors `.claude/skills/secops-check-pr-checks/scripts/check-repo-ci.sh` jq logic.
 */
export function classifyFromPrView(pr: PrViewForClassify): CiOutcome {
  const rollup = pr.statusCheckRollup ?? [];
  const failures = countFailures(rollup);
  const inflight = countInflight(rollup);

  if (pr.mergeStateStatus === 'CLEAN') {
    return 'green';
  }
  if (pr.mergeStateStatus === 'UNSTABLE' || failures > 0) {
    return 'failing';
  }
  if (inflight > 0) {
    return 'pending';
  }
  if (pr.mergeStateStatus === 'BLOCKED' && inflight === 0 && failures === 0) {
    return 'blocked_manual_ci';
  }
  return 'unknown';
}

/** Exit codes aligned with `check-repo-ci.sh`: 0 green, 1 failing, 2 pending/unknown, 3 blocked_manual_ci. */
export function exitCodeForCiOutcome(o: CiOutcome): number {
  switch (o) {
    case 'green':
      return 0;
    case 'failing':
      return 1;
    case 'pending':
    case 'unknown':
      return 2;
    case 'blocked_manual_ci':
      return 3;
    default: {
      const _exhaustive: never = o;
      return _exhaustive;
    }
  }
}
