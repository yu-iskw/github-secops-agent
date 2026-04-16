/** Mention lists for human notifications; validated by ghclt, read by shell via jq. */
export interface SecOpsNotifications {
  /** Logins for @mentions when Copilot agent-task side needs human attention (issue comment). */
  agentTaskEscalation: string[];
  /** Logins when PR or CI side needs human (PR comment). */
  prOrCiEscalation: string[];
  /** Optional per-org overrides keyed by organizations[].id */
  byOrganization?: Record<string, { agentTaskEscalation?: string[]; prOrCiEscalation?: string[] }>;
}

/** Parsed `.github-secops-agent.json` (see repo root `.github-secops-agent.json.template`). */
export interface SecOpsConfig {
  version: number;
  organizations: SecOpsOrganization[];
  orchestration: SecOpsOrchestration;
  evidence: SecOpsEvidence;
  /** Optional; when set, validated by ghclt. */
  notifications?: SecOpsNotifications;
}

export interface SecOpsOrganization {
  id: string;
  includedRepositories?: string[];
  excludedRepositories?: string[];
  discovery: {
    mode: string;
    minimumSeverity: string;
    /** If true, skip org-level Dependabot alerts and use per-repo APIs only. */
    preferPerRepo?: boolean;
  };
}

export interface SecOpsOrchestration {
  priority: string[];
  nudgeRounds: number;
  pollIntervalSeconds: number;
  partialAfterMinutes: number;
}

export interface SecOpsEvidence {
  mode: string;
  targetMode: string;
}
