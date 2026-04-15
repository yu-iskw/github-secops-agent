import type { SecOpsConfig, SecOpsOrganization } from '../config/types';
import { ghApiDependabotAlertsOrgArgs } from '../gh/wrapper';
import { validateTargetRepository } from '../policy/target-policy';
import { isRecord } from '../utils/is-record';

export type DiscoverSource = 'dependabot_org_api' | 'dependabot_per_repo_fallback';

export interface DiscoverQueueAlert {
  number: number;
  severity: string;
  state: string;
  createdAt: string;
}

export interface DiscoverQueueRepo {
  fullName: string;
  worstSeverity: string;
  oldestOpenAlertAt: string;
  alerts: DiscoverQueueAlert[];
}

export interface DiscoverQueueOrg {
  id: string;
  source: DiscoverSource;
  repos: DiscoverQueueRepo[];
  notes?: string[];
}

export interface DiscoverQueueOutput {
  version: 1;
  assumptions: string[];
  configPath: string;
  organizations: DiscoverQueueOrg[];
}

export type GhRunner = (args: readonly string[]) => { ok: boolean; stdout: string; stderr: string };

const GH_API_PAGINATE = '--paginate';

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'] as const;

/** Exported for unit tests — ordinal for tie-breaking and filters. */
export function severityRank(severity: string | null | undefined): number {
  if (!severity) return -1;
  const i = SEVERITY_ORDER.indexOf(severity.toLowerCase() as (typeof SEVERITY_ORDER)[number]);
  return i === -1 ? -1 : i;
}

function alertSeverityFromPayload(alert: Record<string, unknown>): string {
  const adv = alert.security_advisory;
  const vuln = alert.security_vulnerability;
  if (isRecord(adv) && typeof adv.severity === 'string') return adv.severity.toLowerCase();
  if (isRecord(vuln) && typeof vuln.severity === 'string') return vuln.severity.toLowerCase();
  return 'low';
}

function parseGhJsonArray(stdout: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function normalizeOpenAlert(
  raw: unknown,
  minimumSeverity: string,
  /** Per-repo Dependabot API often omits `repository`; pass the repo being queried. */
  fullNameFallback?: string | null,
): { fullName: string; slim: DiscoverQueueAlert } | null {
  if (!isRecord(raw)) return null;
  if (raw.state !== 'open') return null;
  const num = raw.number;
  if (typeof num !== 'number' || !Number.isFinite(num)) return null;
  const createdAt = raw.created_at;
  if (typeof createdAt !== 'string') return null;
  const sev = alertSeverityFromPayload(raw);
  if (severityRank(sev) < severityRank(minimumSeverity)) return null;
  const repo = raw.repository;
  let fullName: string | undefined;
  if (isRecord(repo) && typeof repo.full_name === 'string') {
    fullName = repo.full_name;
  }
  if (!fullName && fullNameFallback) fullName = fullNameFallback;
  if (!fullName) return null;
  return {
    fullName,
    slim: {
      number: num,
      severity: sev,
      state: 'open',
      createdAt,
    },
  };
}

function aggregateAlerts(
  config: SecOpsConfig,
  rawAlerts: unknown[],
  minimumSeverity: string,
  fullNameFallback?: string | null,
): Map<string, DiscoverQueueAlert[]> {
  const byRepo = new Map<string, DiscoverQueueAlert[]>();
  for (const item of rawAlerts) {
    const n = normalizeOpenAlert(item, minimumSeverity, fullNameFallback);
    if (!n) continue;
    const allowed = validateTargetRepository(config, n.fullName);
    if (!allowed.ok) continue;
    const list = byRepo.get(n.fullName) ?? [];
    list.push(n.slim);
    byRepo.set(n.fullName, list);
  }
  return byRepo;
}

function reposFromAggregate(aggregated: Map<string, DiscoverQueueAlert[]>): DiscoverQueueRepo[] {
  const repos: DiscoverQueueRepo[] = [];
  for (const [fullName, alertList] of aggregated) {
    if (alertList.length === 0) continue;
    let worst = alertList[0];
    let worstR = severityRank(worst.severity);
    let oldest = worst.createdAt;
    for (const a of alertList) {
      const r = severityRank(a.severity);
      if (r > worstR) {
        worst = a;
        worstR = r;
      }
      if (a.createdAt < oldest) oldest = a.createdAt;
    }
    repos.push({
      fullName,
      worstSeverity: worst.severity,
      oldestOpenAlertAt: oldest,
      alerts: [...alertList].sort((x, y) => x.number - y.number),
    });
  }
  return repos;
}

/** Exported for tests — sort repos per orchestration.priority. */
export function sortReposByPriority(
  repos: DiscoverQueueRepo[],
  priority: string[],
): DiscoverQueueRepo[] {
  const keys = priority.length > 0 ? priority : ['severity', 'oldest_alert'];
  return [...repos].sort((a, b) => {
    for (const k of keys) {
      if (k === 'severity' || k === 'criticality') {
        const d = severityRank(b.worstSeverity) - severityRank(a.worstSeverity);
        if (d !== 0) return d;
      } else if (k === 'oldest_alert') {
        const ta = new Date(a.oldestOpenAlertAt).getTime();
        const tb = new Date(b.oldestOpenAlertAt).getTime();
        if (ta !== tb) return ta - tb;
      }
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

function fetchOrgDependabotAlerts(
  gh: GhRunner,
  org: string,
): { ok: true; alerts: unknown[] } | { ok: false; stderr: string } {
  const r = gh([...ghApiDependabotAlertsOrgArgs(org)]);
  if (!r.ok) return { ok: false, stderr: r.stderr };
  const arr = parseGhJsonArray(r.stdout);
  if (!arr) return { ok: false, stderr: 'secops: expected JSON array from org dependabot alerts' };
  return { ok: true, alerts: arr };
}

function fetchOrgReposFullNames(
  gh: GhRunner,
  org: string,
): { ok: true; names: string[] } | { ok: false; stderr: string } {
  const r = gh(['api', `orgs/${org}/repos`, GH_API_PAGINATE]);
  if (!r.ok) return { ok: false, stderr: r.stderr };
  const arr = parseGhJsonArray(r.stdout);
  if (!arr) return { ok: false, stderr: 'secops: expected JSON array from org repos' };
  const names: string[] = [];
  for (const row of arr) {
    if (isRecord(row) && typeof row.full_name === 'string') names.push(row.full_name);
  }
  return { ok: true, names };
}

function fetchRepoDependabotAlerts(gh: GhRunner, fullName: string): unknown[] {
  const r = gh(['api', `repos/${fullName}/dependabot/alerts`, GH_API_PAGINATE]);
  if (!r.ok) return [];
  const arr = parseGhJsonArray(r.stdout);
  return arr ?? [];
}

/** Entries in includedRepositories without globs — usable when org repo list fails. */
function explicitNonGlobIncludes(orgEntry: SecOpsOrganization): string[] {
  const inc = orgEntry.includedRepositories ?? [];
  const out: string[] = [];
  for (const p of inc) {
    const t = p.trim();
    if (!t || t.includes('*')) continue;
    if (t.includes('/')) out.push(t);
  }
  return out;
}

function discoverOneOrg(
  config: SecOpsConfig,
  orgEntry: SecOpsOrganization,
  gh: GhRunner,
  log: (msg: string) => void,
): DiscoverQueueOrg {
  const org = orgEntry.id.trim();
  const minimumSeverity = orgEntry.discovery.minimumSeverity.toLowerCase();
  const notes: string[] = [];
  const preferPerRepo = orgEntry.discovery.preferPerRepo === true;

  const runFallback = (reason: string): DiscoverQueueOrg => {
    notes.push(reason);
    log(`secops: org ${org}: ${reason}`);
    return runPerRepoFallback(config, orgEntry, gh, log, notes);
  };

  if (preferPerRepo) {
    return runFallback('discovery.preferPerRepo is true — using per-repo Dependabot alerts only');
  }

  const orgTry = fetchOrgDependabotAlerts(gh, org);
  if (!orgTry.ok) {
    return runFallback(
      `org dependabot alerts unavailable (${orgTry.stderr.trim() || 'gh failed'})`,
    );
  }

  const aggregated = aggregateAlerts(config, orgTry.alerts, minimumSeverity);
  let repos = reposFromAggregate(aggregated);
  repos = sortReposByPriority(repos, config.orchestration.priority);

  if (repos.length === 0 && orgTry.alerts.length > 0) {
    notes.push('All org-level alerts were filtered by policy or minimumSeverity.');
  }

  return {
    id: org,
    source: 'dependabot_org_api',
    repos,
    notes: notes.length > 0 ? notes : undefined,
  };
}

function runPerRepoFallback(
  config: SecOpsConfig,
  orgEntry: SecOpsOrganization,
  gh: GhRunner,
  log: (msg: string) => void,
  notes: string[],
): DiscoverQueueOrg {
  const org = orgEntry.id.trim();
  const minimumSeverity = orgEntry.discovery.minimumSeverity.toLowerCase();

  const candidates = new Set<string>();
  const listed = fetchOrgReposFullNames(gh, org);
  if (listed.ok) {
    for (const name of listed.names) {
      const v = validateTargetRepository(config, name);
      if (v.ok) candidates.add(name);
    }
  } else {
    notes.push(`org repos list failed: ${listed.stderr.trim()}`);
    log(`secops: org ${org}: ${listed.stderr.trim()}`);
    for (const name of explicitNonGlobIncludes(orgEntry)) {
      const v = validateTargetRepository(config, name);
      if (v.ok) candidates.add(name);
    }
    if (
      candidates.size === 0 &&
      (orgEntry.includedRepositories ?? []).some((p) => p.includes('*'))
    ) {
      notes.push(
        'Glob patterns in includedRepositories require a successful org repo listing; fix token scopes or use exact owner/repo entries.',
      );
    }
  }

  const merged = new Map<string, DiscoverQueueAlert[]>();

  for (const fullName of candidates) {
    const raw = fetchRepoDependabotAlerts(gh, fullName);
    const agg = aggregateAlerts(config, raw, minimumSeverity, fullName);
    for (const [fn, alerts] of agg) {
      const cur = merged.get(fn) ?? [];
      cur.push(...alerts);
      merged.set(fn, cur);
    }
  }

  let repos = reposFromAggregate(merged);
  repos = sortReposByPriority(repos, config.orchestration.priority);

  return {
    id: org,
    source: 'dependabot_per_repo_fallback',
    repos,
    notes: notes.length > 0 ? notes : undefined,
  };
}

export function runDiscoverQueue(
  config: SecOpsConfig,
  configPathAbs: string,
  options: { gh: GhRunner; log?: (msg: string) => void },
): DiscoverQueueOutput {
  const { gh } = options;
  const log = options.log ?? ((msg: string) => process.stderr.write(`${msg}\n`));

  const organizations: DiscoverQueueOrg[] = [];
  for (const orgEntry of config.organizations) {
    log(`secops: discovering ${orgEntry.id}...`);
    organizations.push(discoverOneOrg(config, orgEntry, gh, log));
  }

  return {
    version: 1,
    assumptions: ['Signals from GitHub Dependabot alerts API only; no local scanner.'],
    configPath: configPathAbs,
    organizations,
  };
}
