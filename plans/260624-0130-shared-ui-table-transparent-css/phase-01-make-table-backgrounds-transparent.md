---
phase: 1
title: "Make Table backgrounds transparent"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Make Table backgrounds transparent

## Overview

Change shared-ui data-grid default background painting to transparent while preserving table mechanics and intentional highlight states.

## Requirements

- Functional: Table container, header, row, cell, frozen, empty-space, and stripe backgrounds should no longer create opaque dark areas.
- Functional: selected rows/cells, range highlight, and explicit cell color highlights remain visible.
- Non-functional: no public API change; small CSS/inline-style diff only.

## Architecture

The visual background comes from two layers:

1. CSS in `packages/shared-ui/src/components/ui/table/style.css` sets defaults such as `var(--background)` and `var(--muted)`.
2. `Table.vue` applies inline `background: getCellBackground(...)` on body cells and empty-space cells, so CSS alone is insufficient.

Implementation should update both layers. `getCellBackground` should return `transparent` for normal/stripe/frozen default cases, while keeping intentional color features if present.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/style.css`
- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`

## Implementation Steps

1. In `style.css`, replace default table surface backgrounds with `transparent` for container/header/body/stripe classes.
2. In `Table.vue`, inspect `getCellBackground` and adjust default branches to return `transparent` for normal/frozen/stripe/empty-space backgrounds.
3. Ensure selected/range/color-highlight overrides still win.
4. Search for remaining table-level `var(--background)` / `var(--muted)` backgrounds that create opaque table surfaces; keep non-table UI controls alone unless they visibly paint the grid surface.

## Success Criteria

- [x] CSS no longer paints default table surfaces with opaque background tokens.
- [x] Inline cell background defaults resolve to `transparent`.
- [x] Selected/range/color-highlight states remain intentionally colored.
- [x] No prop/event/type contract changes.

## Risk Assessment

- Risk: over-changing controls/sidebar/dialog styles. Mitigation: limit edits to grid surface selectors and `getCellBackground` defaults.
- Risk: selected/range highlight becomes invisible. Mitigation: do not remove selected/range classes or `!important` highlight rules.
