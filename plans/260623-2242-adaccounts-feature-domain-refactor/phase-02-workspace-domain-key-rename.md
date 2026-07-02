---
phase: 2
title: "Workspace domain key rename"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Workspace Domain Key Rename

## Overview

Rename workspace tab code keys from `tkqc/bm` to `adaccounts/businesses` while preserving UI labels `TKQC` and `BM`.

## Requirements

- Functional: workspace tabs render and switch exactly as before.
- Functional: active tab union becomes `adaccounts | businesses | page | pixel`.
- Non-functional: keep user-facing labels stable.

## Architecture

Only the internal workspace tab value changes. Labels remain localized/product-friendly.

```text
old: tkqc -> new: adaccounts  label: TKQC
old: bm   -> new: businesses  label: BM
```

This phase updates imports from wrapper folders only where needed. Full folder consolidation happens in later phases.

## Related Code Files

- Modify: `apps/adaccounts/src/features/workspace/types/workspace.types.ts`
- Modify: `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `.claude/features/adaccounts-workspace-tabs.md`
- Potential modify: any file comparing literal `'tkqc'` or `'bm'`

## Implementation Steps

1. Search literal tab keys:
   ```bash
   grep -R "'tkqc'\|'bm'\|\"tkqc\"\|\"bm\"" -n apps/adaccounts/src/features apps/adaccounts/src/pages
   ```
2. Update `WorkspaceTab` type to `adaccounts | businesses | page | pixel`.
3. Update `WORKSPACE_TABS` values while keeping labels `TKQC` and `BM`.
4. Update `AdAccountsWorkspace` conditional rendering for the new keys.
5. Keep current wrapper imports temporarily (`tkqc`, `bm`) if folder moves are not yet done.
6. Update workspace feature doc to describe the new code keys.
7. Run focused verification.

## Success Criteria

- [x] Workspace tab type no longer exposes `tkqc` or `bm` values.
- [x] UI labels still show `TKQC` and `BM`.
- [x] Existing tab content still renders under renamed internal keys.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes or only existing warnings remain.
- [x] `pnpm verify:features` passes.

## Risk Assessment

- Risk: tab value rename breaks persisted active tab if it is later persisted.
  - Mitigation: current store uses in-memory ref only; if persistence is found in Phase 1, add key migration.
- Risk: UI copy accidentally changes.
  - Mitigation: explicitly keep labels unchanged in `WORKSPACE_TABS`.
