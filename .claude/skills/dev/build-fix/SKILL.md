---
name: build-fix
description: Run pnpm build from the repo root and fix compile or build errors until the workspace build passes. Use after edits, when CI is red on build, or before opening a PR. Keywords: pnpm, build, TypeScript, monorepo, workspace.
compatibility: Requires Node >=24.13.0 and pnpm >=10.28.1 (see package.json engines). Build runs recursively across packages.
---

# build-fix

## When to use

- You changed code and need the full workspace to compile and build.
- `pnpm build` failed locally or in CI.
- You want a bounded loop: build, fix, repeat.

## Instructions

1. **Working directory:** Repository root (directory that contains the root `package.json`).

2. **Run:**

   ```bash
   pnpm build
   ```

   Root `build` is **`pnpm --recursive build`** — failures may reference any workspace package; fix code in the path reported by the error.

3. **On failure:** Read command output. Fix TypeScript, bundler, or other build errors in the indicated files or packages. Then run `pnpm build` again.

4. **Iteration cap:** After **5** failed `pnpm build` runs, stop and summarize remaining errors; do not loop indefinitely.

5. **Success:** The last `pnpm build` exits with code `0`.
