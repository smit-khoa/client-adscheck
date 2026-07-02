---
slug: adaccounts-workspace-tabs
remote: adaccounts
route: /adscheck-pro/adaccounts
roles: []
feature_flag: n/a
status: done
---

## Purpose
Render the adaccounts remote-owned workspace frame with TKQC/BM/Page/Pixel tabs, a main table slot, Function panel 1 tied to the active tab, and Function panel 2 that shows selected workflow steps for TKQC/BM/Page while keeping placeholder fallback for Pixel.

## Flow
1. Shell loads the `adaccounts` remote route at `/adscheck-pro/adaccounts`.
2. `AdAccountsPage` renders `AdAccountsWorkspace` and mounts one `<Toaster>` outlet for the remote.
3. `AdAccountsWorkspace` reads remote-local workspace tab state from `useWorkspaceTabStore`.
4. `WorkspaceTabFrame` keeps ownership of shared-ui `Tabs` model/emit, forwards optional toolbar content into the shared-ui `WorkspacePathFrame` toolbar area, then renders its tabs/main/panels through shared-ui `WorkspacePathFrame` for the SVG path frame visual. The workspace toolbar uses a single fixed Teleport target (`#adaccounts-workspace-table-toolbar`) as the shared button container: the active TKQC/BM/Page load-config trigger is rendered first inside that container, and the active data-grid teleports table action buttons into the same container after it without adding an extra flex/padding wrapper. The shared toolbar container is a nowrap, shrink-stable flex row with the same gap and controlled horizontal overflow for narrow screens. The workspace wrapper uses a tight 4px padding; the main card renders only the transparent tab content slot, without the tab meta header strip, border, or inset shadow.
5. URL is the source of truth on load: `/adscheck-pro/adaccounts`, `/adscheck-pro/businesses`, `/adscheck-pro/page`, and `/adscheck-pro/pixel` set the matching active tab.
6. User switches tab -> `handleActiveTabUpdate` updates Pinia state and pushes the matching canonical URL.
7. When active tab is `adaccounts`, `AdAccountsWorkspace` renders the real [[adaccounts-tkqc-tab]] table, the TKQC grouped function catalog in Function panel 1, and the selected TKQC workflow-step list with compact step cards and schema field skin in Function panel 2.
8. When active tab is `businesses`, `AdAccountsWorkspace` renders the real [[adaccounts-bm-tab]] table/loading UI, the BM function catalog in Function panel 1, and selected BM workflow steps in Function panel 2.
9. When active tab is `page`, `AdAccountsWorkspace` renders the real [[adaccounts-page-tab]] table/loading UI, the Page function catalog in Function panel 1, and selected Page workflow steps in Function panel 2; Page run remains UI-only/truthful.
10. When active tab is `pixel`, `AdAccountsWorkspace` renders the truthful empty [[adaccounts-pixel-placeholder]] UI; Function panel 2 uses the placeholder fallback.
11. `WorkspaceTabFrame` exposes a caller-provided `panel-two` slot while preserving the same placeholder fallback for tabs that do not provide panel-two business content.

## Entry points / Routes
- `/adscheck-pro/adaccounts` -> `apps/adaccounts/src/pages/AdAccountsPage.vue` -> `AdAccountsWorkspace`.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/router/index.ts — remote child routes for `adaccounts`, `businesses`, `page`, and `pixel`; invalid children redirect to `/home`
- apps/adaccounts/src/features/workspace/workspace-tab-routes.ts — tab route name/path mapping helpers for route-store synchronization
- apps/adaccounts/src/pages/AdAccountsPage.vue — route page, imports remote styles, renders workspace and the single Toaster outlet
- apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue — workspace page wrapper, connects store state to frame events and wires TKQC/BM/Page/Pixel tab slots, including TKQC/BM/Page Function panel 2 detail
- apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue — app adapter for shared-ui WorkspacePathFrame; owns Tabs model/emit, persisted panel open/size bindings, temporary fixed reopen controls, tab triggers, main slot, Function panel 1 slot, and caller-overridable Function panel 2 slot with placeholder fallback
- apps/adaccounts/src/composables/workspace/use-workspace-panels.ts — localStorage-backed state for Function panel 1/2 open flags and last resized widths
- packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue — reusable SVG path frame used by the adaccounts workspace adapter
- apps/adaccounts/src/features/workspace/components/FunctionPanelSlot.vue — reusable placeholder shell for function panels
- apps/adaccounts/src/features/adaccounts/components/TkqcDetailPanel.vue — TKQC Function panel 2 wrapper that resolves selected accounts and renders selected workflow steps
- apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue — selected TKQC workflow step list, schema-driven forms, delay/settings, and multi-step run footer
- apps/adaccounts/src/features/businesses/components/BmDetailPanel.vue — BM Function panel 2 wrapper that resolves selected BM ids and renders selected workflow steps
- apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue — selected BM workflow step list, schema-driven forms, runner settings, and BM runner dispatch
- apps/adaccounts/src/features/page/components/PageDetailPanel.vue — Page Function panel 2 wrapper that resolves selected Page ids/count and renders selected workflow steps
- apps/adaccounts/src/features/page/tools/components/PageToolDetailPanel.vue — selected Page workflow step list, schema-driven forms, and UI-only run warning
- apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts — remote-local active tab state and tab metadata
- apps/adaccounts/src/features/workspace/types/workspace.types.ts — WorkspaceTab and tab metadata types
- apps/adaccounts/src/features/workspace/index.ts — public workspace feature surface

## APIs used
- none

## State
- `useWorkspaceTabStore` Pinia store:
  - `activeTab`: current `adaccounts | businesses | page | pixel` tab, defaults to `adaccounts`.
  - `tabs`: static tab metadata used by the frame; UI labels remain `TKQC`, `BM`, `Page`, and `Pixel`.
  - `activeTabMeta`: derived active tab metadata.
- `workspace-tab-routes.ts` maps tab keys to canonical URLs and route names for URL/store sync.
- `useWorkspacePanels` composable persists Function panel 1/2 open flags and last resized widths to `localStorage` key `adaccounts.workspace-panels.v1`; invalid/missing values fall back to both panels open at 15%.

## Permissions / Flags
- none

## Verification
- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`
- Manual UI smoke: `/adscheck-pro/adaccounts` renders TKQC/BM/Page/Pixel tabs; switching tabs changes main content and Function panel 1; TKQC/BM/Page Function panel 2 shows ordered selected workflow steps; Pixel Function panel 2 still uses placeholder fallback.

## Related
[[adaccounts-basic-mode]] [[adaccounts-account-list]] [[adaccounts-bm-data-loading]] [[adaccounts-tkqc-tab]] [[adaccounts-bm-tab]] [[adaccounts-page-tab]] [[adaccounts-pixel-placeholder]] [[adaccounts-tool-actions]] [[shell-workspace-content]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- Workspace tabs are owned by the `adaccounts` remote, not by shell. Shell still hosts/loading the remote; business tabs stay inside the remote.
- URL is source of truth for initial/reloaded tab state; tab clicks update the URL without moving router logic into `WorkspaceTabFrame`.
- Internal tab keys are domain-oriented (`adaccounts`, `businesses`, `page`, `pixel`) while UI labels intentionally remain product-facing (`TKQC`, `BM`, `Page`, `Pixel`).
- This feature intentionally keeps Pixel Function panel 2 as placeholder. TKQC/BM/Page now provide tab-specific detail workflow panels; Pixel stays truthful-empty because no Pixel API/data is in scope.
- `basic/advanced` is no longer the route-level owner for `/adscheck-pro/adaccounts`. Project-wide mode switching should be modeled outside this remote-local workspace store.
- `WorkspaceTabFrame` depends on shared-ui `WorkspacePathFrame` for the reusable frame visual. Keep adaccounts tab state, labels, and table/tool selection in the app adapter; do not move domain logic into shared-ui.
- Function panel 1 forces slotted text color to the panel green tone from `WorkspaceTabFrame`; tool panels that previously used white text inherit this color in panel 1 so they remain readable on the shared light gradient surface.
- Function panel placeholders do not paint their own gradient; they inherit the shared `WorkspacePathFrame` panel surface so Function panel 1 and fallback Function panel 2 keep the same background color.
- TKQC/BM/Page Function panel 2 content is caller-provided from `AdAccountsWorkspace`; `WorkspaceTabFrame` still owns only the slot/fallback mechanics and must not import domain logic.
- Keep workspace toolbar actions in `#adaccounts-workspace-table-toolbar`: load-config stays as the first child for the active tab, while table actions are appended by Teleport through a layout-neutral `contents` wrapper. Do not put load-config in a sibling div or add another flex/padding wrapper around teleported table actions, otherwise spacing/order drifts from the data-grid toolbar buttons and the header can wrap on narrow screens.
- Function panel open/size persistence is app-owned, not shared-ui-owned. `WorkspaceTabFrame` maps the shared `layout` event by currently open panels because the emitted size array only contains rendered panels.
- Hidden panels can be reopened through temporary fixed buttons on the right side of the screen; this is intentionally basic UI until a polished control is requested.
