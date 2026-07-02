---
slug: shell-header-business-switcher
remote: shell
route: /home (header luôn hiển thị)
roles: —
feature_flag: —
status: done
---

## Purpose
Header/sidebar shell cố định của Adscheck: header nhỏ với brand Adscheck + action bên phải, sidebar dạng icon rail bên trái, và content panel rỗng trong giai đoạn reset khỏi demo mode. Business switcher/menu user cũ tạm không render trong UI shell-only này.

## Flow
1. AppLayout renders `BackgroundAtmosphere`, `AppHeader`, `ArcSidebar`, and an empty rounded workspace panel.
2. `SHOW_REMOTE_CONTENT` in AppLayout is `false`, so the current remote app route is intentionally hidden while the product shell is reset from demo mode.
3. AppLayout owns sidebar menu config and shared layout constants, then computes one SVG path from the menu heights so the cut curves follow primary/secondary menu size.
4. AppHeader renders the Adscheck brand and lightweight actions (`Thông báo`, `Mua gói`) without reading auth/business state; the `Mua gói` CTA uses shared-ui `Button` default styling.
5. ArcSidebar receives menu items/layout constants as props and renders icon-only navigation inside the SVG-shaped glass surface; active state is inferred from the current `/home/<segment>` route.
6. UserDropdown/NotificationsButton files remain in the repo for possible lightweight user/menu actions, but BusinessDropdown and PlanPill were removed with the retired auth business/role flow.

## Entry points / Routes
- See frontmatter `route`; main entry is the documented route/action for this feature.

## Files (MANDATORY — real paths, verified to exist)
- apps/shell/src/components/AppHeader.vue — header gốc: Adscheck brand + notification/package actions
- apps/shell/src/components/ArcSidebar.vue — sidebar icon rail rendered inside the SVG-shaped glass surface; active state theo route segment
- apps/shell/src/components/AppLayout.vue — shell frame; renders empty SVG-shaped glass workspace panel while `SHOW_REMOTE_CONTENT` is false
- apps/shell/src/components/BackgroundAtmosphere.vue — full-viewport image background (`adscheck-background.webp`) + readability overlays
- apps/shell/public/assets/adscheck-background.webp — Adscheck shell background asset copied into dist by shell rspack config
- apps/shell/src/components/header/UserDropdown.vue — menu user, giữ lại cho flow auth/business sau này nhưng chưa mounted
- apps/shell/src/components/header/NotificationsButton.vue — nút thông báo cũ, giữ lại cho flow auth/business sau này nhưng chưa mounted
- apps/shell/src/components/header/DropdownPanel.vue — khung panel dùng chung cho các dropdown
- apps/shell/src/composables/use-click-outside.ts — đóng dropdown khi click ngoài

## APIs used
- Không gọi API trực tiếp — current shell-only header/sidebar không đọc auth/business state. Các dropdown còn lại nếu bật lại chỉ được dùng cho lightweight UI và phải đọc state qua shared-store.

## State
- See `## Flow` and `## Files` for the stores/composables involved; no additional state notes recorded yet.

## Permissions / Flags
- See frontmatter `roles` and `feature_flag`; no additional permission notes recorded yet.

## Verification
- Run `pnpm verify:all` plus the relevant app/package typecheck/build after changing this feature.

## Related
[[auth-flow]] [[remote-loading-recovery]]

## Decisions / Gotchas
- Header KHÔNG tự fetch: current shell-only UI chỉ render static actions. Business switcher/package-plan UI was removed with the retired auth business/role flow; do not reintroduce it without a new feature plan.
- SVG-shaped workspace uses one computed inline SVG path for both fill and stroke so the border cannot drift away from the background shape. AppLayout computes curve Y positions from the shared sidebar constants and primary/secondary menu item counts, while the viewBox width follows the panel width so the left indentation stays fixed in pixels across screen sizes.
- Sidebar rail is rendered inside the shaped glass surface, not as a separate fixed block, so the shell reads as one continuous panel.
