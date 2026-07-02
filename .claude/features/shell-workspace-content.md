---
slug: shell-workspace-content
remote: shell
route: /home (shell placeholder)
roles: []
feature_flag: n/a
status: done
---

## Purpose
Render the root-level shell frame with header, sidebar, and placeholder pages for `/home`, `/ads-save`, `/super-target`, `/support`, `/settings`, and `/account` while leaving remote branches free to render through `<router-view>`.

## Flow
1. AppLayout renders the SVG-shaped shell frame with AppHeader, ArcSidebar, and a content `<router-view>`.
2. Shell placeholder routes (`/home`, `/ads-save`, `/super-target`, `/support`, `/settings`, `/account`) render `ShellPlaceholderPage` inside the frame.
3. Remote routes such as `/adscheck-pro/adaccounts` render through AppLayout's `<router-view>` so the remote-owned workspace/features can mount inside the shell frame.
4. Legacy `/app/*` and unknown paths redirect to `/home`.
5. The old `WorkspaceContent` skeleton remains in the codebase but is no longer the active `/home` renderer after the root route redesign.

## Entry points / Routes
- `/home` shell workspace panel via AppLayout.

## Files (MANDATORY — real paths, verified to exist)
- apps/shell/src/router/index.ts — root route contract: `/`, `/home`, `/adscheck-pro`, placeholders, `/app/*` legacy redirect, catch-all redirect
- apps/shell/src/router/product-routes.ts — shell placeholder route constants and route factory
- apps/shell/src/pages/ShellPlaceholderPage.vue — simple truthful placeholder page for shell-owned product routes
- apps/shell/src/components/AppLayout.vue — shaped shell frame; always renders child `<router-view>` inside the content area so remote branches cannot be masked; computes the responsive outer workspace path around the sidebar rail, including the 24px right-side corner radius
- apps/shell/src/components/AppHeader.vue — header logo link points to `/home`
- apps/shell/src/components/ArcSidebar.vue — root product route links and active state for `/adscheck-pro/*`
- apps/shell/src/components/WorkspaceContent.vue — legacy workspace skeleton retained but not mounted by the current `/home` route
- packages/shared-ui/src/components/ui/tabs/index.ts — shared Tabs compound components used by the legacy WorkspaceContent
- packages/shared-ui/src/components/ui/resizable/index.ts — shared ResizablePanelGroup/Panel/Handle used by the legacy WorkspaceContent

## APIs used
- none

## State
- Shell placeholder state lives in route meta (`title`, `description`, `isShellPlaceholder`) and is read by `ShellPlaceholderPage`.
- No Pinia/global state.

## Permissions / Flags
- none

## Verification
- `pnpm --filter @mf2/shell typecheck`
- `pnpm --filter @mf2/shell build`
- `pnpm verify:features`

## Related
[[shell-header-business-switcher]] [[remote-loading-recovery]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- Shell placeholders are intentionally truthful and do not mount fake Ads Save / Super Target / Support / Settings / Account features.
- AppLayout always renders `<router-view>`; route-level placeholder selection belongs to the router, not to path checks inside the layout.
- Legacy `WorkspaceContent` is not deleted in this task to keep the change surgical; remove it later only if the product confirms it is obsolete.
- Tabs and Resizable are imported from the root `@mf2/shared-ui` barrel because shared-ui currently has no exported subpath for those groups. Do not add a shared-ui export in the same app-only change; keep shared/package changes separate.
- Tab rail uses a hybrid SVG full-height workspace shape behind the TabsTrigger buttons and content area. The SVG is width/height 100% with a dynamic viewBox, and WorkspaceContent measures the active tab + tab rail DOM positions via ResizeObserver so the active-tab cutout aligns to the real tab item width. The path owns the workspace background gradient so color flows continuously from the tab/header area into the content. The active-tab cutout intentionally keeps the previous curve commands commented beside the current straighter commands because the shape is still being visually tuned. The first tab uses a boundary-specific path that still wraps the active tab, but omits the lower-left notch so the left edge connects directly into the content. The rail's outer-right cut uses cubic curves inside the main path so the border follows the same smooth shape. Individual tabs remain normal triggers; do not use one SVG per tab unless the tab count becomes highly dynamic.
