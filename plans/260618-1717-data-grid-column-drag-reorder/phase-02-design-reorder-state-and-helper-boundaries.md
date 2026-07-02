---
phase: 2
title: "Design reorder state and helper boundaries"
status: pending
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 2: Design reorder state and helper boundaries

## Overview

Define the minimal state and helper functions for header drag reorder. Keep it surgical: no new dependency, no broad table rewrite.

## Requirements

- Functional: define drag state for dragged field, zone, pointer position, candidate target, and drop indicator.
- Functional: define reorder helpers for same-zone frozen and non-frozen columns.
- Functional: define safe localStorage read/write helper scoped to table column config.
- Non-functional: code remains readable inside already-large `Table.vue`; extract to a composable only if needed.

## Architecture

Recommended state:

- `columnDragState`: reactive object with `active`, `field`, `zone`, `pointerX`, `pointerY`, `targetField`, `insertBefore`, `valid`.
- Header handle calls `startColumnDrag(event, field, zone)`.
- Document-level pointer handlers update preview and commit/cancel on pointerup.
- `reorderColumnWithinZone(field, targetField, insertBefore, zone)` mutates:
  - `frozenOrder` for `zone === "frozen"`.
  - `columnsApply` for `zone === "non-frozen"`, preserving frozen and hidden fields.
- `persistColumnOrder()` writes `config_column` using existing table config shape.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Modify: `packages/shared-ui/src/components/ui/table/style.css`
- Optional create: `packages/shared-ui/src/components/ui/table/composables/use-table-column-reorder.ts`

## Implementation Steps

1. Decide whether helper functions stay in `Table.vue` or move to `use-table-column-reorder.ts`.
2. Add small type aliases for reorder zone and drag state.
3. Draft pure helper for array reorder.
4. Draft safe table config read/write functions.
5. Define DOM hit-testing approach for visible header cells via `data-field` and same-zone metadata/classes.

## Success Criteria

- [ ] Reorder logic has one clear source of truth.
- [ ] Same-zone rule is enforced before any state mutation.
- [ ] Persistence helper preserves unrelated table configs.
- [ ] No new runtime dependency is introduced.

## Risk Assessment

- Risk: helper extraction creates too many files for one feature.
  - Mitigation: keep helpers inline unless TypeScript/template complexity becomes hard to follow.
- Risk: hit-testing virtual columns misses offscreen columns.
  - Mitigation: v1 supports visible header targets; table already virtualizes offscreen columns.
