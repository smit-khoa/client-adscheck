---
phase: 4
title: "BM prototype port"
status: completed
priority: P1
dependencies: [3]
---

# Phase 04: BM Prototype Port

## Overview

Port BM table/data-loading, BM selection, BM action panel, BM runners, and BM token helpers from `feat-dev-prototype` into `features/bm`.

## Requirements

- Functional: BM tab renders BM data table/loading flow.
- Functional: BM Function panel 1 renders BM tools from prototype.
- Functional: BM selection drives BM action panel.
- Functional: BM token helpers used by prototype runners are present.
- Non-functional: preserve documented base-first BM loading behavior and per-group errors/cache.
- TDD gate: preserve or add pure tests only where practical; do not create brittle render tests.

## Architecture

Target shape:

```text
features/bm/
  components/
    BmTableView.vue
    BmFunctionPanel.vue
    BmActionList.vue
    BmActionForm.vue
    BmManagerDialog.vue
    BmAppealLinkDialog.vue
  api/
    fetch-bm-base.ts
    fetch-bm-assets.ts
    fetch-bm-ad-accounts.ts
    fetch-bm-admins.ts
    fetch-bm-status.ts
  composables/
    use-bm-data-loader.ts
    use-bm-selection.ts
    use-bm-actions.ts
    use-bm-runner.ts
  stores/
    bm-selection-store.ts
  tools/                 # runners stay in src/api/tools/bm/** during this port
  types/
  utils/
  data/
  index.ts
```

Keep `fb-bm-token.ts`, `fb-token-cache.ts`, and BM runner files under `src/api` because they are shared/tool infra, not UI feature code.

## Related Code Files

- Port from prototype: `apps/adaccounts/src/features/bm-actions/**`
- Port/adapt from current + prototype: `apps/adaccounts/src/features/bm-data-loading/**`
- Port from prototype: `apps/adaccounts/src/api/tools/bm/**`
- Port from prototype: `apps/adaccounts/src/api/fb-bm-token.ts`
- Port from prototype: `apps/adaccounts/src/api/fb-token-cache.ts`
- Modify: `apps/adaccounts/src/api/fb-token.ts` if prototype cache integration requires it
- Modify: `apps/adaccounts/src/api/tools/index.ts` if runner registry includes BM runners
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`

## Implementation Steps

1. Port shared BM token/cache helpers first without changing UI.
2. Consolidate current `bm-data-loading` into `features/bm` preserving existing loader behavior:
   - base rows visible first
   - advanced groups only call when toggled
   - session cache keys preserved
   - group errors stay per row/group
3. Port BM selection store/composable from prototype.
4. Port BM actions UI/composables/data from prototype.
5. Port `api/tools/bm/*` under `src/api/tools/bm/**` and wire runner registry.
6. Wire BM tab main content to `BmTableView`.
7. Wire Function panel 1 to `BmFunctionPanel`.
8. Ensure `AdAccountsPage` or BM entry preloads token only if prototype behavior requires it and errors are swallowed.
9. Run checks:
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts build`

## Success Criteria

- [x] BM tab renders BM table/loading UI.
- [x] BM row selection updates BM selected count.
- [x] BM Function panel 1 shows prototype BM tools.
- [x] BM runner registry compiles.
- [x] BM token helpers compile and do not break TKQC token flow.
- [x] Existing BM base-first behavior from `.claude/features/adaccounts-bm-data-loading.md` remains true.
- [x] Typecheck and build pass.

## Phase 4 Result — 2026-06-23

- Ported selected BM prototype files without raw-merge:
  - `api/fb.ts`, `api/fb-bm-token.ts`, `api/fb-token-cache.ts`.
  - `api/tools/bm/**` BM runners.
  - `features/bm-actions/**` action panel/catalog/runner/viewer dialogs.
  - BM selection additions in `features/bm-data-loading/**`.
- Added `features/bm/**` workspace wrappers:
  - `BmTableView` renders BM data loading UI.
  - `BmFunctionPanel` renders prototype BM action panel.
- Wired workspace BM tab to real BM table/tools; BM tab count follows loaded BM rows.
- Preserved BM base-first loading flow by wrapping existing `BmDataLoadingView` instead of rewriting it.
- Fixed review finding: BM admin promote now reuses `ADMIN_TASKS` instead of sending an empty `business_roles` array.
- Sếp confirmed keeping prototype `businessID: 1347771445924940` for BM token helper; live verification still required.
- Feature docs updated:
  - `.claude/features/adaccounts-bm-tab.md`
  - `.claude/features/adaccounts-bm-data-loading.md`
  - `.claude/features/adaccounts-workspace-tabs.md`
  - `.claude/features/README.md`
- Code review: `DONE_WITH_CONCERNS`; actionable functional/doc concerns addressed before completion.
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS, CSS order and asset-size warnings only.

## Risk Assessment

- Risk: prototype BM runners rely on fragile FB GraphQL doc_ids. Mitigation: preserve error handling; document live verification limits.
- Risk: token preload adds noisy failures. Mitigation: use `Promise.allSettled` and let runner-level auth retry handle failures.
- Risk: moving BM loader invalidates existing feature docs. Mitigation: Phase 6 updates docs immediately after migration.
