---
phase: 2
title: "Step Path Frame Component"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Step Path Frame Component

## Overview

Create an app-local `ToolStepFrame.vue` component that owns the responsive white path-card shell, drag handle, step pill, function title, remove button, and content slot.

## Requirements

- Functional: render function icon/title and `Bước N` pill.
- Functional: emit `toggle` when the title/pill toggles expanded state.
- Functional: emit `remove` when `X` is clicked; remove click must not toggle the step.
- Functional: expose a drag handle class for `vuedraggable`.
- Non-functional: app-only component, no shared-ui changes.
- Non-functional: responsive path/notch, not fixed pixel-perfect.

## Architecture

```text
ToolStepFrame.vue
  props: fn, stepNumber, expanded, runnable
  emits: toggle, remove
  slot: expanded body content
  uses: Icon from @mf2/shared-ui/icons
```

Visual layout:

```text
[white SVG path background]
  [drag 6 dots] [function icon] [title]
                       [green Bước N pill] [X]
  [divider]
  [slot form body]
```

The SVG path can mirror the idea from `WorkspacePathFrame.vue`: `preserveAspectRatio="none"`, path string computed from fixed viewBox proportions, scaled to the card width.

## Related Code Files

- Create: `apps/adaccounts/src/features/adaccounts/tools/components/ToolStepFrame.vue`

## Implementation Steps

1. Create `ToolStepFrame.vue` with typed props/emits.
2. Import `Icon` from `@mf2/shared-ui/icons`.
3. Render absolute SVG white background path with a right/top notch around the step pill area.
4. Add drag handle element with class `tool-step-drag-handle` and `cursor-grab` styling.
5. Add title toggle button or title row that emits `toggle`.
6. Add green pill showing `Bước {{ stepNumber }}` and chevron up/down.
7. Add `X` button with `@click.stop` and `aria-label`.
8. Add slot below divider for form/warning body.
9. Keep all styles scoped through utility classes; no global CSS.

## Success Criteria

- [x] New component renders without owning workflow state.
- [x] Drag handle is a sibling, not nested inside a toggle button.
- [x] Remove button uses `@click.stop`.
- [x] Card path visually follows the screenshot direction.
- [x] Component works for expanded and collapsed states.
- [x] Component uses shared-ui Icon, not lucide/native SVG imports.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Path shape too brittle | Use conservative SVG proportions and CSS rounded fallback via white surface |
| Card consumes too much vertical space | Keep header compact and slot spacing close to current Panel 2 form skin |
| Accessibility unclear | Add `aria-label` for drag/remove/toggle controls |
