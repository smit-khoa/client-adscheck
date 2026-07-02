---
phase: 4
title: "Businesses domain consolidation"
status: completed
priority: P1
dependencies: [3]
---

# Phase 4: Businesses Domain Consolidation

## Overview

Move BM/business data loading, selection, action panel, tool catalog/types, and utilities into `features/businesses`.

## Requirements

- Functional: Businesses/BM tab data loading renders the same UI and rows.
- Functional: BM selection still drives BM action panel selected count.
- Functional: BM tools still compile and dispatch through existing runners.
- Non-functional: low-level FB token/graph/extension infra stays in `apps/adaccounts/src/api`.

## Architecture

Consolidate these old folders:

```text
features/bm/**
features/bm-data-loading/**
features/bm-actions/**
features/bm-tool-types/**
```

Into:

```text
features/businesses/
  api/
  components/
  composables/
  stores/
  tools/
  utils/
  types/
  index.ts
```

Keep app API infra:

```text
apps/adaccounts/src/api/fb.ts
apps/adaccounts/src/api/fb-bm-token.ts
apps/adaccounts/src/api/fb-token-cache.ts
apps/adaccounts/src/api/fb-graph.ts
apps/adaccounts/src/api/smit-connect.ts
apps/adaccounts/src/api/tools/bm/**
```

## Related Code Files

- Create/modify: `apps/adaccounts/src/features/businesses/**`
- Delete after migration: `apps/adaccounts/src/features/bm/**`
- Delete after migration: `apps/adaccounts/src/features/bm-data-loading/**`
- Delete after migration: `apps/adaccounts/src/features/bm-actions/**`
- Delete after migration: `apps/adaccounts/src/features/bm-tool-types/**`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `.claude/features/adaccounts-bm-tab.md` or replacement doc naming
- Modify: `.claude/features/adaccounts-bm-data-loading.md`
- Modify: `.claude/features/README.md`

## Implementation Steps

1. Move BM wrapper components into `features/businesses/components`.
2. Move BM data loading components/composables/stores/types/utils/api into `features/businesses`.
3. Move BM action UI/composables/data/tool types into `features/businesses/tools`.
4. Update `use-bm-runner` imports so runners still point to `src/api/tools/bm/**`.
5. Update workspace imports and count mapping for `businesses` key.
6. Remove old BM folders once typecheck is green.
7. Update feature docs with real new paths and naming.
8. Run verification.

## Success Criteria

- [x] `features/businesses` owns BM table/data loading/selection/actions/tool types.
- [x] Removed folders are no longer imported: `bm`, `bm-data-loading`, `bm-actions`, `bm-tool-types`.
- [x] `apps/adaccounts/src/api/tools/bm/**` remains as runner/API infra.
- [x] No BM runner semantics change.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes or only existing warnings remain.
- [x] Relevant feature docs pass `pnpm verify:features`.

## Risk Assessment

- Risk: BM has many runner imports and type names using `Bm`.
  - Mitigation: folder/domain rename does not require renaming every exported symbol in one pass; keep symbol names if changing them adds risk.
- Risk: token helper path assumptions break.
  - Mitigation: low-level `src/api` remains unmoved.
