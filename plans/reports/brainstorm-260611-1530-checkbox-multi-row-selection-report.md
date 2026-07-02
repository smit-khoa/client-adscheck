---
type: brainstorm-report
status: agreed
date: 2026-06-11
feature: checkbox multi-row selection for shared-ui table
---

# Checkbox Multi-row Selection Brainstorm Report

## Summary

Add multi-row selection to shared-ui `Table` checkbox column:

- Drag from one checkbox cell to another checkbox cell.
- Shift-click from anchor row to ending row.
- Apply to every `Table` usage that has `showCheckbox` enabled.
- Use the first/anchor row state as the action intent:
  - anchor unchecked -> select range
  - anchor checked -> deselect range
- Show light highlight while dragging.

Recommended design approved: create a separate checkbox selection composable and wire it into `Table.vue`.

## Codebase Findings

- Stack: Vue 3 Composition API, TypeScript, Tailwind CSS, shadcn-vue/reka-ui, pnpm monorepo, Turborepo.
- Core table: `packages/shared-ui/src/components/ui/table/Table.vue`.
- Existing range selection: `packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts`.
- Geometry utilities: `packages/shared-ui/src/components/ui/table/composables/range-coords.ts`.
- Table styles: `packages/shared-ui/src/components/ui/table/style.css`.
- Feature doc to update after implementation: `.claude/features/shared-ui-data-grid-table.md`.
- Consumer example: `apps/adaccounts/src/features/account-list/components/AdAccountTable.vue`.

## Requirements

### Expected behavior

1. Checkbox drag:
   - User presses on checkbox cell in row A.
   - User drags vertically to row B inside checkbox column.
   - Rows A..B get selected or deselected according to row A's initial state.

2. Shift-click:
   - User selects or deselects one row.
   - User holds Shift and clicks another checkbox cell.
   - Rows between anchor and clicked row receive the anchor action.

3. Scope:
   - Applies to every `Table` with `showCheckbox` enabled.
   - No per-app opt-in prop required.

4. Visual feedback:
   - Light highlight on swept checkbox range while dragging.

## Out of Scope

- Refactor `checkedConfig` mutation model.
- Fix existing declared-but-unused `row-select` / `row-select-all` emits.
- Rework app-level selection stores.
- Add grouping/pivot support for checkbox range if row id is not available.
- Add new bulk action UX outside checkbox column.

## Evaluated Approaches

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Separate composable | Keeps checkbox range logic isolated, easier to test, avoids adding more weight to existing range-select composable | Adds one file and Table wiring | Recommended + approved |
| Extend existing range-select composable | Reuses state machine concepts in one place | Existing file already large; risks conflict with cell range-copy behavior | Not chosen |
| Inline logic in `Table.vue` | Fastest initial patch | `Table.vue` already large; hard to test/maintain | Not chosen |

## Final Design

### Architecture

Add a new composable, likely:

- `packages/shared-ui/src/components/ui/table/composables/use-checkbox-row-range-selection.ts`

Responsibilities:

- Track anchor row index/id and action intent (`select` or `deselect`).
- Track drag range for temporary highlight.
- Support delayed drag activation so normal click remains normal click.
- Handle Shift-click range apply.
- Map pointer `clientY` to row index using existing `rowIndexFromY` geometry.
- Guard rows with missing `key_id`.

Wire into `Table.vue` only when:

- `showCheckbox` is true.
- Not pivot/group mode if row identity is unavailable.
- Event target is inside `.checkbox-cell` to avoid conflict with existing cell range-select.

### State intent

- On anchor mouse down / click, read whether anchor row is selected before action.
- If currently selected -> action is deselect range.
- If currently unselected -> action is select range.
- Apply same action to every row id in the range.

### Highlight

Add CSS class in `style.css`, e.g. checkbox range sweep class, using design tokens.

Keep highlight lightweight and limited to checkbox column / row cells involved in drag. Avoid overlay layer because previous range-select journal found overlay caused stacking and scroll jitter issues.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Shared-ui singleton regression | Keep behavior gated by `showCheckbox`; additive code only; no public API removal |
| Conflict with existing range-select | Handle only `.checkbox-cell`; existing range-select already skips `.checkbox-cell` |
| Plain click accidentally suppressed | Use delayed drag activation; do not prevent normal click unless drag activates |
| Virtualized rows | Use existing index-based geometry (`rowIndexFromY`) rather than DOM offsets |
| Empty/group rows without id | Skip rows where `row.data?.[key_id]` is missing |
| Current selection emits unused | Follow current `checkedConfig.selected` mutation pattern; do not depend on emits |

## Success Criteria

- Click one checkbox still toggles one row.
- Drag down/up in checkbox column selects/deselects continuous range by anchor state.
- Shift-click applies anchor state across range.
- Works for all `Table` instances with `showCheckbox`.
- Existing cell range-select/copy still works when enabled.
- Highlight appears only during checkbox drag range.
- `pnpm --filter @mf2/shared-ui test` passes.
- Relevant typecheck/build passes.
- `.claude/features/shared-ui-data-grid-table.md` updated after implementation.

## Recommended Next Step

Create implementation plan with `/ck:plan --tdd` because this changes shared table interaction behavior and should lock down pure range-selection logic before wiring UI.

## Unresolved Questions

None.
