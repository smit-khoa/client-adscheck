---
phase: 2
title: "Implement full pane split layout"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Implement Full Pane Split Layout

## Overview

Restructure the internal `Table` render/layout so frozen and scrollable regions are separate panes instead of overlapping sticky cells inside one scroll surface.

## Requirements

- Functional: frozen pane and scrollable pane render side by side.
- Functional: header no longer allows body rows to pass visually underneath it.
- Functional: frozen columns no longer reveal non-frozen columns behind them.
- Functional: standard rows align between frozen and scrollable panes.
- Non-functional: no new dependency, no public API change.

## Architecture

Preferred implementation:

- Keep a table root with fixed header area, scrollable body area, optional footer area.
- Use the same `visibleRows`, `rowPositionsWithSpacing`, `getColumnWidth`, and column computed lists for both panes.
- Frozen pane width derives from checkbox width + `frozenWidth`.
- Scrollable pane owns horizontal scroll.
- Body vertical scroll drives both panes. If native shared scroll is simpler, use one vertical scroll wrapper with separate horizontal pane inside it.
- Header/footer scrollable sections mirror `scrollLeft` from the scrollable body section.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Modify: `packages/shared-ui/src/components/ui/table/style.css`
- Do not modify: `apps/*`

## Implementation Steps

1. Remove or neutralize Hybrid C sticky-surface backgrounds that caused the visual block.
2. Introduce internal pane wrappers for frozen/scrollable header, body, and footer.
3. Move checkbox and frozen column render branches into the frozen pane.
4. Keep non-frozen virtual render branches in the scrollable pane.
5. Wire vertical scroll and horizontal scroll alignment.
6. Preserve basic header dropdown and row rendering where possible.
7. Keep range-select/resize/drag/footer best-effort; document precise regressions if preserving them exceeds visual-first scope.
8. Keep diff minimal relative to the architecture change.

## Success Criteria

- [ ] Frozen pane does not overlap with scrollable pane content.
- [ ] Header/body separation prevents vertical bleed-through.
- [ ] Horizontal scroll only moves non-frozen content.
- [ ] Standard row heights stay aligned.
- [ ] No public API changes.
- [ ] TypeScript remains valid.

## Risk Assessment

Risk: virtualization coordinate assumptions break under split panes.
Mitigation: reuse existing row positioning and column left/width calculations; report range-select coordinate issues if found.
