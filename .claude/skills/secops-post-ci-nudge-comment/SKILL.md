---
name: secops-post-ci-nudge-comment
description: Post a nudge comment on the SecOps issue when PR checks fail or stall—continuation policy, round caps, validate-repo before gh issue comment. Does not run PR checks; use secops-check-pr-checks for one-shot status (orchestrators loop).
---

# secops-post-ci-nudge-comment

## When to use

- After **secops-check-pr-checks** reports `failing` (or orchestration chooses to nudge on long `pending`) while the nudge round is still below **orchestration.nudgeRounds**.
- **Not** for status classification—use **secops-check-pr-checks** + `check-repo-ci.sh` for JSON outcome and exit codes (invoke repeatedly from a sub-agent if needed).

## Inputs

- `owner/repo`, **issue number**, **nudge body** (file path).
- **Context:** outcome from `check-repo-ci.sh`, failing check names, round `n` / max—see [references/copilot_continuation.md](references/copilot_continuation.md).

## Shell script

**[scripts/nudge-copilot-ci.sh](scripts/nudge-copilot-ci.sh)** — `validate-repo`, then `gh issue comment`. Args: `--repo OWNER/REPO` `--issue NUMBER` `--body-file PATH`.

```bash
.claude/skills/secops-post-ci-nudge-comment/scripts/nudge-copilot-ci.sh \
  --repo OWNER/REPO --issue 123 --body-file /tmp/nudge.md
```

**Prerequisites:** `pnpm --filter @github-secops-agent/ghclt build`, `gh`. Optional `SECOPS_CONFIG`.

## Continuation policy

Compose `/tmp/nudge.md` using **[references/copilot_continuation.md](references/copilot_continuation.md)** and concrete check names from `gh pr checks` or the JSON line from **secops-check-pr-checks**.

- **Manual CI / blocked:** If **secops-check-pr-checks** exit **3** / `blocked_manual_ci`, do not nudge in a loop—label `blocked:manual-ci`, **notify the user** (see continuation reference).
- **Partial / timeout:** If elapsed time exceeds **orchestration.partialAfterMinutes** without green, mark **partial** for Project + evidence; nudges stop when rounds or time limits apply.

## Constraints

- **No commits** and **no push**—issue comments only.
- Do not disable security workflows or narrow scan scope to fake green.

## Handoff

After nudge → **check again** with **secops-check-pr-checks** (sub-agent sleep/retry loop); update **secops-project-board-sync** when board fields change.

## References

- [copilot_continuation.md](references/copilot_continuation.md)
- [secops-check-pr-checks](../secops-check-pr-checks/SKILL.md)
