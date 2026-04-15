/** Optional GitHub Project v2 binding; must stay in sync with `.github/project-config.json`. */
export interface SecOpsGithubProject {
  /** Same value as `project_id` in `.github/project-config.json` (gh-set-active-project). */
  projectNodeId: string;
  /** Optional metadata for operators (org login). */
  owner?: string;
  /** Optional: project number in the owner’s Projects list. */
  projectNumber?: number;
  /** Optional: human-readable title. */
  title?: string;
}

/** Parsed `.github-secops-agent.json` (see repo root `.github-secops-agent.json.template`). */
export interface SecOpsConfig {
  version: number;
  organizations: SecOpsOrganization[];
  orchestration: SecOpsOrchestration;
  githubProject?: SecOpsGithubProject;
  evidence: SecOpsEvidence;
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
  maxConcurrentRepos: number;
  priority: string[];
  nudgeRounds: number;
  pollIntervalSeconds: number;
  partialAfterMinutes: number;
}

export interface SecOpsEvidence {
  mode: string;
  targetMode: string;
}
