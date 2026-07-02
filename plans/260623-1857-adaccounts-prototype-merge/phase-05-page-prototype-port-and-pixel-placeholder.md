---
phase: 5
title: "Page prototype port and Pixel placeholder"
status: completed
priority: P2
dependencies: [4]
---

# Phase 05: Page Prototype Port and Pixel Placeholder

## Overview

Port Page table/tools from `feat-dev-prototype` and add a truthful empty Pixel tab. This completes the requested TKQC/BM/Page/Pixel tab set.

## Requirements

- Functional: Page tab renders the prototype page manager table/loading UI.
- Functional: Page Function panel 1 renders prototype page tools.
- Functional: Pixel tab renders an empty table state and empty/coming-soon Function panel.
- Functional: Function panel 2 renders placeholder content for this port.
- Non-functional: no fake Pixel data or speculative Pixel API.
- TDD gate: run typecheck/build after Page import migration.

## Architecture

Target shape:

```text
features/page/
  components/
    PageTableView.vue
    PageFunctionPanel.vue
  api/
  composables/
  stores/
  types/
  data/
  index.ts

features/pixel/
  components/
    PixelTableView.vue
    PixelFunctionPanel.vue
  index.ts
```

Page uses prototype feature code. Pixel is a minimal UI boundary only.

## Related Code Files

- Port from prototype: `apps/adaccounts/src/features/page-manager/**`
- Port from prototype: `apps/adaccounts/src/features/page-selection/**`
- Port from prototype: `apps/adaccounts/src/features/page-tool-actions/**`
- Create: `apps/adaccounts/src/features/pixel/components/PixelTableView.vue`
- Create: `apps/adaccounts/src/features/pixel/components/PixelFunctionPanel.vue`
- Create: `apps/adaccounts/src/features/pixel/index.ts`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`

## Implementation Steps

1. Port Page manager API/composable/types/components from prototype into `features/page`.
2. Port Page selection store/composable into `features/page`.
3. Port Page tool panel/catalog/action composables into `features/page`.
4. Wire Page tab main content and Function panel 1.
5. Add Pixel table component with empty state matching workspace style.
6. Add Pixel Function panel empty/coming-soon component.
7. Wire Pixel tab main content and Function panel 1.
8. Run checks:
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts build`

## Success Criteria

- [x] Page tab renders table/loading UI from prototype.
- [x] Page Function panel 1 renders page tools from prototype.
- [x] Pixel tab renders empty state, no API call.
- [x] Pixel Function panel renders empty/coming-soon state.
- [x] All four tabs switch without crash.
- [x] Typecheck and build pass.

## Phase 5 Result — 2026-06-23

- Ported selected Page prototype folders without raw-merge:
  - `features/page-manager/**`
  - `features/page-selection/**`
  - `features/page-tool-actions/**`
- Ported generic tool-action helpers needed by Page tools:
  - `create-tool-actions.ts`
  - `tool-actions-context.ts`
  - shared `ToolList` / `ToolFunctionForm` behavior.
- Updated TKQC `ToolPanel` to use the generic enabled-tools model while preserving runner dispatch and `showAdvancedSwitch` compatibility.
- Added `features/page/**` workspace wrappers:
  - `PageTableView` renders prototype Page manager UI.
  - `PageFunctionPanel` renders prototype Page tool panel.
- Added `features/pixel/**` truthful placeholders:
  - `PixelTableView` empty state.
  - `PixelFunctionPanel` coming-soon state.
- Wired workspace Page and Pixel tabs; Page count follows loaded Page rows, Pixel count remains 0.
- Code review: `DONE_WITH_CONCERNS`; concerns addressed before completion.
  - Added `running` guard to PageToolPanel.
  - Documented shared Luồng/Delay settings between TKQC and Page.
- Feature docs updated:
  - `.claude/features/adaccounts-page-tab.md`
  - `.claude/features/adaccounts-pixel-placeholder.md`
  - `.claude/features/adaccounts-workspace-tabs.md`
  - `.claude/features/adaccounts-tool-actions.md`
  - `.claude/features/README.md`
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS, CSS order and asset-size warnings only.

## Risk Assessment

- Risk: Page tools depend on shared tool-action abstractions from prototype. Mitigation: port common helpers only if still needed; avoid reintroducing a cross-tab abstraction unless it removes real duplication.
- Risk: Pixel placeholder becomes fake feature. Mitigation: no fake rows, no fake counts except display can be 0.
