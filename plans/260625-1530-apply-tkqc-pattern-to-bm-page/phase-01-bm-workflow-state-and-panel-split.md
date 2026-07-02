---
phase: 1
title: "BM Workflow State And Panel Split"
status: pending
priority: P1
dependencies: []
---

# Phase 1: BM Workflow State And Panel Split

## Overview

Apply the TKQC Panel 1 catalog → Panel 2 workflow/detail model to BM while preserving the existing BM runner registry and table selection behavior.

## Requirements

- Functional: BM Panel 1 lets users select BM functions into an ordered workflow.
- Functional: BM Panel 2 renders selected function cards/forms and runs through existing `useBmRunner().run()`.
- Functional: BM tools with `requiresBm: false` still run without selected BM rows.
- Non-functional: no BM API runner rewrite, no table/cache changes, no shared-ui changes.

## Architecture

Current BM state in `use-bm-actions.ts` supports one `expandedId` and one global `formValues` object. This is not enough for selected workflow steps because switching functions overwrites values.

Add the smallest selected workflow model:

```text
selectedFunctionIds: Ref<string[]>
selectedFunctions: ComputedRef<ToolFunction[]>
selectedFunctionId: Ref<string | null>
expandedStepIds: Ref<Set<string> or string[]>
formValuesById: reactive<Record<functionId, values>>
valuesFor(fn): per-function values seeded from fields
selectFunction(id): append/focus/expand
removeSelectedFunction(id): remove from workflow only
reorderSelectedFunctions(nextIds): optional if drag is reused
```

Keep `use-bm-runner.ts` unchanged unless type exposure is needed.

## Related Code Files

- Modify: `apps/adaccounts/src/features/businesses/tools/composables/use-bm-actions.ts`
- Modify: `apps/adaccounts/src/features/businesses/components/BmFunctionPanel.vue`
- Create/Modify: `apps/adaccounts/src/features/businesses/components/BmDetailPanel.vue`
- Create/Modify: `apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue`
- Modify: `apps/adaccounts/src/features/businesses/tools/components/BmActionPanel.vue`
- Reuse: `apps/adaccounts/src/features/businesses/tools/composables/use-bm-runner.ts`
- Reuse: `apps/adaccounts/src/features/businesses/tools/data/bm-tool-functions.ts`

## Implementation Steps

1. Extend `use-bm-actions.ts` with selected workflow state and per-function form values.
2. Preserve existing exports if old BM components still consume them during transition.
3. Adapt BM Panel 1 to catalog-only selection:
   - show BM functions from `BM_TOOL_FUNCTIONS`;
   - clicking a function calls `selectFunction(id)`;
   - do not run directly from Panel 1.
4. Add `BmDetailPanel.vue` wrapper that resolves selected BM ids via existing BM selection composable.
5. Add `BmActionDetailPanel.vue`:
   - render selected workflow steps;
   - render `BmActionForm` for each expanded selected step with `valuesFor(fn)`;
   - keep run controls using `threads`/`delayMs` from `useBmRunner`;
   - run selected functions in order with `run(fn.id, { bmIds, values })`.
6. Keep existing special outputs/dialogs (`BmManagerDialog`, `BmAppealLinkDialog`) wired if currently required by `BmActionPanel`; if too broad, preserve old handling inside BM detail rather than rewriting.
7. Add no new runner behavior.

## Success Criteria

- [ ] BM Panel 1 is catalog/selection focused.
- [ ] BM Panel 2 displays selected BM steps and forms.
- [ ] Switching/adding multiple BM functions does not overwrite another function's form values.
- [ ] BM selected rows still drive tools requiring BM selection.
- [ ] Session-level BM tools still run without selected rows.
- [ ] Existing BM runner registry is preserved.

## Risk Assessment

- Risk: old `BmActionPanel` contains dialogs/special actions not obvious from the state composable.
  - Mitigation: read `BmActionPanel.vue` and `BmActionList.vue` before editing; move behavior surgically.
- Risk: multi-step BM runner execution changes UX.
  - Mitigation: run functions sequentially in selected order and keep existing toasts/summary semantics as much as possible.
- Risk: component size grows too large.
  - Mitigation: split only into BM-local catalog/detail components; do not create generic framework.
