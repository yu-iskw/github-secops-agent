/** One entry from `gh pr view --json statusCheckRollup`. */
export type StatusCheckRollupEntry = {
  status?: string;
  conclusion?: string | null;
};

/** Subset of `gh pr view` JSON used for classification. */
export type PrViewForClassify = {
  mergeStateStatus?: string;
  statusCheckRollup?: StatusCheckRollupEntry[] | null;
};

export type CiOutcome = 'green' | 'failing' | 'pending' | 'blocked_manual_ci' | 'unknown';

export type BlockedHint = 'workflow_action_required';

/** Single-line JSON emitted by `pr-check` (stdout). */
export type PrCheckJson = {
  outcome: CiOutcome;
  pr: number;
  url: string;
  mergeStateStatus: string | undefined;
  mergeable: string | undefined;
  headRefName: string | undefined;
  checksSummary: string;
  isDraft?: boolean;
  reviewDecision?: string | null;
  blockedHint?: BlockedHint | null;
  workflowRunsAnalyzed?: number;
};

export type WorkflowRunRow = {
  conclusion?: string | null;
  status?: string | null;
};
