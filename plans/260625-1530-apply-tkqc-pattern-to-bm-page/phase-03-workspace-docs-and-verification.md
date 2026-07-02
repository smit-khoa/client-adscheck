---
phase: 3
title: "Workspace Docs And Verification"
status: pending
priority: P1
dependencies: [1, 2]
---

# Phase 3: Workspace Docs And Verification

## Overview

Wire BM/Page detail panels into the workspace Panel 2 slot, update required feature docs, and run focused verification.

## Requirements

- Functional: `AdAccountsWorkspace.vue` renders tab-specific Panel 2 content for TKQC, BM, Page, and Pixel placeholder.
- Functional: Workspace tab switching keeps current main-table and Panel 1 behavior.
- Non-functional: feature docs match changed code paths and flow.

## Architecture

`WorkspaceTabFrame.vue` already exposes a caller-provided `panel-two` slot. Keep that contract and update only `AdAccountsWorkspace.vue` wiring:

```vue
<TkqcDetailPanel v-if="currentTab === 'adaccounts'" />
<BmDetailPanel v-else-if="currentTab === 'businesses'" />
<PageDetailPanel v-else-if="currentTab === 'page'" />
<FunctionPanelSlot v-else ... />
```

## Related Code Files

- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `apps/adaccounts/src/features/businesses/index.ts`
- Modify: `apps/adaccounts/src/features/page/index.ts`
- Modify: `.claude/features/adaccounts-bm-tab.md`
- Modify: `.claude/features/adaccounts-page-tab.md`
- Modify: `.claude/features/adaccounts-workspace-tabs.md`
- Modify if contract changes: `.claude/features/adaccounts-tool-actions.md`
- Maybe modify: `docs/adaccounts-feature-architecture.md` if it describes BM/Page panel behavior

## Implementation Steps

1. Export `BmDetailPanel` from `features/businesses/index.ts`.
2. Export `PageDetailPanel` from `features/page/index.ts`.
3. Update `AdAccountsWorkspace.vue` imports and `#panel-two` branch.
4. Keep Pixel fallback unchanged.
5. Update BM/Page/workspace feature docs:
   - flow now says Panel 1 catalog + Panel 2 detail workflow;
   - list new/modified files;
   - state section documents selected workflow state;
   - verification section updates manual smoke.
6. Update `adaccounts-tool-actions.md` only if shared `createToolActions` or `ToolFunctionForm` behavior changed for Page/BM reuse.
7. Run focused verification.

## Success Criteria

- [ ] Workspace Panel 2 maps TKQC/BM/Page/Pixel correctly.
- [ ] BM and Page exports compile.
- [ ] Feature docs contain real changed file paths.
- [ ] `pnpm --filter @mf2/adaccounts typecheck` passes or failure is reported.
- [ ] `pnpm verify:features` passes or failure is reported.
- [ ] Optional build/verify:all run when touched boundaries justify it.

## Risk Assessment

- Risk: feature doc verifier fails on missing paths.
  - Mitigation: update docs only after files exist; use real paths.
- Risk: imports create circular dependency through feature barrels.
  - Mitigation: follow existing workspace import style; if circular issue appears, import direct component paths.
- Risk: shared/app PR split already dirty from prior work.
  - Mitigation: do not add any new `packages/shared-*` changes in this task.
