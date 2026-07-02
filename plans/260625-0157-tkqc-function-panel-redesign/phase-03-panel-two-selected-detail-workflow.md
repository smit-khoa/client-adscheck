---
phase: 3
title: "Panel two selected detail workflow"
status: completed
priority: P1
dependencies: [1, 2]
---

# Phase 3: Panel Two Selected Detail Workflow

## Overview

Wire Panel 2 for TKQC so it shows the selected function detail, schema-driven form, step UI, delay, and footer actions.

This phase moves configuration from inline Panel 1 expansion into Panel 2 while keeping runner behavior truthful and scoped to the selected function.

## Requirements

- Functional: TKQC Panel 2 renders selected function detail instead of placeholder.
- Functional: no selected function -> clear empty state or auto-select first function.
- Functional: selected function fields render using existing schema-driven form behavior.
- Functional: delay/runner settings render in Panel 2.
- Functional: run button executes selected function over selected TKQC accounts when runner exists.
- Functional: unwired tool shows disabled/warning behavior, not fake success.
- Functional: `Lưu Template` appears but is disabled/no-op with honest copy unless template persistence is scoped later.
- Non-functional: no full workflow engine, no per-step persistence, no new API runners.
- Non-functional: keep all Facebook calls through existing runner registry and extension API layer.

## Architecture

Panel 2 needs to be caller-provided by `AdAccountsWorkspace.vue`, because `WorkspaceTabFrame.vue` currently renders a hardcoded placeholder fallback.

Target flow:

```text
AdAccountsWorkspace.vue
  -> WorkspaceTabFrame.vue
       #function-panel-one -> TkqcFunctionPanel / ToolPanel / ToolGroupList
       #panel-two or #function-panel-two -> ToolDetailPanel

ToolDetailPanel.vue
  -> selectedFunction
  -> valuesFor(selectedFunction)
  -> ToolFunctionForm or extracted form renderer
  -> run selected function through TOOL_RUNNERS[id]
```

Implementation detail decision:

- Prefer making `WorkspaceTabFrame.vue` accept a real `panel-two` slot with fallback placeholder.
- Keep placeholder fallback for BM/Page/Pixel if no slot content is provided.
- Avoid changing `packages/shared-ui` because `WorkspacePathFrame` already supports `#panel-two`.

Runner behavior:

- Use `TOOL_RUNNERS[selectedFunction.id]`.
- Use selected accounts resolved by `TkqcFunctionPanel`/`ToolPanel` path.
- Preserve current toast mapping and patch application if a runner returns patches.
- If runner missing, show current warning copy and do not report success.

## Related Code Files

- Modify: `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `apps/adaccounts/src/features/adaccounts/components/TkqcFunctionPanel.vue`
- Modify: `apps/adaccounts/src/features/adaccounts/tools/components/ToolPanel.vue`
- Create: `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- Modify or reuse: `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue`
- Read: `apps/adaccounts/src/api/tools/index.ts`
- Read: `apps/adaccounts/src/api/run-batch.ts`

## Implementation Steps

1. Update `WorkspaceTabFrame.vue` to expose/use a caller-provided panel 2 slot while retaining its current placeholder fallback.
2. Update `AdAccountsWorkspace.vue` to provide TKQC-specific Panel 2 content only when active tab is `adaccounts`.
3. Create `ToolDetailPanel.vue`.
4. Pass into `ToolDetailPanel`:
   - selected function
   - selected accounts or selected count
   - `valuesFor`
   - runner settings
   - run handler or enough inputs to run selected function
5. Render header:
   - workflow title
   - selected function name
   - step count copy, likely `1 bước`
6. Render selected function form via existing schema-driven form renderer.
7. Render delay row/chip using current `useToolRunnerSettings` data.
8. Add footer actions:
   - `Lưu Template` disabled or no-op with truthful tooltip/copy
   - `Chạy 1 bước/N tài khoản`
9. Implement run behavior for selected function:
   - no selected accounts -> warn
   - no runner -> warn/disabled
   - runner exists -> call existing `runBatch`
   - apply patches as current ToolPanel does
   - show success/error toasts as current behavior does
10. Keep Panel 1 run footer removed or inert so there is one clear run location.

## Success Criteria

- [x] TKQC Panel 2 no longer shows generic placeholder when TKQC is active.
- [x] Panel 2 updates when a function is selected in Panel 1.
- [x] Panel 2 renders selected function fields.
- [x] Panel 2 shows step/delay/footer UI.
- [x] `Lưu Template` is honest about not being implemented if kept visible.
- [x] Run button targets selected function only.
- [x] Existing wired runner behavior remains truthful, including patch application.
- [x] Unwired tools warn/disable truthfully.
- [x] BM/Page/Pixel still get existing placeholder or existing behavior.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Panel 2 slot wiring breaks all tabs | Keep fallback placeholder and only special-case TKQC content. |
| Duplicated runner logic from old ToolPanel | Extract a small local helper only if needed; otherwise move existing code carefully. |
| `ToolFunctionForm` assumes inline card styling | Add props/classes minimally or wrap it in Panel 2 styling. Do not duplicate schema renderer. |
| Template button misleads users | Disable it or show clear "chưa hỗ trợ" copy. |
