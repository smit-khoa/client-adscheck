---
phase: 1
title: "Audit Current Panel Two"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Audit Current Panel Two

## Overview

Confirm exactly what must be preserved before editing Panel 2 UI. This phase is read-only except notes in the implementation summary.

## Requirements

- Functional: identify current state, events, runner wiring, and field rendering paths.
- Functional: confirm which styles can change without altering logic.
- Non-functional: do not implement visual changes in this phase.

## Architecture

Current data flow to preserve:

```text
ToolDetailPanel.vue
  -> useToolActions()
  -> selectedFunctions / expandedStepIds / valuesFor(fn)
  -> ToolFunctionForm.vue
  -> runSelectedWorkflow()
  -> runSingleFunction(fn)
  -> TOOL_RUNNERS[fn.id]
  -> runBatch(...)
  -> applyPatches(...)
```

## Related Code Files

- Read: `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- Read: `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue`
- Read: `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts`
- Read: `apps/adaccounts/src/features/adaccounts/tools/data/adaccount-tool-catalog.ts`

## Implementation Steps

1. Re-read `ToolDetailPanel.vue` and mark logic that must remain unchanged.
2. Re-read `ToolFunctionForm.vue` and list field types currently rendered.
3. Decide whether field skin can be a local wrapper style or needs a prop such as `variant="panel-two"`.
4. Confirm no shared-ui component needs changes.

## Success Criteria

- [x] Preserved behavior list is clear before edits.
- [x] Field types and styling hooks are identified.
- [x] Decision made: wrapper style vs form variant prop.
- [x] No code behavior changed in this phase.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Missing a behavior dependency | Trace all state/functions used by template before editing. |
| Over-scoping into shared-ui | Default to app-only styling and reuse existing shared controls. |
