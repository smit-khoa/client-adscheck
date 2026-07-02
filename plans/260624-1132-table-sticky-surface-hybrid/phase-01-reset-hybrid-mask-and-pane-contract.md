---
phase: 1
title: "Reset hybrid mask and pane contract"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Reset Hybrid Mask and Pane Contract

## Overview

Remove the failed alpha sticky-surface assumption and define the full pane split contract before editing the render structure.

## Requirements

- Functional: identify hybrid-mask changes to remove or neutralize.
- Functional: define pane boundaries for header/body/footer and frozen/scrollable regions.
- Non-functional: no public API changes.
- Non-functional: no app-level changes.

## Architecture

Target architecture:

- Frozen pane renders checkbox + frozen columns in its own left layer.
- Scrollable pane renders non-frozen columns in its own horizontally scrollable layer.
- Header/body/footer are separated enough that body cells never pass under visible header/frozen content.
- Vertical scroll position is shared by body panes.
- Horizontal scroll applies only to the scrollable pane; header/footer alignment follows that scroll state.

## Related Code Files

- Read/modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read/modify: `packages/shared-ui/src/components/ui/table/style.css`
- Read: `.claude/features/shared-ui-data-grid-table.md`

## Implementation Steps

1. Locate current Hybrid C additions: `--table-sticky-surface`, sticky backgrounds, `getCellBackground` frozen fallback.
2. Decide which mask rules must be removed versus kept as harmless fallback.
3. Map existing render branches for header, body, footer, checkbox, frozen columns, non-frozen virtual columns.
4. Define minimal pane DOM structure that reuses current computed state.
5. Confirm scope of interactions likely to be best-effort: range-select, header drag-reorder, resize, footer sum.

## Success Criteria

- [ ] Hybrid mask cleanup points are listed.
- [ ] Pane boundaries are clear before code.
- [ ] Public API remains stable.
- [ ] No app-level file is required for planned implementation.

## Risk Assessment

Risk: accidental large rewrite of table internals.
Mitigation: reuse existing computed data and render branches; avoid changing props/events/types.
