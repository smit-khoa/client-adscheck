---
phase: 3
title: "Restore Frozen Pane Boundary Shadow"
status: completed
priority: P1
dependencies: []
---

# Phase 3: Restore Frozen Pane Boundary Shadow

## Overview

Restore a visible frozen/scroll-pane boundary when horizontally scrolled. The pane-split layout removed the old sticky-overlap shadow assumptions, so the seam should be drawn at the frozen pane edge.

## Requirements

- Functional: when `scrollLeft > 0` and frozen columns exist, a visible seam/shadow appears at the frozen pane right edge.
- Functional: seam is consistent across header, body, and footer when present.
- Non-functional: subtle visual, local CSS, no new prop/API.

## Architecture

Current template still uses `last-frozen-column` / `show-shadow` classes in places, but pane split means the reliable seam is the right edge of:

- `.table-pane-frozen-header`
- `.table-pane-frozen-body`
- `.table-pane-frozen-footer`

Recommended: add a root or pane class tied to existing `isScrollingHorizontally` / `scrollLeft > 0`, then draw a right-edge pseudo-element / border / box-shadow on the frozen panes.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Modify: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Confirm the current `isScrollingHorizontally` value tracks `scrollLeft > 0` under pane split.
2. Add a root class on `.table-pane-root` such as `is-scrolling-x` only when horizontal scroll is active.
3. Add CSS seam rules for frozen header/body/footer edge under that class.
4. Prefer a subtle combination: 1px border plus small right-side shadow.
5. Ensure seam does not block pointer events.
6. Browser tune color/opacity against the current pale table/workspace surface.

## Success Criteria

- [ ] No seam/shadow at rest if `scrollLeft === 0` and product expects no hidden content indicator.
- [ ] Seam/shadow appears once user scrolls horizontally.
- [ ] Header/body/footer seam aligns vertically at frozen pane edge.
- [ ] Shadow does not cover text or intercept clicks.
- [ ] Existing row borders and header separators remain readable.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Existing `show-shadow` conflicts with new pane seam | Prefer pane-root scoped rule; remove/neutralize only if directly conflicting. |
| Shadow looks heavy on light green background | Tune in browser; keep CSS local and easy to adjust. |
| Footer absent in many tables | Rule should be harmless when footer is not rendered. |
