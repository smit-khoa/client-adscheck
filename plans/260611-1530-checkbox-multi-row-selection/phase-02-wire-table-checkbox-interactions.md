---
phase: 2
title: "Wire Table Checkbox Interactions"
status: completed
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Wire Table Checkbox Interactions

## Overview

Connect the tested checkbox range logic to `Table.vue` checkbox cells, including drag, Shift-click, and drag highlight.

## Requirements

- Functional: every `Table` with `showCheckbox` supports checkbox drag range selection.
- Functional: Shift-click from the last checkbox action applies anchor state to ending row.
- Functional: normal single click behavior remains unchanged.
- Functional: checkbox range events do not trigger cell range-select/copy.
- Non-functional: touch `Table.vue` surgically; avoid broad refactor of the monolith.

## Architecture

Wire event handlers directly on the checkbox cell/label region. Use `.checkbox-cell` as the boundary because existing body range-select already excludes that class.

Use delayed drag activation:

1. mousedown records pending anchor.
2. if pointer leaves anchor row/cell while mouse is down, enter dragging.
3. during drag, update focus row + highlight range.
4. on mouseup, apply range once.
5. if no drag occurred, let existing single checkbox click path work.

Shift-click should use the composable anchor/action and apply range without entering drag mode.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Modify: `packages/shared-ui/src/components/ui/table/style.css`
- Use: `packages/shared-ui/src/components/ui/table/composables/use-checkbox-row-range-selection.ts`
- Use: `packages/shared-ui/src/components/ui/table/composables/range-coords.ts`

## Implementation Steps

1. Read the current checkbox header/body template and `toggleRowSelection1` implementation.
2. Add composable initialization near existing range-select setup.
3. Add mouse/shift handlers only to checkbox row cells or their label wrapper.
4. Ensure plain click still flows through existing `@update:model-value` toggle.
5. Add class binding for drag highlight.
6. Guard missing row id, pivot/group rows, and empty placeholder rows.
7. Confirm existing `shouldSkipBodyTarget` range-select skip remains intact.

## Success Criteria

- [x] Single click checkbox still toggles one row.
- [x] Drag down and drag up apply range by anchor state.
- [x] Shift-click applies range by anchor action.
- [x] No cell range-select starts from checkbox column.
- [x] Highlight is visible while drag is active and disappears after mouseup/cancel.
- [x] No app files are required for the behavior to be available globally to `showCheckbox` tables.

## Verification

- `pnpm --filter @mf2/shared-ui typecheck` passed.
- `pnpm --filter @mf2/shared-ui test` passed.
- Code reviewer flagged stale anchor on data change and a confusing local action variable; both fixed.

## Risk Assessment

- Risk: label mousedown suppresses checkbox native/reka update.
  - Mitigation: do not prevent default for normal click; only intercept when drag activates.
- Risk: global mouse listeners leak.
  - Mitigation: cleanup on mouseup and component unmount.
- Risk: Table.vue grows harder to maintain.
  - Mitigation: keep state machine helpers in composable; Table only passes rows/ids/events.
