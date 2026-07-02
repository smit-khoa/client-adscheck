---
phase: 4
title: "Docs, verification, and handoff"
status: completed
priority: P2
dependencies: [3]
---

# Phase 4: Docs, Verification, and Handoff

## Overview

Update required feature/catalog documentation, run final guard commands, and prepare a clean implementation handoff that preserves the shared/app commit boundary.

## Requirements

- Functional: docs match final files and behavior.
- Functional: final verification covers shared-ui, adaccounts, catalog, feature docs, and PR split guard.
- Non-functional: report known warnings honestly.
- Non-functional: preserve branch hygiene by not mixing shared-ui and app changes in one commit.

## Architecture

Documentation must reflect both layers:

```text
.claude/components-catalog.md
  -> shared-ui WorkspacePathFrame component group

.claude/features/adaccounts-workspace-tabs.md
  -> adaccounts uses shared-ui frame; tab content/tool logic remains app-owned

docs/adaccounts-feature-architecture.md
  -> only update if architecture claims need the shared frame dependency
```

## Related Code Files

- Modify: `.claude/components-catalog.md`
- Modify: `.claude/features/adaccounts-workspace-tabs.md`
- Modify if needed: `.claude/features/README.md`
- Modify if needed: `docs/adaccounts-feature-architecture.md`
- Read: `docs/code-standards.md`
- Read: `.claude/features/README.md`

## Implementation Steps

1. Update component catalog:
   - Add `WorkspacePathFrame` group.
   - Document slots and `data-tab-value` trigger requirement.
   - Mention it is for workspace shell/frame UI, not business table logic.
2. Update adaccounts workspace feature doc:
   - Note `WorkspaceTabFrame.vue` uses shared-ui `WorkspacePathFrame`.
   - Keep flow clear: `AdAccountsWorkspace.vue` chooses table/tool slots.
   - Update verification/manual smoke steps.
3. Update architecture docs only if existing claims become stale.
4. Run final checks:
   ```bash
   pnpm --filter @mf2/shared-ui typecheck
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   pnpm verify:catalog
   pnpm verify:features
   pnpm verify:all
   ```
5. Manual smoke `/app/adaccounts` when a browser/dev server is available.
6. Prepare handoff notes:
   - Shared-ui commit should include Phase 2 files + catalog shared component entry.
   - App commit should include Phase 3 files + feature docs.
   - Mention any pre-existing build warnings.
7. Unblock/update the overlapping domain refactor plan once this plan completes.

## Success Criteria

- [x] Component catalog documents `WorkspacePathFrame`.
- [x] Feature docs match final adaccounts workspace frame behavior.
- [x] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes or only known warnings remain.
- [x] `pnpm verify:catalog` passes.
- [x] `pnpm verify:features` passes.
- [x] `pnpm verify:all` passes, considering split staging if needed.
- [x] Handoff states split-commit/shared-app boundary clearly.
- [x] Overlapping plan dependency is resolved or explicitly left with next action.

## Phase 4 Notes

### Docs updated

- `.claude/components-catalog.md` documents `WorkspacePathFrame`, slots, and measurement requirements.
- `.claude/features/shared-ui-workspace-path-frame.md` documents the new shared component feature.
- `.claude/features/README.md` indexes the new shared component feature.
- `.claude/features/adaccounts-workspace-tabs.md` documents that `WorkspaceTabFrame.vue` uses shared-ui `WorkspacePathFrame` while keeping domain tab/table/tool logic app-owned.
- No architecture doc update was needed; existing docs did not contain a stale detailed claim about this frame dependency.

### Final verification

- `pnpm --filter @mf2/shared-ui typecheck` — PASS.
- `pnpm --filter @mf2/adaccounts typecheck` — PASS.
- `pnpm --filter @mf2/adaccounts build` — PASS with known warnings:
  - Module Federation `publicPath='auto'` manifest warning.
  - CSS order warnings involving `vue-sonner`, dialog CSS, and table CSS.
  - Asset size warning for `500.74c7ce33.js` and `74.8aec427f.js`.
- `pnpm verify:catalog` — PASS.
- `pnpm verify:features` — PASS.
- `pnpm verify:all` — PASS.

### Handoff / split boundary

- Shared-ui commit should include:
  - `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue`
  - `packages/shared-ui/src/components/ui/workspace-path-frame/index.ts`
  - `packages/shared-ui/src/workspace-path-frame.ts`
  - `packages/shared-ui/package.json`
  - `packages/shared-ui/src/index.ts`
  - `.claude/components-catalog.md`
  - `.claude/features/shared-ui-workspace-path-frame.md`
  - `.claude/features/README.md`
- App/docs commit should include:
  - `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
  - `.claude/features/adaccounts-workspace-tabs.md`
  - plan status files for this plan
- Even though `pnpm verify:all` passed, preserve the repo rule: do not mix `packages/shared-*` and `apps/*` in one commit/PR.

### Manual smoke

- Shared frame hardening after final review:
  - active-tab values are escaped before selector lookup;
  - missing `data-tabs-list` emits a development-only warning;
  - guards re-run after the fix.
- Browser/dev-server smoke was not run in this session. Automated typecheck/build/docs guards passed, but visual confirmation of `/app/adaccounts` should be done before shipping if a browser session is available.

### Overlapping plan

- This plan's implementation is complete. The overlapping domain refactor plan can resume from its docs/verification work with the new `WorkspacePathFrame` dependency reflected in feature docs.

