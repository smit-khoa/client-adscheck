---
slug: shared-ui-workspace-path-frame
remote: n/a (packages/shared-ui)
route: n/a
roles: []
feature_flag: n/a
status: done
---

## Purpose
Reusable shared-ui workspace frame that renders the SVG path tab rail, toolbar area, main content slot, and two optional resizable function panels while leaving business state/content to the caller.

## Flow
1. Caller renders `WorkspacePathFrame` through `@mf2/shared-ui/workspace-path-frame` and passes `activeTab` plus optional panel open state.
2. Caller provides tab triggers in the `tabs` slot; each trigger exposes `data-tab-value` matching the active tab value, and the tab list should expose `data-tabs-list`.
3. The frame measures the active trigger and tab rail with `ResizeObserver` + `nextTick`, then updates the SVG path around the active tab.
4. Caller renders business content in the `main`, `panel-one`, and `panel-two` slots. Both side panels receive the shared 16px rounded gradient surface that matches the main content frame. Optional `panelOneSize` / `panelTwoSize` props seed the side panel default widths, and the frame emits `layout` with the current rendered panel size array when resizing changes.
5. Panel open/close controls are rendered by callers inside panel slot content; the frame only consumes `panelOneOpen` / `panelTwoOpen` and conditionally renders the side panels.

## Entry points / Routes
- n/a — reusable shared-ui component.

## Files (MANDATORY — real paths, verified to exist)
- packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue — SVG path frame, tab measurement, toolbar/main/panel slot layout, panel close emits
- packages/shared-ui/src/components/ui/workspace-path-frame/index.ts — component group export
- packages/shared-ui/src/workspace-path-frame.ts — narrow public entrypoint for `@mf2/shared-ui/workspace-path-frame`
- packages/shared-ui/package.json — package export map for `./workspace-path-frame`
- packages/shared-ui/src/index.ts — additive root export for backwards-compatible shared-ui barrel usage
- .claude/components-catalog.md — catalog entry documenting slots and measurement requirements

## APIs used
- none

## State
- Local frame measurement state: `tabShapeWidth`, `tabShapeHeight`, `activeTabBounds`, `tabRailEnd`.
- Caller-owned state: `activeTab`, `panelOneOpen`, `panelTwoOpen`, optional `panelOneSize`, optional `panelTwoSize`, and any persistence of the `layout` emit.
- No Pinia/global state.

## Permissions / Flags
- none

## Verification
- `pnpm --filter @mf2/shared-ui typecheck`
- `pnpm verify:catalog`
- `pnpm verify:features`

## Related
[[shell-workspace-content]] [[adaccounts-workspace-tabs]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- Shared component owns only frame mechanics. It must not know TKQC/BM/Page/Pixel labels, call APIs, or own tab store state.
- Slotted tab triggers must include `data-tab-value` so active-tab measurement can find the real DOM bounds. A `data-tabs-list` wrapper improves rail-end measurement.
- SVG gradient id uses Vue `useId()` so multiple frame instances do not collide in the same DOM.
- Active tab values are escaped before being used in the internal `[data-tab-value="..."]` selector, so future callers are not limited to simple union-like strings.
- Missing `data-tabs-list` triggers a development-only warning because the frame can still render with fallback path constants, but the SVG cutout may be misaligned.
- Main panel default size is computed from the current open side-panel sizes (`100 - open side panel size total`, clamped to the 38% main min) so callers that persist `panelOneSize` / `panelTwoSize` restore the same layout after reload.
- Main content path and both side panels intentionally use the same SVG-derived composite surface: a 95% white base with a very light `#4DFF7F` vertical overlay (6% at top/bottom, 2% at 51.9231%) so the workspace surface matches the provided Figma/SVG background while staying subtle behind transparent tables.
- Shared resize handles render the drag icon directly when `withHandle` is enabled; the old bordered pill wrapper was removed so workspace panel dividers stay visually minimal.
- `panelOneSize` / `panelTwoSize` are optional initial widths only. Callers that persist panel sizing should listen to `layout` and map the emitted array using their own open-panel state because hidden panels are not present in the array.
- Panel collapse/expand UI belongs to caller slot content, not the shared frame. The shared frame should not render a floating close `X`; app panels decide which button hides their panel.
