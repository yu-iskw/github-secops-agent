# secops-init-config — questionnaire

Ask **in order**. Use **Plain English** when reading the question aloud; use **Options** for multiple choice; apply **Default** when the operator says “default” or defers.

Template for defaults and key order: [`.github-secops-agent.json.template`](../../../../.github-secops-agent.json.template).

**Multi-org:** If the policy must include **more than one** entry in `organizations`, repeat **steps 4–8** once per org (each with its own `id`, repo filters, and `discovery`) before step 9.

---

## Scope

### 1. Files needed

- **Ask:** Which files should we create or update at the repo root?
- **Plain English:** SecOps **policy** lives in `.github-secops-agent.json`. **GitHub Project (v2) binding** (dashboard / board id) lives in a **separate** `project-config.json` — never put a Project id inside the SecOps file.
- **Options:**
  - **SecOps only** — Emit `.github-secops-agent.json` only; do **not** create `project-config.json`.
  - **SecOps + Project** — Emit both files when Project binding is in scope (step 15+ applies).
- **Default:** If unclear, **SecOps only**; add `project-config.json` only if they use a GitHub Project for this orchestration.

### 2. Repo root

- **Ask:** Where will these files be written?
- **Plain English:** Validators and skills assume configs sit at the **repository root** so paths and `validate-config` are predictable.
- **Options:**
  - **This repo’s root** — Current working tree root (confirm explicitly).
  - **Another repo** — Operator names or pastes the target root path; you write files only there.
  - **Non-default SecOps path** — Advanced: operator uses `SECOPS_CONFIG` or `validate-config --config PATH`; still prefer policy **content** matching the template shape.
- **Default:** Assume **current repo root** after confirming one sentence.

---

## `.github-secops-agent.json`

### 3. `version`

- **Ask:** What is `version`?
- **Plain English:** Declares the config schema generation; the tooling only accepts **one** value today.
- **Options:**
  - **`1`** — Only supported value; emit `"version": 1`.
- **Default:** `1`.

### 4. `organizations[].id`

- **Ask:** What GitHub **organization login** or **user login** is this block for?
- **Plain English:** Every policy block is keyed by a GitHub **org or user** (`owner` namespace) for discovery and exclude lists (`validate-repo` allows any repo under this owner except excluded patterns).
- **Options:**
  - **Real login** — Operator pastes the exact string (e.g. `my-org` or `octocat`); use it as `"id"`.
  - **Placeholder** — Use template-style `"my-org"` so they can search-replace later.
  - **I’ll send next** — Wait for the next message; validate format is non-empty string (see [validation-rules.md](validation-rules.md) for login rules where applicable).
- **Default:** `"my-org"` from the template only if they explicitly want a stub.

### 5. `excludedRepositories`

- **Ask:** Which repos or name patterns should be **excluded** from remediation?
- **Plain English:** Optional list of strings (often glob or prefix patterns per org convention) so archived or experimental repos are skipped by **`validate-repo`** and discovery intersection.
- **Options:**
  - **`[]`** — No exclusions in config.
  - **Template-style** — e.g. `["ORG/archived-*", "ORG/experimental-*"]` with `ORG` replaced by the org id from step 4.
  - **Custom** — Operator lists patterns; emit as a string array.
- **Default:** Match [`.github-secops-agent.json.template`](../../../../.github-secops-agent.json.template) if they want “template-like” behavior; otherwise `[]`.

### 6. `discovery.mode`

- **Ask:** How should discovery find security findings?
- **Plain English:** Selects the discovery strategy the orchestration uses with `gh` (e.g. Dependabot alerts).
- **Options:**
  - **`dependabot_alerts`** — Use Dependabot security alerts as the finding source (typical).
  - **Other** — Only if your policy and validators support another mode; otherwise steer to `dependabot_alerts`.
- **Default:** `"dependabot_alerts"`.

### 7. `discovery.minimumSeverity`

- **Ask:** What is the **minimum** Dependabot alert severity to treat as in-scope?
- **Plain English:** Alerts **below** this severity are filtered out for prioritization (e.g. `high` ignores low/medium-only alerts depending on product rules and `gh` output).
- **Options:**
  - **`low`**, **`medium`**, **`high`**, **`critical`** — Emit lowercase string; validator accepts case-insensitive input but normalized comparison uses the severity set (see `severity.ts` in repo).
- **Default:** `"high"` (template).

### 8. `discovery.preferPerRepo`

- **Ask:** Should discovery **avoid org-level Dependabot APIs** and use **per-repo** paths only?
- **Plain English:** If **true**, tooling favors per-repo Dependabot queries (useful when org endpoints are unavailable or policy requires repo-scoped scans). If **false**, org-level APIs may be used where supported.
- **Options:**
  - **`false`** — Default template behavior.
  - **`true`** — Set `"preferPerRepo": true`.
- **Default:** `false`.

---

### Orchestration

### 9. `orchestration.priority`

- **Ask:** How should the orchestrator **order** work when multiple items compete?
- **Plain English:** Non-empty list of **tie-breaker keywords** (e.g. severity first, then age of alert). Batch **parallelism** is **not** configured here — it lives in the orchestrator (shell/CI).
- **Options:**
  - **Template** — `["severity", "oldest_alert"]`.
  - **Severity first only** — e.g. `["severity"]` if a single criterion is enough.
  - **Custom** — Non-empty string array from the operator; must remain non-empty.
- **Default:** `["severity", "oldest_alert"]`.

### 10. `orchestration.nudgeRounds`

- **Ask:** How many **nudge rounds** (retries / follow-up cycles) should the policy allow before giving up or escalating?
- **Plain English:** Caps how long the observe/act loop keeps nudging Copilot or humans on stalled work. **Poll interval** and **partial timeout** are **not** in this file—operators choose cadence in skills/sub-agents (see [docs/product_design.md](../../../../docs/product_design.md)).
- **Options:**
  - **Positive integer** — e.g. `10` (template), `5`, `20`; emit a JSON number.
- **Default:** `10`.

**Operational conventions (not in JSON):** When polling **secops-check-pr-checks** for pending checks, a typical sleep is **120 seconds** between invocations; treat work as **partial** after roughly **60 minutes** without green—see **secops-check-pr-checks** and **secops-post-ci-nudge-comment** skills.

---

### Notifications (optional)

### 11. Include `notifications`?

- **Ask:** Should the file include a **`notifications`** object?
- **Plain English:** When present, defines GitHub **logins** to @mention for **issue/agent-task** escalations vs **PR/CI** escalations. Omitting the whole block means no baked-in escalation lists in policy.
- **Options:**
  - **Omit** — Do **not** add a `notifications` key (template does not include it).
  - **Include** — Add `notifications` with required arrays (steps 12–13); step 14 optional.
- **Default:** **Omit** (match template) unless they need escalation lists in policy.

### 12. `notifications.agentTaskEscalation`

- **Ask:** Who should be notified on **issue / Copilot agent-task** escalation paths?
- **Plain English:** Array of GitHub **usernames** (no `@`); used for agent-task or issue-side nudges.
- **Options:**
  - **Empty** — `[]` (valid if notifications block exists and prOrCiEscalation set per rules).
  - **Explicit logins** — Operator lists usernames; emit string array.
- **Default:** `[]` or operator-provided list; both top-level arrays are **required** when `notifications` is present.

### 13. `notifications.prOrCiEscalation`

- **Ask:** Who should be notified on **PR / CI** escalation paths?
- **Plain English:** Array of GitHub **usernames** for PR check failures or CI-side nudges.
- **Options:**
  - **Empty** — `[]`.
  - **Explicit logins** — Operator lists usernames; emit string array.
- **Default:** Match operator intent; must be valid GitHub logins per [validation-rules.md](validation-rules.md).

### 14. `notifications.byOrganization` (optional)

- **Ask:** Do you need **per-org overrides** for escalation lists?
- **Plain English:** Optional map keyed by org id; values may override `agentTaskEscalation` / `prOrCiEscalation` for that org.
- **Options:**
  - **Omit** — Omit `byOrganization` entirely.
  - **Include** — Object keyed by org login; each value may include optional `agentTaskEscalation` and/or `prOrCiEscalation` arrays (same login rules).
- **Default:** Omit.

---

## `project-config.json` (optional)

Skip this entire section if step **1** was **SecOps only** or the operator does not use a GitHub Project.

### 15. `project_id`

- **Ask:** What is the Projects **v2 node id** for `project_id`?
- **Plain English:** GitHub Projects v2 uses an opaque **node id** (e.g. `PVT_kw…`), **not** the browser URL alone. `validate-config` requires a non-empty **`project_id`** when `project-config.json` exists.
- **Options:**
  - **Plugin (preferred)** — Run **`gh-set-active-project`** (github-project-skills); copy repo-root [`project-config.json`](../../../../project-config.json.template) from plugin output if it writes under `.github/`.
  - **Resolve with gh** — From project URL or number: e.g. `gh project view NUMBER --owner OWNER --format json` and read the `id` field; emit `"project_id": "<id>"`.
  - **Paste id** — Operator pastes the node id string.
  - **Stub (discouraged)** — Placeholder string; file **fails** validation until replaced — only if they explicitly accept invalid state.
- **Default:** None — do not create `project-config.json` until a real `project_id` is available unless they explicitly want a stub.

### 15a. `project_title`

- **Ask:** What is the **exact GitHub Project title** for `project_title`?
- **Plain English:** This is the string **`gh issue create --project`** expects (same as the **Title** column from `gh project list --owner OWNER`). [submit-copilot-task.sh](../../../../.claude/skills/secops-create-remediation-issue/scripts/submit-copilot-task.sh) uses it when you do not pass `--project` or `SECOPS_DEFAULT_PROJECT`. Store it next to **`project_id`** in `project-config.json`.
- **Options:**
  - **From gh** — `gh project list --owner <org-or-user>` and copy the title verbatim (including brackets/punctuation).
  - **Paste** — Operator pastes the title from the GitHub UI.
  - **Defer** — Omit `project_title` until known (validation allows omit; issue enqueue then needs `--project` or env).
- **Default:** Omit if unknown; prefer collecting it whenever `project_id` is set so local scripts resolve the board without extra flags.

### 16. `owner` (optional)

- **Ask:** Store an **owner** string for human/tooling context?
- **Plain English:** Optional metadata (org or user login) for the Project; not a substitute for `project_id`.
- **Options:**
  - **Omit** — Leave key absent.
  - **Set** — Non-empty string (e.g. org or user login).
- **Default:** Omit.

### 17. `repo` (optional)

- **Ask:** Store a **repo** string for context?
- **Plain English:** Optional; some tooling records which repo the Project was bound from.
- **Options:**
  - **Omit** — Leave key absent.
  - **Set** — Non-empty string.
- **Default:** Omit.

### 18. `project_number` (optional)

- **Ask:** Store the human-readable **project number**?
- **Plain English:** Matches the **number** in the GitHub UI URL (`…/projects/N`); optional convenience field.
- **Options:**
  - **Omit** — Leave key absent.
  - **Set** — Positive integer ≥ 1.
- **Default:** Omit.

### 19. `set_at` (optional)

- **Ask:** Record when the binding was set?
- **Plain English:** Optional ISO timestamp string for tooling audits.
- **Options:**
  - **Omit** — Leave key absent.
  - **Set** — ISO-8601 string if their tooling sets it.
- **Default:** Omit.

---

## After the interview

Emit pretty-printed JSON (2 spaces). SecOps top-level key order: `version`, `organizations`, `orchestration`, then `notifications` if present.

Run **`validate-config`** as in [SKILL.md](../SKILL.md). Fix every error line; prefer **`config-schema`** for `.github-secops-agent.json` shape and [validation-rules.md](validation-rules.md) for edge rules.
