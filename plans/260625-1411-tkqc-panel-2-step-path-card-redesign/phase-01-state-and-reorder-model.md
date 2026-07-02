---
phase: 1
title: "State and Reorder Model"
status: completed
priority: P1
dependencies: []
---

# Phase 1: State and Reorder Model

## Overview

Add workflow-only reorder support to the tool-actions state so Panel 2 can reorder selected steps without mutating Panel 1 catalog order.

## Requirements

- Functional: expose a method to reorder selected workflow ids only.
- Functional: preserve expanded step state and selected form values after reorder.
- Functional: keep existing `removeSelectedFunction(id)` behavior: remove from workflow, keep form values.
- Non-functional: no localStorage write for workflow-only reorder unless later scoped; catalog order persistence remains separate.

## Architecture

Current selected workflow state:

```text
create-tool-actions.ts
  selectedFunctionIds -> selectedFunctions computed -> ToolDetailPanel runner loop
```

Add:

```ts
reorderSelectedFunctions(nextIds: string[]): void
```

The method filters `nextIds` against the current selected id set and appends any selected ids missing from the incoming list. This keeps state robust if a drag event produces an incomplete array.

## Related Code Files

- Modify: `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts`

## Implementation Steps

1. Add `reorderSelectedFunctions` to `ToolActionsInstance`.
2. Implement function near selected-step methods.
3. Filter `nextIds` to ids currently in `selectedFunctionIds`.
4. Append missing selected ids in previous order as a safety fallback.
5. Do not touch `orderedFunctions`, `enabledIds`, `expandedIds`, or form values.
6. Return the method from `createToolActions`.

## Success Criteria

- [x] `reorderSelectedFunctions` exists on the tool-actions instance.
- [x] Reorder changes only `selectedFunctionIds`.
- [x] Panel 1 catalog order remains controlled by existing `reorder()`.
- [x] Removed/reordered step values stay in `formValuesById`.
- [x] TypeScript interface stays strict.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| New method overlaps existing `reorder()` | Name explicitly `reorderSelectedFunctions` and document workflow-only intent through implementation location/usage |
| Drag event drops an id | Filter + append missing selected ids to avoid data loss |
| Runner order unchanged | `selectedFunctions` already derives from `selectedFunctionIds`, so runner loop follows the new order |
