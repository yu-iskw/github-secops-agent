# Copilot continuation policy (nudge rounds)

Use this text when posting **nudge** comments on the SecOps issue (after [secops-check-pr-checks](../../secops-check-pr-checks/SKILL.md) reports failing or pending checks). Keep instructions **short**; the full remediation rules live in [secops-create-remediation-issue security prompt](../../secops-create-remediation-issue/references/security_remedation_prompt.md).

## Principles

1. **Keep working** on the same PR until **required** status checks pass—within **orchestration.nudgeRounds** and typical **~60 minute** partial-timeout convention (not in JSON).
2. **Do not** merge or declare success while **security or required** checks are red; do not narrow scan scope or disable workflows to fake green.
3. If **manual approval** or **environment protection** blocks a job (no code fix will unblock), **stop nudging**, label or mark `blocked:manual-ci`, and **notify a human**—do not loop forever.
4. Reference the **failing check names** and **round `n` / `max`** in each nudge so operators can audit.

## Example issue comment (nudge)

```markdown
<!-- secops nudge round 2/5 -->

Please fix the failing required checks: `lint`, `security-audit` (see PR checks).

Continue iterating on the open PR until required checks pass, per SecOps policy. If a job is **waiting on manual approval** or an **environment**, say so and pause—do not claim green.
```

## Related

- [secops-check-pr-checks SKILL](../../secops-check-pr-checks/SKILL.md) — `check-repo-ci.sh` JSON outcome and exit codes
- [secops-post-ci-nudge-comment SKILL](../SKILL.md) — `nudge-copilot-ci.sh` after validate-repo
- [secops-create-remediation-issue](../../secops-create-remediation-issue/SKILL.md) — issue body and `@copilot` assignment
