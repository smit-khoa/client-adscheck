---
phase: 2
title: "Redesign Step Frame and Field Skin"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Redesign Step Frame and Field Skin

## Overview

Apply the approved responsive Figma-inspired Panel 2 visual redesign while keeping multi-step workflow and runner behavior unchanged.

## Requirements

- Functional: keep `selectedFunctions` multi-step rendering.
- Functional: keep expand/collapse through `expandedStepIds` and `toggleStepExpanded`.
- Functional: keep dynamic fields from `ToolFunctionForm` and `fn.fields`.
- Functional: keep run footer behavior unchanged.
- Non-functional: app-only changes; no `packages/shared-ui` edits.
- Non-functional: responsive Figma spirit, not fixed 268px pixel-perfect.

## Architecture

Preferred implementation:

```text
ToolDetailPanel.vue
  # shell/header/footer existing logic unchanged
  # step card markup restyled
  # maybe wraps ToolFunctionForm in a panel-two form container

ToolFunctionForm.vue
  # keep renderer logic
  # add minimal variant/class support only if wrapper styling is insufficient
```

If `ToolDetailPanel.vue` becomes too large or repetitive, create:

- `apps/adaccounts/src/features/adaccounts/tools/components/ToolStepFrame.vue`

Only create this if it reduces complexity. Do not create it speculatively.

## Related Code Files

- Modify: `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- Modify: `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue`
- Optional create: `apps/adaccounts/src/features/adaccounts/tools/components/ToolStepFrame.vue`

## Implementation Steps

1. Update Panel 2 header spacing/actions to match the approved visual direction.
2. Restyle selected step cards:
   - compact rounded card;
   - function row with icon/title;
   - `Bước N` pill and chevron;
   - subtle divider when expanded.
3. Restyle delay chip between steps with softer Figma-like surface.
4. Restyle form fields:
   - small muted label;
   - pill/soft input surface;
   - select/input/textarea consistent spacing;
   - switch row remains compact;
   - file field keeps truthful native limitation.
5. Preserve warning block for missing runner.
6. Preserve footer controls and run button behavior; only visual changes allowed.
7. If needed, extract `ToolStepFrame.vue` and keep ownership inside `apps/adaccounts`.

## Success Criteria

- [x] Multiple selected functions still render as multiple steps.
- [x] Step expand/collapse still works.
- [x] Field values persist per function as before.
- [x] Different functions still render different fields.
- [x] Run button still uses existing `runSelectedWorkflow` path.
- [x] No shared-ui package changed.
- [x] UI matches Figma spirit: soft rounded panel/card, step pill, divider, compact field stack.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Styling leaks to other uses of `ToolFunctionForm` | Prefer wrapper scoped styles or explicit variant. |
| Runner logic changes accidentally | Avoid editing script logic unless needed for class/prop plumbing. |
| New component overkill | Extract only if actual LOC/readability problem appears. |
