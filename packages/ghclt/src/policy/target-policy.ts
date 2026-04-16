import type { SecOpsConfig } from '../config/types';

/**
 * Glob with `*` segments (GitHub owner/repo style).
 * Escapes regex metacharacters except `*` which becomes `.*`.
 */
export function matchRepositoryPattern(fullNameLower: string, patternLower: string): boolean {
  const escaped = patternLower.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
  return regex.test(fullNameLower);
}

/**
 * Ensure `owner/repo` is allowed by `.github-secops-agent.json` policy.
 */
export function validateTargetRepository(
  config: SecOpsConfig,
  fullName: string,
): { ok: true } | { ok: false; reason: string } {
  const trimmed = fullName.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: 'Expected OWNER/REPO (single slash)' };
  }
  const ownerLower = parts[0].toLowerCase();
  const repoLower = parts[1].toLowerCase();
  const normalized = `${ownerLower}/${repoLower}`;

  const orgEntry = config.organizations.find((o) => o.id.toLowerCase() === ownerLower);
  if (!orgEntry) {
    return {
      ok: false,
      reason: `Owner "${parts[0]}" is not listed in organizations[].id — refusing to avoid cross-org mistakes`,
    };
  }

  const excluded = orgEntry.excludedRepositories ?? [];
  for (const pat of excluded) {
    if (matchRepositoryPattern(normalized, pat.toLowerCase())) {
      return {
        ok: false,
        reason: `Repository "${trimmed}" matches excludedRepositories pattern: ${pat}`,
      };
    }
  }

  return { ok: true };
}

/** Org id must appear in config (discovery must not trust ad-hoc org strings). */
export function validateOrganizationId(
  config: SecOpsConfig,
  orgId: string,
): { ok: true } | { ok: false; reason: string } {
  const o = orgId.trim().toLowerCase();
  if (!o) {
    return { ok: false, reason: 'Empty organization id' };
  }
  const found = config.organizations.some((x) => x.id.toLowerCase() === o);
  if (!found) {
    return {
      ok: false,
      reason: `Organization "${orgId}" is not listed in organizations[].id`,
    };
  }
  return { ok: true };
}
