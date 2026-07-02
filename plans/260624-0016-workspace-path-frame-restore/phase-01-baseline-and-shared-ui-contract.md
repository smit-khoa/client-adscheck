---
phase: 1
title: "Baseline and shared-ui contract"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Baseline and Shared-ui Contract

## Overview

Capture current compile/build state and define the `WorkspacePathFrame` contract before touching shared-ui. This phase prevents blindly copying shell placeholder state into the reusable component.

## Requirements

- Functional: identify exactly which shell path-frame behavior must be ported.
- Functional: define a generic component API that accepts slots/props and does not know adaccounts domain labels.
- Non-functional: no source code behavior changes in this phase.
- Non-functional: keep shared/app split explicit for later commits.

## Architecture

The reusable shared component will own only frame presentation:

```text
WorkspacePathFrame
  props: activeTab, firstTabValue, panel open state, aria labels
  emits: update panel open state
  slots: tabs, toolbar, main, panel-one, panel-two
```

`WorkspaceTabFrame.vue` remains the app adapter that owns `Tabs` model/emit and passes slotted content into the frame.

## Related Code Files

- Read: `apps/shell/src/components/WorkspaceContent.vue`
- Read: `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
- Read: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Read: `packages/shared-ui/package.json`
- Read: `packages/shared-ui/src/index.ts`
- Read: `packages/shared-ui/src/components/ui/resizable/index.ts`
- Modify: none expected in this phase, except optional notes inside plan validation logs if used

## Implementation Steps

1. Re-read the current shell path prototype and list behavior to port:
   - SVG path generation.
   - active tab measurement by `data-tab-value`.
   - `ResizeObserver` resize handling.
   - toolbar visual slot/default.
   - panel 1/2 conditional rendering.
2. Re-read current adaccounts workspace frame and confirm slot names/public props that must stay stable.
3. Run baseline checks:
   ```bash
   pnpm --filter @mf2/shared-ui typecheck
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   ```
4. Record whether failures are pre-existing before moving forward.
5. Finalize the shared component API in implementation notes before Phase 2.

## Success Criteria

- [x] Current path behavior to port is explicitly identified.
- [x] Component API is generic and does not contain adaccounts-specific labels.
- [x] `WorkspaceTabFrame.vue` slot/prop compatibility requirements are known.
- [x] Baseline typecheck/build results are recorded.
- [x] No app/shared source behavior changed in this phase.

## Phase 1 Notes

### Path behavior to port from `WorkspaceContent.vue`

- SVG frame is driven by a single full-size `<path>` behind the first resizable panel.
- `tabContentPath` depends on measured frame width/height, active tab left/right bounds, and tab rail end.
- Active tab is located by `data-tab-value="${activeTab}"` inside `[data-tabs-list]`.
- `ResizeObserver` observes the shape container and schedules measurement with `nextTick`; active tab changes also reschedule measurement.
- First active tab has a boundary-specific path branch that connects directly into the left content edge.
- Toolbar is visually part of the frame header but should be a slot/default, not domain-owned shared state.
- Function panel 1 and Function panel 2 are conditionally renderable via panel open state; each panel is separate from the main path frame.

### Shared component API contract for Phase 2

`WorkspacePathFrame` should be generic and own only frame presentation:

- Props:
  - `activeTab: string` — current tab value used only for SVG measurement.
  - `firstTabValue?: string` — identifies the left-boundary tab branch; default can be inferred by adapter if passed.
  - `panelOneOpen?: boolean` and `panelTwoOpen?: boolean` — conditional panel rendering, default `true`.
  - Optional panel sizing props only if needed by current behavior; avoid app-specific labels.
  - Optional `panelOneAriaLabel` / `panelTwoAriaLabel` for accessible panel labels.
- Emits:
  - `update:panelOneOpen` and `update:panelTwoOpen` only if the frame adds close/reopen controls later. Phase 2 can omit emit usage if no controls exist.
- Slots:
  - `tabs` — caller renders `TabsList` / `TabsTrigger`; triggers must expose `data-tab-value` matching `activeTab`.
  - `toolbar` — caller/default renders header actions.
  - `main` — caller renders `TabsContent` / table area.
  - `panel-one` and `panel-two` — caller renders right panels.

### `WorkspaceTabFrame.vue` compatibility requirements

- Keep public props: `tabs`, `activeTab`, `activeTabMeta`.
- Keep public emit: `update:activeTab`.
- Keep scoped slots and slot props:
  - `main` receives `{ activeTab, activeTabMeta }`.
  - `function-panel-one` receives `{ activeTab, activeTabMeta }`.
- Keep `tabModel` as the app adapter owner of `Tabs v-model`; shared frame must not own adaccounts tab state.
- Keep `AdAccountsWorkspace.vue` as the domain switcher for TKQC/BM/Page/Pixel table and Function panel 1.
- Function panel 2 can remain placeholder content through the adapter slot.

### Baseline verification

- `pnpm --filter @mf2/shared-ui typecheck` — PASS.
- `pnpm --filter @mf2/adaccounts typecheck` — PASS.
- `pnpm --filter @mf2/adaccounts build` — PASS with existing non-blocking warnings:
  - Module Federation manifest warns about `publicPath='auto'` absolute path resolution.
  - CSS order warnings between `vue-sonner`, dialog CSS, and table CSS.
  - Asset size warnings for `74.8aec427f.js` and `237.ea88b70f.js`.

No app/shared source behavior was changed in this phase.

