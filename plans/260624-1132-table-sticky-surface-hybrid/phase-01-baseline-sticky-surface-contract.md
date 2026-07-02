---
phase: 1
title: "Baseline sticky surface contract"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Baseline Sticky Surface Contract

## Overview

Confirm the exact sticky zones, background override paths, and visual contract before editing code. This phase prevents accidental refactor of the complex table internals.

## Requirements

- Functional: identify which header/body/footer sticky cells need the new surface.
- Functional: identify which explicit highlights must keep priority.
- Non-functional: no code changes in this phase.
- Non-functional: keep final implementation scoped to shared-ui table unless evidence requires otherwise.

## Architecture

Current architecture stays unchanged:

- `dataGridMain` remains the main native scroll container.
- Header remains inside the scroll container with `position: sticky; top: 0`.
- Frozen body/footer/header cells remain native sticky with computed `left` values.
- The fix adds a visual sticky surface, not a separate scroll-synced pane.

## Related Code Files

- Read: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read: `packages/shared-ui/src/components/ui/table/style.css`
- Read: `.claude/features/shared-ui-data-grid-table.md`
- Read: `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue`

## Implementation Steps

1. Re-check current sticky/background rules around `.header-row`, `.header-cell`, `.row-cell.frozen-column`, `.footer-cell.frozen-column`, and `.last-frozen-column`.
2. Confirm every inline `background: getCellBackground(...)` on frozen/header/body cells.
3. Decide whether CSS pseudo-element surface can avoid changing `getCellBackground`.
4. Define CSS token names and fallback values for sticky surface.
5. Record exact verification surfaces for Phase 3.

## Success Criteria

- [x] Sticky zones are listed clearly.
- [x] Background priority rules are understood.
- [x] Implementation approach is CSS-first unless inline styles force a minimal Vue change.
- [x] No app-level file is required for the planned fix.

## Risk Assessment

Risk: assuming CSS can override inline backgrounds.
Mitigation: explicitly inspect inline styles before Phase 2; use pseudo-elements or minimal Vue change if needed.
