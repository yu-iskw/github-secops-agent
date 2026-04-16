---
name: lint-fix
description: Run pnpm format then pnpm lint from the repo root and fix issues until both pass. Use after edits, when CI is red on lint/format, or before opening a PR. Keywords: pnpm, format, lint, trunk, monorepo, code style.
compatibility: Requires Node >=24.13.0, pnpm >=10.28.1, and Trunk (see package.json engines and format/lint scripts).
---

# lint-fix

## When to use

- You changed code and need formatting and static checks clean.
- Lint or format checks failed locally or in CI.
- You want a bounded loop: format, lint, fix, repeat.

## Instructions

1. **Working directory:** Repository root (directory that contains the root `package.json`).

2. **Run in order:**

   ```bash
   pnpm format
   pnpm lint
   ```

3. **On failure:** Read command output (stdout and stderr). Fix the underlying source or config. Then **repeat from step 2** — run **both** `pnpm format` and `pnpm lint` again so Trunk formatting and checks stay aligned.

4. **Iteration cap:** After **5** full cycles (format + lint), if either command still fails, stop and summarize remaining errors and files; do not loop indefinitely.

5. **Success:** The last `pnpm format` and the last `pnpm lint` both exit with code `0`.

## Optional: all files

The default commands match root `package.json` (`format` → `trunk fmt`, `lint` → `trunk check -y`). If the user explicitly needs repo-wide variants, use `pnpm format:all` or `pnpm lint:all` instead — only when they ask for that scope.
