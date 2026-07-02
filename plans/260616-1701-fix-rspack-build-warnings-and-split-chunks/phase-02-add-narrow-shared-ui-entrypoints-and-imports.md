---
phase: 2
title: "Add narrow shared-ui entrypoints and imports"
status: completed
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 2: Add narrow shared-ui entrypoints and imports

## Overview

Reduce accidental root-barrel dependency pull by adding additive shared-ui subpath entrypoints where needed, then update app imports that currently use root `@mf2/shared-ui` for narrow component groups.

## Requirements

- Functional: apps import `Toaster`/`toast` and frequently used form primitives through narrow shared-ui entrypoints when available.
- Functional: existing root `@mf2/shared-ui` exports remain working for backward compatibility.
- Non-functional: shared-ui changes must be additive only.
- Non-functional: do not refactor component behavior; import path only unless needed for exports.

## Architecture

Current `packages/shared-ui/src/index.ts` exports all UI groups, including table/dialog/form/sonner. Narrow entrypoints already exist for `icons`, `core`, `remote`, `table`, and `card`. Add focused entrypoints for high-value groups used by `adaccounts`:

- `packages/shared-ui/src/sonner.ts` -> exports `components/ui/sonner`.
- `packages/shared-ui/src/form-controls.ts` -> exports only common form/control primitives used by app forms (`button`, `input`, `label`, `select`, `checkbox`, `textarea`, and validation `form` parts if needed). Name is intentionally not `form` to avoid confusion with shadcn `Form` validation group.

Then update `packages/shared-ui/package.json` `exports` map additively. Implement shared-ui exports and app import changes in the same worktree for verification, but split commits before shipping: shared-ui additive exports first, app imports/config second.

## Related Code Files

- Modify: `packages/shared-ui/package.json`
- Modify: `packages/shared-ui/src/sonner.ts` (create)
- Modify: `packages/shared-ui/src/form-controls.ts` (create only if needed)
- Modify: `apps/adaccounts/src/pages/AdAccountsPage.vue`
- Modify: `apps/adaccounts/src/features/tool-actions/components/ToolPanel.vue`
- Modify: `apps/adaccounts/src/features/tool-actions/components/ToolFunctionForm.vue`
- Modify: `apps/adaccounts/src/features/tool-actions/components/ToolRunnerHeader.vue`
- Reference: `packages/shared-ui/src/index.ts`
- Reference: `docs/code-standards.md`

## Implementation Steps

1. Create `packages/shared-ui/src/sonner.ts` exporting `Toaster`/`toast` from `./components/ui/sonner`.
2. Add `"./sonner": "./src/sonner.ts"` to `packages/shared-ui/package.json` exports.
3. Inspect exact root imports in `apps/adaccounts` and `apps/ads-manager`; update obvious ones:
   - `Toaster`, `toast` -> `@mf2/shared-ui/sonner`.
   - Keep showcase root import if it intentionally renders most shared-ui components.
4. If `ToolFunctionForm.vue`/`ToolRunnerHeader.vue` import multiple form primitives from root, create `packages/shared-ui/src/form-controls.ts`, add `"./form-controls": "./src/form-controls.ts"`, and update imports to `@mf2/shared-ui/form-controls`.
5. Do not remove exports from `src/index.ts`.
6. Run shared-ui + touched app typechecks.

## Success Criteria

- [ ] Root `@mf2/shared-ui` remains backward compatible.
- [ ] App imports for sonner/form primitives use narrow entrypoints where practical.
- [ ] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [ ] Touched app typechecks pass.

## Risk Assessment

- Risk: too many entrypoints create API clutter. Mitigation: add only `sonner` and one form/control entrypoint if clearly used.
- Risk: shared-ui + app changes violate PR split policy. Mitigation: call out split requirement before commit/PR; do not commit without Sếp approval.
- Risk: package exports path typo breaks resolution. Mitigation: typecheck apps after import updates.
