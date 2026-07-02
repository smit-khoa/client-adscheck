---
phase: 6
title: "Docs, verification, and cleanup"
status: completed
priority: P1
dependencies: [5]
---

# Phase 06: Docs, Verification, and Cleanup

## Overview

Update feature docs and architecture docs to match the new tab-folder layout, remove stale imports/files, then run final verification.

## Requirements

- Functional: no runtime behavior changes except cleanup of unused old modules.
- Non-functional: feature docs must list real paths only.
- Non-functional: no stale references to old `basic-mode`/`advanced-mode` as primary route rendering unless intentionally kept as compatibility wrappers.
- TDD gate: final typecheck/build/feature verification must pass before marking complete.

## Architecture

Documentation should describe the final structure:

```text
adaccounts route
  -> workspace
      -> tkqc
      -> bm
      -> page
      -> pixel
```

Feature docs should map the real files after migration, not aspirational paths.

## Related Code Files

- Modify: `.claude/features/README.md`
- Modify/create: `.claude/features/adaccounts-workspace-tabs.md`
- Modify/create: `.claude/features/adaccounts-tkqc-tab.md`
- Modify/create: `.claude/features/adaccounts-bm-tab.md`
- Modify/create: `.claude/features/adaccounts-page-tab.md`
- Modify/create: `.claude/features/adaccounts-pixel-tab.md`
- Migrate gotchas from old docs into the new tab docs before removing or de-indexing old docs:
  - `.claude/features/adaccounts-basic-mode.md`
  - `.claude/features/adaccounts-bm-data-loading.md`
  - `.claude/features/adaccounts-account-list.md`
  - `.claude/features/adaccounts-account-selection.md`
  - `.claude/features/adaccounts-tool-actions.md`
- Modify: `docs/adaccounts-feature-architecture.md`
- Possibly modify: `README.md`, `docs/codebase-summary.md`, `docs/system-architecture.md` if they mention old adaccounts folder/mode structure
- Delete obsolete source files only after imports are gone

## Implementation Steps

1. Search for stale production imports from old feature paths.
2. Remove old wrapper files only if no longer imported.
3. Update `.claude/features/README.md` rows for new tab features.
4. Update feature docs with real verified files, APIs, state, verification, gotchas.
5. Update `docs/adaccounts-feature-architecture.md` to reflect tab folders.
6. Update broader docs only if they make false claims after migration.
7. Run final checks:
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts build`
   - `pnpm verify:features`
   - `pnpm verify:all`
8. Record manual smoke checklist result or note skipped runtime checks.

## Success Criteria

- [x] No stale production import from removed old paths.
- [x] Feature docs list only real paths.
- [x] Feature README index matches docs.
- [x] Architecture doc describes tab-folder boundary.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes.
- [x] `pnpm verify:features` passes.
- [x] Manual runtime checks documented or explicitly skipped with reason.

## Phase 6 Result — 2026-06-23

- Removed obsolete adaccounts-local mode source files after confirming no production imports remained:
  - `apps/adaccounts/src/features/basic-mode/**`
  - `apps/adaccounts/src/features/advanced-mode/**`
  - `apps/adaccounts/src/stores/mode-store.ts`
- Removed the old advanced-mode switch from `ToolPanel`; workspace tabs now own navigation between TKQC/BM/Page/Pixel.
- Updated architecture and broader docs to describe the remote-owned tab workspace:
  - `docs/adaccounts-feature-architecture.md`
  - `README.md`
  - `docs/codebase-summary.md`
  - `docs/project-overview-pdr.md`
  - `docs/system-architecture.md`
  - `docs/code-standards.md`
  - `docs/project-roadmap.md`
- Fixed stale feature-doc claims found by final review:
  - `adaccounts-tool-actions.md`
  - `adaccounts-tkqc-tab.md`
  - `adaccounts-account-list.md`
  - `adaccounts-bm-data-loading.md`
  - `shared-ui-data-grid-table.md`
- Code review: `DONE_WITH_CONCERNS`; documented concerns were addressed before completion.
- Verification:
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS, CSS order and asset-size warnings only.
  - `pnpm verify:features`: PASS.
  - `pnpm verify:all`: PASS.
- Manual runtime smoke: skipped in this session because the app/browser was not launched and SMIT Connect/FB session live checks require runtime credentials. Static gates and build passed; runtime smoke remains recommended before merge/deploy.
- Note: `apps/shell/src/components/WorkspaceContent.vue` was already modified in the working tree and was not part of this cleanup; left untouched.

## Risk Assessment

- Risk: deleting old docs loses useful gotchas. Mitigation: migrate gotchas into new tab docs before deleting/renaming.
- Risk: broad docs update grows scope. Mitigation: update only false claims caused by this migration.
- Risk: `verify:all` fails due unrelated existing shell docs changes. Mitigation: report exact output; do not hide failures.
