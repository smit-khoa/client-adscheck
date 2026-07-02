---
phase: 1
title: "State and catalog model"
status: completed
priority: P1
dependencies: []
---

# Phase 1: State and Catalog Model

## Overview

Prepare the TKQC tool state and catalog data for the new selected-function two-panel model without changing the visible UI yet.

This phase should be small and reversible: add selected-function state, keep current form value reuse, and make the 4 temporary groups explicit in the catalog layer.

## Requirements

- Functional: expose one selected TKQC function ID and selected function computed value.
- Functional: keep `valuesFor(fn)` behavior so existing field defaults still work.
- Functional: add temporary 4-group mapping using the approved labels.
- Functional: do not remove old `enabledIds`/`expandedIds` until UI replacement is ready, unless removing them is purely TKQC-local and safe.
- Non-functional: no shared-ui changes.
- Non-functional: no BM/Page/Pixel behavior change.

## Architecture

Current TKQC uses `createToolActions` for order, expanded IDs, enabled IDs, and per-tool form values. The new model needs a single `selectedFunctionId` and helpers:

```text
ToolGroupList click
  -> selectFunction(functionId)
  -> selectedFunction computed updates
  -> ToolDetailPanel reads selectedFunction + valuesFor(selectedFunction)
```

Keep this state in the existing tool-actions instance so Panel 1 and Panel 2 stay in sync without a new Pinia store.

The 4-group mapping should live close to `adaccount-tool-catalog.ts`. Prefer adding a derived `TOOL_UI_GROUPS` or similar TKQC-specific export rather than mutating shared field schema. Because the user said mapping can be arbitrary for now, choose a simple deterministic split:

- `Super Share`: share/partner/admin-like tools where present.
- `Kháng TKQC`: appeal/review/status-recovery-like tools where present.
- `Đổi Info`: rename/info/config-like tools.
- `Xoá QTV ẩn`: remove-user/admin-cleanup-like tools.

If a function does not obviously belong, distribute it to keep groups non-empty and easy to edit later.

## Related Code Files

- Modify: `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts`
- Modify: `apps/adaccounts/src/composables/tool-actions/tool-actions-context.ts` only if shared child components need injected selected state
- Modify: `apps/adaccounts/src/features/adaccounts/tools/composables/use-tool-actions.ts`
- Modify: `apps/adaccounts/src/features/adaccounts/tools/data/adaccount-tool-catalog.ts`
- Read only: `apps/adaccounts/src/types/tool-action.types.ts`

## Implementation Steps

1. Inspect `create-tool-actions.ts` and its current public return shape.
2. Add selected-function state:
   - `selectedFunctionId: Ref<string | null>`
   - `selectedFunction: ComputedRef<ToolFunction | null>`
   - `selectFunction(id: string): void`
   - optional `clearSelectedFunction(): void`
3. Initialize selected function to the first available TKQC function if that improves empty-state UX; otherwise keep null and let Panel 2 show an empty state.
4. Keep existing `valuesFor(fn)` unchanged.
5. Add an editable 4-group export in `adaccount-tool-catalog.ts` using approved labels.
6. Ensure every existing function appears exactly once in the temporary UI groups.
7. Do not remove old flat exports yet; Page and existing code may still depend on them.

## Success Criteria

- [x] TKQC tool-actions instance exposes selected function state.
- [x] Existing current `ToolList`/`ToolPanel` can still typecheck before phase 2 replaces them.
- [x] 4 UI groups are exported with approved labels.
- [x] No function is dropped from the catalog mapping.
- [x] No BM/Page/Pixel files are modified.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Break generic Page tool actions by changing factory contract too aggressively | Add selected state additively; preserve existing return members. |
| Catalog mapping duplicates/drops tools | Build groups from existing function IDs and verify all IDs exactly once. |
| State naming unclear | Use explicit names: `selectedFunctionId`, `selectedFunction`, `selectFunction`. |
