---
phase: 2
title: "Page Catalog And Detail Workflow"
status: pending
priority: P1
dependencies: []
---

# Phase 2: Page Catalog And Detail Workflow

## Overview

Apply the TKQC-style catalog/detail workflow to Page tools while keeping Page tools UI-only and truthful about missing API runners.

## Requirements

- Functional: Page Panel 1 selects Page functions into an ordered workflow.
- Functional: Page Panel 2 renders selected Page steps/forms.
- Functional: Page run action warns that Page tools are not wired to API yet.
- Non-functional: no new Page API runner, no table/cache changes, no shared-ui changes.

## Architecture

Page already uses `createToolActions` through `use-page-tool-actions.ts`, so selected workflow state should be reused instead of rebuilt.

```text
usePageToolActions()
  -> selectedFunctionIds / selectedFunctions / valuesFor / expandedStepIds

PageFunctionPanel.vue
  -> Panel 1 catalog selection

PageDetailPanel.vue
  -> selected Page rows + PageToolDetailPanel

PageToolDetailPanel.vue
  -> selected steps/forms + truthful UI-only run warning
```

## Related Code Files

- Modify: `apps/adaccounts/src/features/page/components/PageFunctionPanel.vue`
- Create/Modify: `apps/adaccounts/src/features/page/components/PageDetailPanel.vue`
- Modify/Create: `apps/adaccounts/src/features/page/tools/components/PageToolPanel.vue`
- Create: `apps/adaccounts/src/features/page/tools/components/PageToolDetailPanel.vue`
- Reuse: `apps/adaccounts/src/features/page/tools/composables/use-page-tool-actions.ts`
- Reuse: `apps/adaccounts/src/features/page/tools/data/page-tool-catalog.ts`
- Reuse: `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue`

## Implementation Steps

1. Read current `PageToolPanel.vue` before editing to preserve existing warnings and selection copy.
2. Adapt Page Panel 1 to catalog-only selection using `usePageToolActions().selectFunction`.
3. Add `PageDetailPanel.vue` wrapper that resolves selected Page ids through existing Page selection composable/store.
4. Add `PageToolDetailPanel.vue`:
   - render selected Page functions as ordered steps;
   - render `ToolFunctionForm` for each expanded step;
   - keep fields schema-driven from `PAGE_TOOL_FUNCTIONS`;
   - run button displays warning/toast that Page tools are not wired.
5. If reusing TKQC `ToolStepFrame` is app-local and import-safe, reuse it; otherwise copy minimal Page-local step shell to avoid broad refactor.
6. Do not add API files or runner registry for Page.

## Success Criteria

- [ ] Page Panel 1 shows Page functions as catalog selection.
- [ ] Page Panel 2 shows selected Page steps/forms.
- [ ] Page run action remains UI-only warning.
- [ ] Page table loading and selection behavior are unchanged.
- [ ] Page tool form fields still come from `PAGE_TOOL_FUNCTIONS`.

## Risk Assessment

- Risk: UI makes Page automation appear real.
  - Mitigation: footer/run copy and toast must explicitly say tools are not wired yet.
- Risk: reusable TKQC components are too adaccount-specific.
  - Mitigation: reuse only if props are already generic; otherwise create Page-local minimal component.
- Risk: Page file fields imply real file upload runner support.
  - Mitigation: keep existing ToolFunctionForm behavior; do not claim file runner support.
