---
title: "Checkbox Multi-row Selection for Shared Table"
status: completed
created: 2026-06-11
source: ck-plan --tdd
brainstorm_report: ../reports/brainstorm-260611-1530-checkbox-multi-row-selection-report.md
blockedBy: []
blocks: []
---

# Checkbox Multi-row Selection for Shared Table

## Goal

Add multi-row checkbox selection to shared-ui `Table` so every table with `showCheckbox` supports:

- drag from checkbox cell A to checkbox cell B
- Shift-click from anchor row to ending row
- select/deselect range by anchor row state
- light drag highlight

## Constraints

- Shared-ui is a Module Federation singleton: changes must be additive and low regression.
- Keep current `checkedConfig.selected` mutation pattern; do not refactor it in this plan.
- Do not depend on existing `row-select` / `row-select-all` emits because they are currently declared but unused.
- Do not change app-level selection stores.
- Avoid conflicts with existing cell range-select/copy; checkbox interactions must stay scoped to `.checkbox-cell`.

## Phases

| # | Phase | Status | Priority |
|---|---|---|---|
| 1 | [Design Pure Checkbox Range Logic](phase-01-design-pure-checkbox-range-logic.md) | completed | P1 |
| 2 | [Wire Table Checkbox Interactions](phase-02-wire-table-checkbox-interactions.md) | completed | P1 |
| 3 | [Verify Shared Table and Docs](phase-03-verify-shared-table-and-docs.md) | completed | P1 |

## TDD Strategy

1. First test pure range/id selection logic independent of DOM.
2. Then wire mouse/shift handlers into `Table.vue` using the tested helpers/composable.
3. Finally run package tests, typecheck/build, and update feature docs.

## Success Criteria

- [x] Single checkbox click still toggles one row.
- [x] Drag in checkbox column selects/deselects a continuous range by anchor state.
- [x] Shift-click applies anchor action across a continuous range.
- [x] Works wherever `showCheckbox` is enabled.
- [x] Existing cell range-select/copy remains isolated from checkbox column events.
- [x] Light highlight appears while dragging.
- [x] `pnpm --filter @mf2/shared-ui test` passes.
- [x] Relevant typecheck/build commands pass or failures are reported with output.
- [x] `.claude/features/shared-ui-data-grid-table.md` reflects the new behavior.

## Verification Log

- `pnpm --filter @mf2/shared-ui test` — passed, 42 tests.
- `pnpm --filter @mf2/shared-ui typecheck` — passed.
- `pnpm --filter @mf2/adaccounts typecheck` — passed.
- `pnpm verify:all` — passed.
- Tester subagent: DONE_WITH_CONCERNS; concerns addressed or documented.
- Code reviewer subagent: DONE_WITH_CONCERNS; stale anchor and dead action cleanup fixed.

## Out of Scope

- Refactor `Table.vue` broadly.
- Fix declared-but-unused selection emits.
- Change `checkedConfig` API shape.
- Add app-specific opt-in props.
- Add group/pivot checkbox-range behavior when rows lack stable ids.
