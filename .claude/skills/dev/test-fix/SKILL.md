---
name: test-fix
description: Run pnpm test from the repo root and fix failing tests or implementation until the suite passes. Use after edits, when CI is red on tests, or before opening a PR. Keywords: pnpm, test, vitest, unit tests, monorepo.
compatibility: Requires Node >=24.13.0 and pnpm >=10.28.1 (see package.json engines). Tests use Vitest from the repo root (vitest.config.ts).
---

# test-fix

## When to use

- You changed code and need the test suite green.
- `pnpm test` failed locally or in CI.
- You want a bounded loop: test, fix, repeat.

## Instructions

1. **Working directory:** Repository root (directory that contains the root `package.json`).

2. **Run:**

   ```bash
   pnpm test
   ```

   Root `test` is **`vitest run`** per `package.json`. Vitest is configured at the repo root; tests are typically under `packages/*/src/**/*.{test,spec}.ts` — fix code or tests in the paths reported by failures.

3. **On failure:** Read command output. Fix incorrect expectations, broken implementations, or test setup. Then run `pnpm test` again.

4. **Iteration cap:** After **5** failed `pnpm test` runs, stop and summarize remaining failures; do not loop indefinitely.

5. **Success:** The last `pnpm test` exits with code `0`.

## Note

There is no separate `test:all` script in `package.json`; use `pnpm test` as the single entry point for this repo’s Vitest setup.
