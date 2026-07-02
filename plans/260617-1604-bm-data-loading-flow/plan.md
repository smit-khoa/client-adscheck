---
title: "Implement BM data loading flow"
status: pending
created: 260617-1604
source: ck-plan
blockedBy: []
blocks: []
---

# Implement BM Data Loading Flow

## Overview
Implement a real Business Manager (BM) data loading flow inside the existing `adaccounts` remote. The flow adds a BM table/view, a config modal, base-first loading, advanced group runners, per-group loading/error state, and session cache. No mock/fake data.

## Context Links
- Contract: `plans/reports/bm-data-loading-contract-260617-1544-gpt-bm-flow-report.md`
- Mapping report: `/Users/smit_hai/Desktop/meofb-xmeta/plans/reports/bm-column-comparison-260611-1023-adscheck-vs-xmeta-report.md`
- Existing API helper: `apps/adaccounts/src/api/fb-graph.ts`
- Existing feature architecture plan: `plans/260610-1523-adaccounts-feature-architecture/plan.md`
- Existing account-list feature doc: `.claude/features/adaccounts-account-list.md`
- Existing basic-mode feature doc: `.claude/features/adaccounts-basic-mode.md`

## Fixed Decisions
- Scope is app-local: modify `apps/adaccounts/**` and `.claude/features/**`; avoid `packages/shared-*` unless a compile-only additive fix is unavoidable.
- UI must use shared-ui components from `.claude/components-catalog.md`: `Table`, `Dialog`, `Button`, `Input`, `Textarea`, `Switch`, `Checkbox`, `RadioGroup`, `Badge`.
- Advanced toggles are API/data groups, not visual-only switches.
- Base BM list loads before detail groups.
- Detail groups run with `concurrency`, default `50`, minimum `1`.
- Group API failure marks only that group/row; base table remains visible.
- Merge patches by `bmId`.
- Cache group patches in session memory with keys like `bm:{bmId}:{group}`; do not call a cached group again in the same session.
- `createLimit` is internal/no separate checkbox; bmmanager always includes `createLimit: true` in detail runner `aw()`, so run best-effort with other detail runners and keep it separate from `limit` from `adtrust_dsl`.
- Admin MVP must fetch full bmmanager-style details: `Dx()` Graph API GraphQL first, fallback `Px()` business GraphQL, then merge `X_()` `system_users`.
- Source truth reviewed: `/Users/smit_hai/Documents/Smit/tai-lieu-nghien-cuu/bmmanager/mbmanager.js:416` contains `Ag/lw/aw/V_/Ax/Fr/Dx/Px/Q_/X_/q_/G_/Ox/Fx/Z_/ew`; `/Users/smit_hai/Documents/Smit/tai-lieu-nghien-cuu/bmmanager/mbmanager.js:1399` contains status runner integration `q_()` then `G_()`.
- API layer may use raw extension fetch (`extFetch` via `smit-connect.ts`) for bmmanager endpoints that are not covered by current `graph()`/`graphql()` helpers; components/composables still must not call raw fetch.
- Final BM row naming is locked to UI/contract names: `admin`, `adminDetail`, `adminViewerId`; do not use alternate `adminLabel`/`viewerBusinessUserId` names in app code.

## Phases

| # | Phase | Status | Purpose |
|---|-------|--------|---------|
| 1 | [Feature shell + mode/tab integration](phase-01-feature-shell-and-navigation.md) | pending | Add BM view entry in advanced mode without breaking current TKQC basic flow |
| 2 | [BM domain types + API wrappers](phase-02-bm-domain-types-and-api-wrappers.md) | pending | Add typed BM API layer for base list and advanced groups |
| 3 | [BM loader composable + session cache](phase-03-bm-loader-composable-and-cache.md) | pending | Orchestrate base-first loading, concurrency, merge, group state, cache |
| 4 | [BM config modal + table UI](phase-04-bm-config-modal-and-table-ui.md) | pending | Build shared-ui modal/table and wire load action to composable |
| 5 | [Feature docs + verification](phase-05-feature-docs-and-verification.md) | pending | Update AI feature map/docs and run relevant checks |

## Architecture Summary
```text
AdAccountsPage
  -> mode-store (basic | advanced)
  -> AdvancedModeView
      -> BM tab/panel
          -> BmLoadConfigDialog
          -> BmTable
          -> useBmDataLoader
              -> features/bm-data-loading/api/*
                  -> api/fb-graph graph/graphql helpers
```

Use a new feature module under `apps/adaccounts/src/features/bm-data-loading/`:

```text
features/bm-data-loading/
  api/
    fetch-bm-base.ts
    fetch-bm-assets.ts
    fetch-bm-ad-accounts.ts
    fetch-bm-admins.ts
    fetch-bm-status.ts
    fetch-bm-create-limit.ts
  components/
    BmLoadConfigDialog.vue
    BmTable.vue
    BmDataLoadingView.vue
  composables/
    use-bm-data-loader.ts
  types/
    bm-data-loading.types.ts
  utils/
    bm-row-mappers.ts
    concurrency.ts
  index.ts
```

## Dependencies
- Phase 2 depends on Phase 1 only for final integration paths, but API/types can be implemented independently.
- Phase 3 depends on Phase 2.
- Phase 4 depends on Phase 3.
- Phase 5 depends on code changes from all previous phases.

## Verification Strategy
- Static: `pnpm --filter @mf2/adaccounts typecheck`.
- Build: `pnpm --filter @mf2/adaccounts build`.
- Feature docs: `pnpm verify:features` or `pnpm verify:all` if AI memory/shared boundaries touched.
- Manual (requires SMIT Connect extension + FB login): load BM source `all`, load `byId`, disable individual toggles and confirm disabled groups do not call API, trigger a group failure and confirm base rows remain.

## Out of Scope
- Page table implementation.
- New tool actions for BM.
- Persisted BM cache across reloads.
- Shared package changes or design system refactors.
- Perfect support for every future FB GraphQL doc_id change beyond graceful error per group.

## Unresolved Questions
None.
