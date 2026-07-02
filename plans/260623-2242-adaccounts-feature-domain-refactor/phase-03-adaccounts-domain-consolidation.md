---
phase: 3
title: "Adaccounts domain consolidation"
status: completed
priority: P1
dependencies: [2]
---

# Phase 3: Adaccounts Domain Consolidation

## Overview

Move TKQC/ad account table, selection, and tools from historical folders into `features/adaccounts`.

## Requirements

- Functional: Adaccounts/TKQC tab table loads the same rows as before.
- Functional: account selection still drives the function panel.
- Functional: tool panel still runs existing TKQC/adaccount tools.
- Non-functional: preserve localStorage keys and runner semantics.

## Architecture

Consolidate these old folders:

```text
features/tkqc/**
features/account-list/**
features/account-selection/**
features/tool-actions/**
```

Into:

```text
features/adaccounts/
  api/
  components/
  composables/
  stores/
  tools/
  types/
  index.ts
```

Low-level runners in `apps/adaccounts/src/api/tools/**` can remain if they are app API infra. Domain UI/catalog/form logic should live under `features/adaccounts/tools` unless it is proven app-local common.

## Related Code Files

- Create/modify: `apps/adaccounts/src/features/adaccounts/**`
- Delete after migration: `apps/adaccounts/src/features/tkqc/**`
- Delete after migration: `apps/adaccounts/src/features/account-list/**`
- Delete after migration: `apps/adaccounts/src/features/account-selection/**`
- Delete/move after migration: `apps/adaccounts/src/features/tool-actions/**`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `.claude/features/adaccounts-tkqc-tab.md` or rename/create replacement doc if chosen
- Modify: `.claude/features/adaccounts-account-list.md`
- Modify: `.claude/features/adaccounts-account-selection.md`
- Modify: `.claude/features/adaccounts-tool-actions.md`
- Modify: `.claude/features/README.md`

## Implementation Steps

1. Move wrapper components:
   - `TkqcTableView.vue` -> adaccounts domain component with clear name.
   - `TkqcFunctionPanel.vue` -> adaccounts domain component with clear name.
2. Move account list API/components/composables/types into `features/adaccounts`.
3. Move account selection composable/store/types into `features/adaccounts`.
4. Move adaccount tool UI/catalog/composables/types into `features/adaccounts/tools`.
5. Update imports to use the new domain barrel where useful.
6. Remove old folders only after typecheck confirms imports are updated.
7. Update feature docs with real new paths.
8. Run verification.

## Success Criteria

- [x] `features/adaccounts` owns table, selection, and tools for the Adaccounts/TKQC tab.
- [x] Removed folders are no longer imported: `tkqc`, `account-list`, `account-selection`, `tool-actions`.
- [x] Tool runner behavior is unchanged.
- [x] Existing localStorage keys remain stable unless a migration is documented.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes or only existing warnings remain.
- [x] Relevant feature docs pass `pnpm verify:features`.

## Risk Assessment

- Risk: generic tool components are used by Page tools too.
  - Mitigation: if still shared by 2 domains after move, extract app-local common outside `features` rather than create `features/common`.
- Risk: path rename hides behavior changes.
  - Mitigation: no runner logic changes in this phase unless required for imports.
