---
phase: 3
title: "Panel 2 Integration"
status: completed
priority: P1
dependencies: [1, 2]
---

# Phase 3: Panel 2 Integration

## Overview

Wire `ToolStepFrame.vue` into `ToolDetailPanel.vue`, replace the static `v-for` with `vuedraggable`, and connect remove/reorder behavior while preserving runner and form behavior.

## Requirements

- Functional: Panel 2 renders selected steps through `ToolStepFrame`.
- Functional: drag handle reorders selected workflow only.
- Functional: runner loop follows reordered selectedFunctions order.
- Functional: `X` removes a selected step and keeps form values.
- Functional: expand/collapse still uses `expandedStepIds` and `toggleStepExpanded`.
- Non-functional: no runner/API behavior changes.

## Architecture

```text
ToolDetailPanel.vue
  import Draggable from 'vuedraggable'
  import ToolStepFrame from './ToolStepFrame.vue'

  selectedStepItems = computed({
    get: () => selectedFunctions.value,
    set: next => reorderSelectedFunctions(next.map(fn => fn.id)),
  })

  Draggable v-model="selectedStepItems"
    item slot -> ToolStepFrame
      slot -> ToolFunctionForm + warning
```

Keep `runSelectedWorkflow()` unchanged except it naturally reads reordered `selectedFunctions`.

## Related Code Files

- Modify: `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- Modify if exports are needed: `apps/adaccounts/src/features/adaccounts/tools/index.ts`

## Implementation Steps

1. Import `Draggable` from `vuedraggable` and `ToolStepFrame`.
2. Destructure `removeSelectedFunction` and `reorderSelectedFunctions` from `toolActions`.
3. Add computed `selectedStepItems` getter/setter.
4. Replace current `template v-for` step loop with `<Draggable v-model="selectedStepItems" item-key="id" handle=".tool-step-drag-handle">`.
5. Render each item through `ToolStepFrame`.
6. Pass `expanded`, `stepNumber`, `runnable` into the frame.
7. Wire `@toggle="toggleStepExpanded(fn.id)"`.
8. Wire `@remove="removeSelectedFunction(fn.id)"`.
9. Keep `ToolFunctionForm variant="panel-two"` inside the expanded slot.
10. Preserve warning for unwired tools.
11. Keep delay chips or spacing between draggable items if still visually needed; ensure drag ghost/chosen classes are readable.

## Success Criteria

- [x] Multiple selected functions render as multiple path-card steps.
- [x] Dragging a step changes order in Panel 2.
- [x] Panel 1 order is unchanged after Panel 2 drag.
- [x] Run button uses reordered order.
- [x] Remove X deletes the selected step from Panel 2.
- [x] Re-selecting removed function restores prior values.
- [x] Expand/collapse still works after drag and remove.
- [x] Empty state still renders when no selected steps.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| `vuedraggable` typing is noisy | Use the existing Vue 3 draggable import pattern from the repo if available; otherwise keep computed item type simple |
| Drag handle toggles step | Separate handle from toggle target |
| Remove changes active step awkwardly | Reuse existing `removeSelectedFunction`; it sets active to last selected id when needed |
| Delay chip position looks odd while dragging | Keep item wrapper simple and verify visual in manual smoke |
