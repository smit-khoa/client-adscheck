---
phase: 4
title: "BM legacy enrichment and reload safety"
status: completed
priority: P2
dependencies: [2]
---

# Phase 4: BM Legacy Enrichment and Reload Safety

## Overview

Keep the current BM loader as the source of truth, then add old-client legacy BM type/status/quality as optional enrichment. Also make BM reload/cache behavior user-scoped and predictable when the user configured all groups.

## Requirements

- Functional: current BM default all-groups behavior remains: `status`, `page`, `limit`, `bmAccount`, `partner`, `admin`, `instagram`, `whatsapp`, `share`.
- Functional: current BM status logic remains unless legacy status is added as a separate field/group.
- Functional: add legacy BM type/status/quality only as isolated optional advanced group(s).
- Functional: BM cache reload respects active config and current `user_id`.
- Functional: disabled groups must not call API.
- Non-functional: old legacy GraphQL failures must not clear base rows or current status fields.

## Architecture

Current BM loader behavior from code:

- `DEFAULT_BM_LOAD_CONFIG.advEnabled = true`.
- All 9 existing advanced groups default to `true`.
- `ensureLoaded()` hydrates `rows` and `activeConfig` from extension cache if fresh.
- Advanced group patch cache is session-only by `bm:{bmId}:{group}`.
- `fetchBmStatus()` uses current GraphQL doc IDs:
  - overview: `4941582179260904`;
  - enforcement detail: `25166016149718566`.

Legacy group plan:

```ts
type BmAdvancedGroup =
  | existing groups
  | 'legacyType'
  | 'legacyQuality';
```

Avoid replacing current `status` in the first implementation. If the old `3920367411328805` response produces a different useful value, map it to `legacyQuality`/`legacyStatusLabel` fields first. Sếp can later decide whether UI should prefer legacy or current status.

Legacy endpoints from old client:

- BM type: `doc_id=32061067960207573`, variables include `businessID`.
- BM status/quality: `doc_id=3920367411328805`, batch size 10 in old flow.

Use `legacyGraphql` token policy.

## Related Code Files

- Modify: `apps/adaccounts/src/features/businesses/types/bm-data-loading.types.ts`
- Modify: `apps/adaccounts/src/features/businesses/components/BmLoadConfigDialog.vue`
- Modify: `apps/adaccounts/src/features/businesses/composables/use-bm-data-loader.ts`
- Create: `apps/adaccounts/src/features/businesses/api/fetch-bm-legacy.ts`
- Modify: `apps/adaccounts/src/features/businesses/utils/bm-row-mappers.ts`
- Maybe modify: `apps/adaccounts/src/features/businesses/components/BmTable.vue` if displaying legacy fields needs columns
- Modify: `apps/adaccounts/src/api/fb-graph.ts` or token policy API for legacy GraphQL calls
- Tests: pure tests for legacy mapper and loader group gating

## Implementation Steps

1. Read current BM row/table columns before choosing field names.
2. Add optional row fields for legacy results, e.g. `legacyType`, `legacyQuality`, `legacyStatus` only if table needs them.
3. Add group labels in `BmLoadConfigDialog` without changing existing 9 group semantics.
4. Implement `fetchBmLegacyType()` using `doc_id=32061067960207573` and `legacyGraphql` policy.
5. Implement `fetchBmLegacyQuality()` using `doc_id=3920367411328805` and `legacyGraphql` policy, preserving old chunk size 10 where relevant.
6. Wire legacy groups into `runBmDetails()` or a separate legacy runner after current status, with isolated group errors. Use `legacyGraphql` without fallback unless the exact endpoint has been verified with an alternate session GraphQL payload.
7. Extend BM cache payload with `user_id` and active config from Phase 1.
8. Ensure `refresh()` reuses `activeConfig` and reloads the same groups user configured.
9. Add tests proving disabled legacy groups do not call APIs and legacy failures only set group errors.

## Success Criteria

- [ ] Existing BM all-groups config behavior is unchanged.
- [ ] Reload/hydration restores rows + active config only for same FB user.
- [ ] Legacy BM type/status/quality groups are optional and isolated.
- [ ] Legacy failures do not overwrite current BM status unless explicitly mapped.
- [ ] Disabled BM groups do not call APIs.
- [ ] `businessID` constant remains unchanged where `token_g` uses it.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Legacy doc IDs stale | Keep group optional; show per-group error only |
| Current vs legacy status conflict | Store/display separately first; do not replace current status silently |
| Too many BM columns | Add data first; only expose UI columns if product value is clear |
| Cache active config from old shape | Accept old cache shape and rewrite after refresh |
