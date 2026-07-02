---
phase: 1
title: "Correct Range Actions Pane Coordinates"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Correct Range Actions Pane Coordinates

## Overview

Fix the floating Copy/Settings button position so it uses the current pane-split coordinate system. The button cluster should anchor to the selected range bottom-right and clamp to the visible table area when the natural anchor scrolls out of view.

## Requirements

- Functional: `range-actions` appears at selected range bottom-right for multi-cell selections.
- Functional: when selection corner scrolls out of view, `range-actions` clamps to visible table edge.
- Functional: frozen-only ranges keep the buttons inside frozen pane.
- Functional: non-frozen and mixed ranges keep buttons usable in the visible table viewport.
- Non-functional: no public API change; no new dependency; preserve existing range clear/copy behavior.

## Architecture

Current mismatch:

- `use-table-range-selection.ts` computes `actionsAnchor` in content space.
- `Table.vue` renders `.range-actions` under `.table-pane-root` and applies another conversion: `50 + anchor.top - scrollTop`, `anchor.left - scrollLeft`.
- After pane split, `.table-pane-root` and `.table-pane-scroll-body` no longer share the old single-container axis.

Target model:

- `actionsAnchor` returns visual coordinates relative to `.table-pane-root`.
- `Table.vue` binds `top` and `left` directly from `actionsAnchor`.
- Frozen-only range clamps horizontally in the frozen band.
- Non-frozen/mixed range clamps horizontally in the table viewport.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts`
- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read if needed: `packages/shared-ui/src/components/ui/table/composables/range-coords.ts`
- Read if needed: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Revisit `actionsAnchor` math in `use-table-range-selection.ts`.
2. Convert natural range bottom-right from content coordinates into visual `.table-pane-root` coordinates.
3. Keep vertical clamp below header and inside visible body height.
4. Keep frozen-only horizontal clamp inside `[ACTIONS_INSET, frozenWidth - ACTIONS_WIDTH - ACTIONS_INSET]`.
5. Keep non-frozen/mixed horizontal clamp inside the visible full table viewport.
6. Update `rangeActionsStyle` in `Table.vue` to use anchor visual coordinates directly.
7. Ensure `.range-actions` remains excluded from click-outside clearing and still receives pointer events.
8. If existing unit tests cover anchor math, update them; if not, rely on browser checklist and avoid broad test scaffolding.

## Success Criteria

- [ ] `Table.vue` no longer double-converts `actionsAnchor` with stale `50 + top - scrollTop` / `left - scrollLeft` logic.
- [ ] Non-frozen selection shows actions near bottom-right of selected range.
- [ ] Frozen-only selection keeps actions in frozen band.
- [ ] Scrolling selected corner out of view clamps actions to visible table edge.
- [ ] Copy/Settings buttons remain clickable.
- [ ] No range clear behavior regression from clicking `.range-actions`.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Mixed frozen/non-frozen range has ambiguous anchor | Prioritize visible clamp and usability; document exact browser result if imperfect. |
| Dynamic row height changes vertical math | Reuse existing `rangeToRect` and `rowGeometry()` instead of new row math. |
| Coordinate changes break auto-scroll selection | Do not touch mouse pipeline or auto-scroll; only action anchor conversion. |
