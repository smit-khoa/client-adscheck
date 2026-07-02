---
phase: 3
title: "Implement header drag UX"
status: pending
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: Implement header drag UX

## Overview

Add the visible 6-dot handle, drag ghost, drop indicator, same-zone reorder behavior, and immediate localStorage persistence.

## Requirements

- Functional: show a 6-dot handle in every reorderable header cell.
- Functional: drag only starts from the handle.
- Functional: same-zone drop reorders and persists immediately.
- Functional: cross-zone drop is ignored.
- Functional: dropdown, sorting, resizing, range-select header drag keep working.
- Non-functional: smooth CSS feedback, respects reduced motion, no dependency added.

## Architecture

Template changes:
- Add handle markup to frozen and non-frozen header cells.
- Add `data-column-zone` metadata or equivalent to make target validation cheap.
- Add drag ghost/drop indicator overlay near the existing grid/header context.

Script changes:
- Add pointer handlers with document cleanup in `onUnmounted`.
- Stop propagation on handle pointerdown to avoid range-select/dropdown conflicts.
- Commit reorder on pointerup only if target is valid and field changed.
- Persist after state update.

CSS changes:
- `.column-drag-handle`
- `.column-drag-ghost`
- `.column-drop-indicator`
- dragging/invalid states
- reduced-motion fallback

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Modify: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Add handle UI to both frozen and virtual non-frozen header render paths.
2. Add drag state and pointer lifecycle handlers.
3. Add hit-testing and same-zone target calculation.
4. Add reorder commit for frozen and non-frozen arrays.
5. Add persistence write after successful commit.
6. Add CSS for polished ghost, indicator, cursor, and motion.
7. Keep existing events isolated: resize handle, dropdown trigger, range-select header mousedown.

## Success Criteria

- [ ] Dragging a header handle shows smooth feedback.
- [ ] Non-frozen columns reorder visually and persist after reload.
- [ ] Frozen columns reorder visually and persist after reload.
- [ ] Invalid cross-zone drag does not mutate order or frozen state.
- [ ] Existing resize/dropdown/range-select interactions still work.

## Risk Assessment

- Risk: pointer listeners remain after component unmount.
  - Mitigation: always remove document listeners in commit/cancel and `onUnmounted`.
- Risk: drag handle steals dropdown hover space.
  - Mitigation: keep handle compact and separate from existing menu trigger.
- Risk: CSS transform feedback conflicts with virtual column `transform: translateX(...)`.
  - Mitigation: avoid changing virtual cell transform directly unless carefully composed; use ghost + indicator as primary feedback.
