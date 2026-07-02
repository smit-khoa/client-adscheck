---
phase: 3
title: "BM loader composable + session cache"
status: pending
priority: P1
effort: "4h"
dependencies: [2]
---

# Phase 3: BM Loader Composable + Session Cache

## Overview
Implement orchestration in a composable: resolve BM list first, run selected detail groups with concurrency, merge patches by `bmId`, maintain per-group loading/error state, and avoid repeated calls using session cache.

## Requirements
- Functional: `load(config)` loads base rows first and renders them even if detail groups later fail.
- Functional: `advEnabled=false` must skip all detail runners.
- Functional: toggles off must not call that group's API.
- Functional: detail runners obey `concurrency`, default `50`, minimum `1`.
- Functional: cache per session and per `bmId:group`; cached groups merge without API call.
- Non-functional: composable owns state; UI is a thin adapter.

## Architecture

```text
useBmDataLoader
  state: rows, isLoadingBase, baseError, activeConfig
  helpers: parseIds, runWithConcurrency, patchRow, setGroupLoading, setGroupError
  cache: Map<string, Partial<BmRow>>
  api: fetchBmBaseRows, fetchBmAssets, fetchBmAdAccounts, fetchBmAdmins, fetchBmStatus, fetchBmCreateLimit
```

Group runner strategy:
- `partner` is base-list field, not a detail runner.
- `page`/`instagram`/`whatsapp` share one assets request per BM when any are enabled.
- `bmAccount`/`share`/`limit` share ad-account requests per BM when any are enabled.
- `createLimit` has no UI checkbox; bmmanager sets `createLimit: true` in `aw()`, so run it best-effort whenever advanced detail runners run. It is cached with key `bm:{bmId}:createLimit` even though it is not a visible advanced toggle.
- `status` runs outside the per-BM `aw()` family: first overview for all businesses (`q_()`), then enforcement detail (`G_()`) only for loaded BM ids with non-`live` and non-`unknown` status, fixed concurrency `3`.
- `concurrency` applies to per-BM detail workers; use a separate internal base page size for BM list paging instead of treating concurrency as the only list page size.

## Related Code Files
- Create: `apps/adaccounts/src/features/bm-data-loading/composables/use-bm-data-loader.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/utils/concurrency.ts`
- Modify: `apps/adaccounts/src/features/bm-data-loading/index.ts`
- Use API files from Phase 2.

## Implementation Steps
1. Implement `runWithConcurrency<T>` in a tiny util, using the contract pseudo-code and `Math.max(1, Math.floor(config.concurrency || 50))`.
2. Implement `parseBmIds(textOrIds)`:
   - split by newline/comma/space if UI passes text, trim, remove empties, dedupe preserving order.
   - If no IDs for `byId`, set `baseError` and skip API.
3. Implement `patchRow(bmId, patch)` as immutable row update or direct ref update matching local style; preserve existing fields.
4. Implement `setGroupLoading/error` per row/group.
5. Implement cache helpers:
   - `cacheKey(bmId, group)`.
   - `getCachedPatch`, `setCachedPatch` module-scoped Map.
6. Implement `load(config)`:
   - reset base error and group state for current load.
   - fetch base rows; assign rows.
   - if `!advEnabled`, stop after base (base fetch still includes partner per bmmanager contract).
   - compute enabled groups from `config.adv`.
   - run detail per BM with configured concurrency for assets/ad-accounts/admin/createLimit.
   - run status as a separate flow: overview patch first, then enforcement detail only for affected BM ids.
7. Inside each BM worker:
   - For each logical request family, check all relevant groups in cache first.
   - If missing, set loading true for affected groups, call API, patch row, set cache per group, clear loading.
   - On error, set only affected `errorGroups[group]` and clear loading.
8. Ensure one failed group/request does not throw out of the whole worker in a way that stops other groups/BMs.
9. Expose `rows`, `isLoadingBase`, `baseError`, `load`, `refresh`, `activeConfig`, and optional `clearSessionCache` only if needed for retry; do not add persistence.

## Success Criteria
- [ ] Base rows show even when any advanced group fails.
- [ ] A disabled group does not call its API wrapper.
- [ ] Cached group patch merges without calling API wrapper again in same session.
- [ ] Concurrency utility never starts more than configured BM workers.
- [ ] `partner` behavior matches contract: base include when `advEnabled=false`, or when `adv.partner=true`.
- [ ] Typecheck passes.

## Risk Assessment
- Risk: shared requests map to several groups, so one API failure affects multiple groups. Mitigation: set error on the exact groups covered by that request family.
- Risk: cache with partial patches can stale after changing source/config. Mitigation: session-only and group-scoped; no persistence.
- Risk: over-abstracting runner graph. Mitigation: keep explicit functions for assets/ad-accounts/admin/status/createLimit.
