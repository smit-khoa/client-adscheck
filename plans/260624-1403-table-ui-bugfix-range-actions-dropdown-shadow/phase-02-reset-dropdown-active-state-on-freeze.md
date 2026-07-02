---
phase: 2
title: "Reset Dropdown Active State on Freeze Actions"
status: completed
priority: P1
dependencies: []
---

# Phase 2: Reset Dropdown Active State on Freeze Actions

## Overview

Fix the header 3-dot trigger staying visually active after freeze/unfreeze closes the dropdown.

## Requirements

- Functional: after choosing freeze/unfreeze, dropdown closes and active trigger styling clears.
- Functional: behavior works for both frozen and non-frozen header panes.
- Non-functional: keep change minimal; do not alter shared `DropdownMenu` component globally.

## Architecture

`Table.vue` tracks active header option locally with `colOpenOption`. Freeze/unfreeze changes column state and can move the column between pane branches, so relying only on `DropdownMenu @update:open` can leave the old field active after menu close/unmount.

Fix local state at the action source: clear `colOpenOption` when a freeze action starts or finishes.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`

## Implementation Steps

1. Locate `colOpenOption` and `toggleFreeze(field)`.
2. Clear `colOpenOption.value` inside `toggleFreeze(field)` before or immediately after mutation.
3. Avoid changing global dropdown primitives.
4. Avoid adding new abstraction unless another handler needs the same logic.
5. Browser verify freeze and unfreeze from both pane branches.

## Success Criteria

- [ ] Click "Đóng băng cột này" → menu closes and 3-dot icon loses active background.
- [ ] Click "Bỏ đóng băng cột" → menu closes and 3-dot icon loses active background.
- [ ] Header dropdown still opens normally afterward.
- [ ] No visual behavior change for unrelated dropdowns.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Reka open timing fires after local clear | Local clear is harmless; if timing reopens state, also clear via selected item handler path. |
| Sort dropdown path has same stale active issue | Only expand to sort handlers if reproduced; do not speculate. |
