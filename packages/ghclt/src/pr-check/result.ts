import { isRecord } from '../utils/is-record';
import { buildChecksSummary, classifyFromPrView, exitCodeForCiOutcome } from './classify';
import type {
  BlockedHint,
  CiOutcome,
  PrCheckJson,
  PrViewForClassify,
  StatusCheckRollupEntry,
  WorkflowRunRow,
} from './types';

function asRollup(raw: unknown): StatusCheckRollupEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isRecord) as StatusCheckRollupEntry[];
}

/** True if any workflow run needs manual action (e.g. approve workflows / environment). */
export function hasActionRequiredRun(runs: WorkflowRunRow[]): boolean {
  return runs.some((r) => r.conclusion === 'action_required');
}

/** Hint for JSON when Actions shows `action_required` conclusions. */
export function blockedHintFromRuns(runs: WorkflowRunRow[]): BlockedHint | null {
  return hasActionRequiredRun(runs) ? 'workflow_action_required' : null;
}

/** Parse `gh run list --json` stdout into workflow rows. */
export function parseGhWorkflowRunsStdout(stdout: string): WorkflowRunRow[] {
  let json: unknown;
  try {
    json = JSON.parse(stdout) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(json)) {
    return [];
  }
  return json.filter(isRecord).map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      conclusion: typeof rec.conclusion === 'string' ? rec.conclusion : null,
      status: typeof rec.status === 'string' ? rec.status : null,
    };
  });
}

/** Parse `gh pr view --json` payload into a typed view for classification + output. */
export function prViewFromGhJson(raw: unknown): {
  prForClassify: PrViewForClassify;
  rollup: StatusCheckRollupEntry[];
  number: number;
  url: string;
  mergeable: string | undefined;
  headRefName: string | undefined;
  isDraft: boolean | undefined;
  reviewDecision: string | null | undefined;
} {
  if (!isRecord(raw)) {
    throw new Error('pr view JSON must be an object');
  }
  const rollup = asRollup(raw.statusCheckRollup);
  const prForClassify: PrViewForClassify = {
    mergeStateStatus: typeof raw.mergeStateStatus === 'string' ? raw.mergeStateStatus : undefined,
    statusCheckRollup: rollup,
  };
  const num = raw.number;
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw new Error('pr view JSON missing number');
  }
  const url = raw.url;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('pr view JSON missing url');
  }
  return {
    prForClassify,
    rollup,
    number: num,
    url,
    mergeable: typeof raw.mergeable === 'string' ? raw.mergeable : undefined,
    headRefName: typeof raw.headRefName === 'string' ? raw.headRefName : undefined,
    isDraft: typeof raw.isDraft === 'boolean' ? raw.isDraft : undefined,
    reviewDecision:
      raw.reviewDecision === null || typeof raw.reviewDecision === 'string'
        ? raw.reviewDecision
        : undefined,
  };
}

export function composePrCheckJson(args: {
  prRaw: unknown;
  workflowRuns?: WorkflowRunRow[] | null;
  /** Set when run list was requested (length may be 0). Omit when --no-runs. */
  workflowRunsAnalyzed?: number;
}): { json: PrCheckJson; exitCode: number } {
  const parsed = prViewFromGhJson(args.prRaw);
  const outcome: CiOutcome = classifyFromPrView(parsed.prForClassify);
  const checksSummary = buildChecksSummary(parsed.rollup);

  const blockedHint =
    args.workflowRuns != null ? blockedHintFromRuns(args.workflowRuns) : undefined;

  const json: PrCheckJson = {
    outcome,
    pr: parsed.number,
    url: parsed.url,
    mergeStateStatus: parsed.prForClassify.mergeStateStatus,
    mergeable: parsed.mergeable,
    headRefName: parsed.headRefName,
    checksSummary,
    isDraft: parsed.isDraft,
    reviewDecision: parsed.reviewDecision,
  };

  if (blockedHint != null) {
    json.blockedHint = blockedHint;
  }
  if (args.workflowRunsAnalyzed !== undefined) {
    json.workflowRunsAnalyzed = args.workflowRunsAnalyzed;
  }

  return { json, exitCode: exitCodeForCiOutcome(outcome) };
}
