---
phase: 2
title: "Remote-owned workspace frame"
status: completed
priority: P1
dependencies: [1]
---

# Phase 02: Remote-Owned Workspace Frame

## Overview

Create the tabbed workspace inside the `adaccounts` remote. The route `/app/adaccounts` should render a remote-owned tab frame with table area and Function panel slots.

## Requirements

- Functional: render TKQC/BM/Page/Pixel tabs in `adaccounts` remote.
- Functional: active tab controls main content slot and Function panel 1 slot.
- Functional: keep `<Toaster>` mounted once in `AdAccountsPage.vue`.
- Functional: Function panel 2 renders placeholder content; do not add business logic to it in this phase.
- Non-functional: `basic/advanced` mode must not remain an `adaccounts`-local route mode. Mode switching is a project-wide concern and should be planned as global shell/app state, not owned by `apps/adaccounts/src/stores/mode-store.ts`.
- Non-functional: reuse shared-ui `Tabs`, `ResizablePanelGroup`, `Button`, and icons; do not add shared package changes.
- TDD gate: add/keep a small pure test for tab metadata/store if test infra exists; otherwise rely on typecheck and no render test.

## Architecture

`AdAccountsPage.vue` becomes a thin route page:

```text
AdAccountsPage
  -> AdAccountsWorkspace
      -> workspace tab state
      -> main tab content
      -> Function panel 1
      -> Function panel 2 placeholder
      -> Toaster remains route-level or app-level once
```

The workspace frame may borrow visual ideas from `apps/shell/src/components/WorkspaceContent.vue`, but business-specific tabs live only in `adaccounts`.

## Related Code Files

- Create: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Create: `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
- Create: `apps/adaccounts/src/features/workspace/components/FunctionPanelSlot.vue`
- Create: `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
- Create: `apps/adaccounts/src/features/workspace/types/workspace.types.ts`
- Create: `apps/adaccounts/src/features/workspace/index.ts`
- Modify: `apps/adaccounts/src/pages/AdAccountsPage.vue`
- Read/reference: `apps/shell/src/components/WorkspaceContent.vue`
- Eventually obsolete: `apps/adaccounts/src/features/basic-mode/*`, `apps/adaccounts/src/features/advanced-mode/*`

## Implementation Steps

1. Define `WorkspaceTab` union: `tkqc | bm | page | pixel`.
2. Add tab metadata in one place: label, count placeholder, component mapping.
3. Add workspace tab state as remote-local Pinia or local composable. Prefer local store only if panels/components need cross-tree access.
4. Build `AdAccountsWorkspace.vue` with shared-ui `Tabs` and resizable panels.
5. Add placeholder content for all four tabs first.
6. Wire `AdAccountsPage.vue` to render workspace + one `<Toaster>`.
7. Remove `adaccounts`-local basic/advanced route mode dependency after workspace tab content is wired. Do not preserve `mode-store` as the long-term owner; project-wide mode switching belongs outside the adaccounts feature boundary.
8. Run focused verification.

## Success Criteria

- [x] `/app/adaccounts` renders remote-owned tabs.
- [x] Switching tabs changes visible placeholder content.
- [x] Function panel 1 placeholder follows active tab.
- [x] Function panel 2 renders placeholder content.
- [x] `AdAccountsPage.vue` no longer depends on adaccounts-local `basic/advanced` route mode after workspace content is wired.
- [x] No shell component imports from `apps/shell` into `apps/adaccounts`.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.

## Phase 2 Result — 2026-06-23

- Added `features/workspace/**` for remote-owned tabs and function panel placeholders.
- Updated `AdAccountsPage.vue` to render `AdAccountsWorkspace` and keep one Toaster outlet.
- Updated feature docs: `adaccounts-workspace-tabs.md`, `adaccounts-basic-mode.md`, and feature README index.
- Code review concern resolved: store is the single source of truth for `activeTabMeta`; `tabs` is not destructured through `storeToRefs`.
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNING, asset-size warning only.

## Risk Assessment

- Risk: copying shell workspace directly creates app-to-app coupling. Mitigation: copy/adapt markup only; no imports from shell.
- Risk: remote styles differ from shell. Mitigation: rely on existing `remote-styles.css` and adaccounts theme tokens.
