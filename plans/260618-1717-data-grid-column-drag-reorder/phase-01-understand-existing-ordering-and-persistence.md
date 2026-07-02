---
phase: 1
title: "Understand existing ordering and persistence"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Understand existing ordering and persistence

## Overview

Verify the current table column order pipeline before changing behavior. This phase prevents accidental regressions around `currentColumns`, `columnsApply`, `frozenOrder`, custom-column modal persistence, and virtual column offsets.

## Requirements

- Functional: identify exact state variables and functions that determine rendered column order.
- Functional: identify localStorage read/write shape for `config_column`.
- Non-functional: no code changes in this phase unless a tiny comment/note is required later; prefer read-only discovery.

## Architecture

Current expected flow:

`props.columns` → `computeOrderedColumns()` → `currentColumns` → `columnsApply` + `frozenOrder` → `frozenColumns` / `nonFrozenColumns` → `visibleColumns` / `virtualNonFrozenColumns` → header/body/footer render.

Persistence currently comes from the `config_column` localStorage object keyed by `config_<table_info.name>`.

## Related Code Files

- Read: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read: `packages/shared-ui/src/components/ui/table/CustomColumn.vue`
- Read: `.claude/features/shared-ui-data-grid-table.md`
- Modify: none in this phase

## Implementation Steps

1. Trace `computeOrderedColumns`, `getInitialColumnsApply`, `applyColumnSettings1`, `toggleFreeze`, and any config write path.
2. Confirm how hidden columns are represented when saving column config.
3. Confirm whether `frozenOrder` and `columnsApply` can be updated independently without breaking virtual offsets.
4. Note exact insertion points for reorder handlers and CSS classes.

## Success Criteria

- [ ] The implementation phase has exact functions/state to reuse.
- [ ] Persistence shape is verified before writing helper code.
- [ ] Known conflicts with resize/range-select/dropdown are listed.

## Risk Assessment

- Risk: misreading localStorage shape causes hidden/frozen columns to disappear.
  - Mitigation: inspect current save path and preserve fields not involved in reorder.
- Risk: reordering only `currentColumns` but not `columnsApply` may not update rendered order.
  - Mitigation: update the same state that computed render order already reads.
