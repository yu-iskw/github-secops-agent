/** Canonical Dependabot / advisory severity ordering (low → high). */
export const DEPENDABOT_SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'] as const;

export const DEPENDABOT_SEVERITY_SET = new Set<string>(DEPENDABOT_SEVERITY_ORDER);

/** Ordinal for tie-breaking and filters; unknown severities return -1. */
export function severityRank(severity: string | null | undefined): number {
  if (!severity) return -1;
  const i = DEPENDABOT_SEVERITY_ORDER.indexOf(
    severity.toLowerCase() as (typeof DEPENDABOT_SEVERITY_ORDER)[number],
  );
  return i === -1 ? -1 : i;
}
