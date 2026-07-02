---
phase: 1
title: "Range selection color + range-actions toolbar restyle"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Selection color + toolbar restyle

## Overview
CSS-only change. Recolor the range-selection highlight to solid `#E5F0EB` and restyle
the floating range-actions toolbar (white background, dark-gray icons) to match the mockup.

## Requirements
- Functional: range cells solid `#E5F0EB`; selected column headers lighter + black text; toolbar white with dark icons.
- Non-functional: no behavior change; keep frozen-pane coordinate fix from related plan intact.

## Architecture
All edits in `packages/shared-ui/src/components/ui/table/style.css`. The range highlight is
painted onto the real cell `background` with `!important` (overrides inline stripe/frozen bg).
Current rules use `color-mix(--primary …, --background)`; replace with fixed hex.

## Related Code Files
- Modify: `packages/shared-ui/src/components/ui/table/style.css` (lines ~1142-1191)

## Implementation Steps
1. `.row-cell.range-cell` → `background: #E5F0EB !important;`
2. `.row-cell.range-cell.range-cell--primary` → `background: #E5F0EB !important;` (flat, same as base).
3. `.header-cell.range-col` → `background: #F0F7F3 !important; color: #000;` (lighter than body, black text).
4. `.header-cell.range-col.range-col--primary` → same as range-col (black text, lighter tint).
5. `.range-actions` → `background: #fff;` keep border-radius + soft shadow; soften/remove border (e.g. `border: none` or `1px solid #eee`).
6. `.range-actions__btn` → `color: #374151;` (dark gray) instead of `var(--primary)`.
7. `.range-actions__btn:hover` → `background: #f3f4f6;` (light gray) instead of primary mix.

## Success Criteria
- [ ] Selecting a range paints cells solid `#E5F0EB`; unselected cells stay transparent.
- [ ] Selected column header lighter than body cells, text is black.
- [ ] Toolbar renders white with dark-gray copy + gear icons; hover shows light-gray.
- [ ] No regression to range-actions positioning (frozen/scroll panes).

## Risk Assessment
- Risk: hardcoded hex bypasses theme tokens → acceptable per user (fixed values).
- Risk: header hex `#F0F7F3` / hover `#f3f4f6` are proposed; adjust at review if off-mock.
