---
phase: 2
title: "Add shared-ui WorkspacePathFrame"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Add Shared-ui WorkspacePathFrame

## Overview

Add an additive shared-ui component that renders the SVG path workspace frame, tab header area, toolbar slot, main content slot, and two optional function panels. This phase touches only `packages/shared-ui` and catalog docs.

## Requirements

- Functional: port path drawing/measurement behavior from shell prototype into a generic shared component.
- Functional: expose slots for tabs, toolbar, main content, panel one, and panel two.
- Functional: preserve a default toolbar with the existing visual affordances until app-specific toolbar actions are added later.
- Non-functional: no imports from `apps/*` or adaccounts-specific labels.
- Non-functional: additive shared-ui export; do not break existing entrypoints.

## Architecture

Target files:

```text
packages/shared-ui/src/components/ui/workspace-path-frame/
  WorkspacePathFrame.vue
  index.ts
packages/shared-ui/src/workspace-path-frame.ts
packages/shared-ui/package.json
.claude/components-catalog.md
```

The component owns SVG frame mechanics only. Caller owns tabs and business content.

Suggested public API:

```ts
interface Props {
  activeTab: string;
  firstTabValue?: string;
  panelOneOpen?: boolean;
  panelTwoOpen?: boolean;
  panelOneLabel?: string;
  panelTwoLabel?: string;
}

interface Emits {
  (e: 'update:panelOneOpen', value: boolean): void;
  (e: 'update:panelTwoOpen', value: boolean): void;
}
```

Slots:

- `tabs`
- `toolbar`
- `main`
- `panel-one`
- `panel-two`

The slotted tab triggers must include `data-tab-value="<activeTab value>"` so the frame can measure active bounds.

## Related Code Files

- Create: `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue`
- Create: `packages/shared-ui/src/components/ui/workspace-path-frame/index.ts`
- Create: `packages/shared-ui/src/workspace-path-frame.ts`
- Modify: `packages/shared-ui/package.json`
- Modify: `packages/shared-ui/src/index.ts` only if consistent with current additive root export policy
- Modify: `.claude/components-catalog.md`
- Read reference: `apps/shell/src/components/WorkspaceContent.vue`

## Implementation Steps

1. Create `WorkspacePathFrame.vue` with Vue `<script setup lang="ts">`.
2. Port path measurement logic from shell prototype:
   - `tabShapeRef`
   - `tabShapeWidth` / `tabShapeHeight`
   - `activeTabBounds`
   - `tabRailEnd`
   - `tabContentPath`
   - `tabShapeViewBox`
   - `measureTabShape`
   - `ResizeObserver` lifecycle
3. Keep active tab owner external: use `props.activeTab`, not local tab state.
4. Render a layout compatible with current shell visual:
   - path SVG background
   - tabs slot in header
   - toolbar slot/default toolbar
   - main slot inside path content area
   - optional panel one/two sections separated by resizable handles
5. Use existing shared-ui internal components with relative imports or package-local patterns.
6. Add narrow entrypoint export `./workspace-path-frame` in `package.json`.
7. Add `workspace-path-frame.ts` barrel.
8. Update component catalog with usage, slots, and anti-patterns.
9. Run:
   ```bash
   pnpm --filter @mf2/shared-ui typecheck
   pnpm verify:catalog
   ```

## Success Criteria

- [x] `WorkspacePathFrame` compiles in shared-ui.
- [x] Component has no adaccounts/shell imports.
- [x] Component does not own business tab data or labels.
- [x] Narrow entrypoint export works.
- [x] Catalog documents the new component group and `data-tab-value` requirement.
- [x] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [x] `pnpm verify:catalog` passes.

## Phase 2 Notes

### Implemented files

- `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue` — generic SVG path frame, active-tab measurement, toolbar/main/panel slots, optional panel close emits.
- `packages/shared-ui/src/components/ui/workspace-path-frame/index.ts` — component group export.
- `packages/shared-ui/src/workspace-path-frame.ts` — narrow public entrypoint.
- `packages/shared-ui/package.json` — additive `./workspace-path-frame` export.
- `packages/shared-ui/src/index.ts` — additive root barrel export.
- `.claude/components-catalog.md` — documented usage, slots, and `data-tab-value`/`data-tabs-list` measurement requirement.
- `.claude/features/shared-ui-workspace-path-frame.md` and `.claude/features/README.md` — feature map entry for the new shared component.

### Review fixes applied

- Main panel default size now accounts for the number of open side panels: `100 - openPanelCount * 15`.
- SVG gradient id uses Vue `useId()` to avoid cross-instance DOM id collisions.
- First-tab path branch now ignores transient empty `activeTab`.

### Verification

- `pnpm --filter @mf2/shared-ui typecheck` — PASS.
- `pnpm verify:catalog` — PASS.
- `pnpm verify:features` — PASS.
- Tester subagent: PASS for typecheck/catalog/export wiring; noted no component-level unit test, not blocking this visual/layout phase.
- Code-reviewer subagent: accepted structure/contract; medium panel-size concern fixed before phase completion.

