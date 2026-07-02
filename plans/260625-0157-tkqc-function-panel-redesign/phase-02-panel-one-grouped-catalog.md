---
phase: 2
title: "Panel one grouped catalog"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Panel One Grouped Catalog

## Overview

Replace the TKQC Panel 1 flat draggable switch list with a grouped, selectable function catalog matching the approved visual direction.

Panel 1 should become a pure catalog: search, group expand/collapse, selectable function rows. It should no longer own inline forms or switch-based enable state.

## Requirements

- Functional: render header `Kho chức năng`.
- Functional: render 4 approved groups with expand/collapse.
- Functional: show/hide group functions when the group is expanded/collapsed.
- Functional: selecting a function updates `selectedFunctionId`.
- Functional: selected function row is visually highlighted.
- Functional: remove switch and inline form from TKQC Panel 1.
- Functional: search filters visible functions by label.
- Non-functional: reuse `Icon` from `@mf2/shared-ui/icons` and `Input/Button` from `@mf2/shared-ui/form-controls` where applicable.
- Non-functional: do not hand-roll shared controls that already exist in the catalog.

## Architecture

`ToolPanel.vue` remains the TKQC panel container, but its body should delegate the grouped list to a new component.

```text
TkqcFunctionPanel.vue
  -> ToolPanel.vue
       -> ToolGroupList.vue
            -> selectFunction(id)
```

Panel 1 no longer renders `ToolFunctionForm`. Keep `ToolFunctionForm` available for Phase 3 Panel 2.

Suggested component responsibilities:

- `ToolPanel.vue`: outer layout, selected count context, catalog header/footer area if needed.
- `ToolGroupList.vue`: group open state, search filtering, group rows, function rows.

Avoid making `ToolGroupList` generic for BM/Page in this round. It is TKQC-specific because the approved groups are TKQC product language.

## Related Code Files

- Modify: `apps/adaccounts/src/features/adaccounts/tools/components/ToolPanel.vue`
- Create: `apps/adaccounts/src/features/adaccounts/tools/components/ToolGroupList.vue`
- Modify: `apps/adaccounts/src/features/adaccounts/components/TkqcFunctionPanel.vue` only if props/context wiring changes
- Read: `apps/adaccounts/src/components/tool-actions/ToolList.vue` for patterns, but do not force reuse if it preserves old switch/inline behavior
- Read: `.claude/components-catalog.md` before styling shared controls

## Implementation Steps

1. Create `ToolGroupList.vue` under TKQC tool components.
2. Props/inputs should be explicit:
   - groups from catalog
   - selected function ID
   - select callback or emit `select-function`
3. Add local open-group state; default `Super Share` open if it has functions.
4. Add search input state; filter function rows by `fn.label` and optionally group label.
5. Render group headers as rounded/pill rows similar to screenshot.
6. Render function rows with icon, label, optional muted state for unwired/locked visual if data is available.
7. Remove switch and inline form from TKQC Panel 1.
8. Keep footer minimal or remove old shared `Bắt Đầu` footer from Panel 1 if Panel 2 owns run actions in Phase 3.
9. Ensure clicking a row calls `selectFunction` and does not expand an inline form.
10. Preserve selected-account count display where useful, but do not overload header if it hurts the design.

## Success Criteria

- [x] Panel 1 renders `Kho chức năng`.
- [x] 4 group labels render.
- [x] Group expand/collapse works.
- [x] Search filters functions.
- [x] Function click selects the function.
- [x] Selected row is visible.
- [x] No switch appears in TKQC Panel 1.
- [x] No inline `ToolFunctionForm` appears in TKQC Panel 1.
- [x] Page/BM panels are unchanged.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Old ToolPanel runner code gets deleted before Panel 2 reuses it | Move runner logic carefully or leave a narrow helper for Phase 3. |
| New list component over-generalized | Keep it TKQC-only. Generalize later only if BM/Page redesign is requested. |
| Visual overwork before function | First make selection correct; polish styling after behavior works. |
