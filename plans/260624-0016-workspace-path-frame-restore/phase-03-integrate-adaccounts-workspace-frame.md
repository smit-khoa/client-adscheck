---
phase: 3
title: "Integrate adaccounts workspace frame"
status: completed
priority: P1
dependencies: [2]
---

# Phase 3: Integrate Adaccounts Workspace Frame

## Overview

Update the adaccounts workspace frame adapter to render existing tab table/tool slots inside the new shared-ui `WorkspacePathFrame`. This phase touches app code only and must preserve current domain logic.

## Requirements

- Functional: `/app/adaccounts` uses the SVG path frame for its tab workspace.
- Functional: active tab still controls table and Function panel 1 content through existing slots.
- Functional: toolbar remains visible and override-ready.
- Functional: panel 1/2 open state is present without removing existing panel slots.
- Non-functional: no domain API/composable/store changes.
- Non-functional: no shared-ui changes in the app integration commit after Phase 2 is complete.

## Architecture

Current flow stays intact:

```text
AdAccountsPage.vue
  -> AdAccountsWorkspace.vue
      -> WorkspaceTabFrame.vue
          -> WorkspacePathFrame
              -> main slot: Tkqc/Bm/Page/Pixel table views
              -> panel-one slot: Tkqc/Bm/Page/Pixel function panels
              -> panel-two slot: placeholder
```

`WorkspaceTabFrame.vue` owns adapter-level UI state such as panel open refs. `AdAccountsWorkspace.vue` continues to own tab-to-domain component selection.

## Related Code Files

- Modify: `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
- Modify only if needed: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify only if needed: `apps/adaccounts/src/features/workspace/types/workspace.types.ts`
- Read: `apps/adaccounts/src/features/adaccounts/components/TkqcTableView.vue`
- Read: `apps/adaccounts/src/features/businesses/components/BmTableView.vue`
- Read: `apps/adaccounts/src/features/page/components/PageTableView.vue`
- Read: `apps/adaccounts/src/features/pixel/components/PixelTableView.vue`

## Implementation Steps

1. Import `WorkspacePathFrame` via the new narrow shared-ui entrypoint.
2. Keep the `Tabs v-model="tabModel"` owner in `WorkspaceTabFrame.vue` unless the shared component contract proves a cleaner equivalent.
3. Move the current header/tab trigger markup into the frame's `tabs` slot.
4. Ensure each `TabsTrigger` includes `:data-tab-value="tab.value"` for path measurement.
5. Move current main slot into the frame's `main` slot without changing slot props.
6. Move Function panel 1 slot into the frame's `panel-one` slot.
7. Keep Function panel 2 placeholder in the frame's `panel-two` slot.
8. Add panel open state refs in the adapter if the shared frame uses controlled props.
9. Remove duplicated path/section styling from `WorkspaceTabFrame.vue` that is now owned by `WorkspacePathFrame`.
10. Run:
    ```bash
    pnpm --filter @mf2/adaccounts typecheck
    pnpm --filter @mf2/adaccounts build
    pnpm verify:features
    ```

## Success Criteria

- [x] `/app/adaccounts` frame uses `WorkspacePathFrame`.
- [x] Existing `WorkspaceTabFrame.vue` props/emits remain compatible with `AdAccountsWorkspace.vue`.
- [x] TKQC/BM/Page/Pixel table selection by tab still works.
- [x] Function panel 1 selection by tab still works.
- [x] Function panel 2 remains placeholder unless hidden by panel state.
- [x] No domain data loading/tool runner files are changed.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes or reports only known warnings.
- [x] `pnpm verify:features` passes after docs are updated in Phase 4.

## Phase 3 Notes

- `WorkspaceTabFrame.vue` now imports `WorkspacePathFrame` from `@mf2/shared-ui/workspace-path-frame`.
- `Tabs v-model="tabModel"` remains in the adaccounts adapter, preserving `update:activeTab` ownership.
- Tab triggers now include `data-tab-value` and the list includes `data-tabs-list` for SVG measurement.
- Existing slot contract is preserved:
  - `main` receives `{ activeTab, activeTabMeta }`.
  - `function-panel-one` receives `{ activeTab, activeTabMeta }`.
- Function panel 2 remains the existing placeholder through the shared frame `panel-two` slot.
- Panel open refs are adapter-local and default to open.
- No domain API/composable/store/tool runner files were changed.

### Verification

- `pnpm --filter @mf2/adaccounts typecheck` — PASS.
- `pnpm --filter @mf2/adaccounts build` — PASS with known non-blocking warnings:
  - Module Federation `publicPath='auto'` manifest warning.
  - CSS order warnings involving `vue-sonner`, dialog CSS, and table CSS.
  - Asset size warning for `500.74c7ce33.js` and `74.8aec427f.js`.
- `pnpm verify:features` — PASS after Phase 4 docs update.

