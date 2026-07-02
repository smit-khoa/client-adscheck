---
phase: 1
title: "Design Pure Checkbox Range Logic"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Design Pure Checkbox Range Logic

## Overview

Create the test-first core for checkbox range selection before touching `Table.vue` event wiring.

## Requirements

- Functional: compute row ranges, action intent, and selected id updates from anchor/cursor rows.
- Functional: support select and deselect range by anchor row state.
- Functional: skip rows without a valid id.
- Non-functional: pure logic must be unit-testable without DOM/browser layout.

## Architecture

Add a small helper/composable layer under the table composables folder. Keep the logic separate from `use-table-range-selection.ts` so checkbox selection does not couple to cell range-copy behavior.

Candidate files:

- Create: `packages/shared-ui/src/components/ui/table/composables/use-checkbox-row-range-selection.ts`
- Create: `packages/shared-ui/src/components/ui/table/composables/__tests__/use-checkbox-row-range-selection.test.ts`
- Reuse: `packages/shared-ui/src/components/ui/table/composables/range-coords.ts`

## Related Code Files

- Read: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read: `packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts`
- Read: `packages/shared-ui/src/components/ui/table/composables/range-coords.ts`
- Create: `packages/shared-ui/src/components/ui/table/composables/use-checkbox-row-range-selection.ts`
- Create: `packages/shared-ui/src/components/ui/table/composables/__tests__/use-checkbox-row-range-selection.test.ts`

## Implementation Steps

1. Write failing tests for:
   - range normalization when dragging down and up
   - anchor unchecked -> add every valid id in range
   - anchor checked -> remove every valid id in range
   - Shift-click uses anchor action
   - missing ids are skipped
   - duplicate selection ids remain unique
2. Implement minimal pure helpers/composable state needed by tests.
3. Keep exported API small: only what `Table.vue` needs for pointer/shift handling.
4. Avoid any app-specific terms like ad account in shared-ui tests.

## Success Criteria

- [x] Tests fail before implementation and pass after helper implementation.
- [x] No DOM or fake backend data needed.
- [x] Helper/composable API is generic over row id access.
- [x] No changes to `Table.vue` in this phase unless unavoidable for type discovery.

## Verification

- Initial test failed because composable did not exist yet.
- After implementation: `pnpm --filter @mf2/shared-ui test -- use-checkbox-row-range-selection` passed.

## Risk Assessment

- Risk: over-designing a generic selection engine.
  - Mitigation: support only checkbox range needs: anchor, focus, action, ids.
- Risk: changing existing selected array semantics.
  - Mitigation: tests preserve in-place/array-compatible behavior expected by `checkedConfig.selected`.
