# Checkbox Multi-row Selection

---
date: 2026-06-11
type: implementation-journal
feature: shared-ui table checkbox selection
---

## Context

Implemented checkbox multi-row selection for shared-ui `Table`.

## What Changed

- Added pure helper: `packages/shared-ui/src/components/ui/table/composables/use-checkbox-row-range-selection.ts`.
- Added tests: `packages/shared-ui/src/components/ui/table/composables/__tests__/use-checkbox-row-range-selection.test.ts`.
- Wired checkbox drag + Shift-click into `packages/shared-ui/src/components/ui/table/Table.vue`.
- Added drag highlight style in `packages/shared-ui/src/components/ui/table/style.css`.
- Updated `.claude/features/shared-ui-data-grid-table.md`.
- Synced plan status in `plans/260611-1530-checkbox-multi-row-selection/`.

## Decisions

- Anchor row decides action: unchecked anchor selects range; checked anchor deselects range.
- Checkbox range works for all plain tables with `showCheckbox`; no new opt-in prop.
- Group/pivot rows skipped because row identity can be summary/group-only.
- Kept existing `checkedConfig.selected` mutation pattern; no refactor in this scope.
- Kept checkbox range isolated from cell range-select by scoping events to `.checkbox-cell`.

## Verification

- `pnpm --filter @mf2/shared-ui test` — passed, 42 tests.
- `pnpm --filter @mf2/shared-ui typecheck` — passed.
- `pnpm --filter @mf2/adaccounts typecheck` — passed.
- `pnpm verify:all` — passed.
- Tester and code-reviewer subagents completed with concerns; stale anchor and confusing local action cleanup were fixed.

## Known Gaps

- Browser smoke test still recommended for real drag feel and virtualization edge cases.
- No auto-scroll during checkbox drag in this implementation; current requirement did not demand it.
