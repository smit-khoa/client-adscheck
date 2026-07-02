---
type: brainstorm-report
topic: router-redesign-root-product-routes
status: approved
date: 2026-06-25
modes: []
---

# Brainstorm — Router redesign root product routes

## Summary

Thiết kế đã được duyệt: bỏ prototype `/app/*`, chuyển sang product routes cấp root, đồng bộ tab Adscheck Pro bằng URL, và route không hợp lệ chuyển về `/home`.

## Problem statement

URL hiện tại dùng dạng prototype `/app/<path>` nên không khớp tên sản phẩm và không deep-link được từng tab trong Adscheck Pro. Tab TKQC/BM/Page/Pixel hiện là state nội bộ Pinia nên reload `/app/adaccounts` luôn về tab mặc định, không thể share link tab cụ thể.

## Requirements

| Mục | Quyết định |
|---|---|
| Default route | `/` redirect về `/home` |
| Invalid routes | Mọi path linh tinh redirect về `/home` |
| Legacy `/app/*` | Xem là không hợp lệ, redirect về `/home` |
| Adscheck Pro root | `/adscheck-pro` redirect về `/adscheck-pro/adaccounts` |
| Adscheck Pro tabs | `/adscheck-pro/adaccounts`, `/adscheck-pro/businesses`, `/adscheck-pro/page`, `/adscheck-pro/pixel` |
| BM path | Dùng `businesses` |
| Route phụ | `/ads-save`, `/super-target`, `/support`, `/settings`, `/account` dùng placeholder |
| Out of scope | Không làm chức năng thật cho route phụ |

## Codebase findings

- Stack: Vue 3, TypeScript, vue-router 4, Pinia, Module Federation 2.
- Shell router hiện ở `apps/shell/src/router/index.ts`, đang mount remote dưới `/app/adaccounts` và `/app/ads-manager`.
- Remote lazy registration ở `apps/shell/src/router/remote-routes.ts`, đang check regex `^/app/${segment}`.
- Sidebar ở `apps/shell/src/components/ArcSidebar.vue` đang build URL bằng `/app/${item.path}`.
- Adaccounts remote chỉ expose route child `''` trong `apps/adaccounts/src/router/index.ts`.
- Workspace tab state ở `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`, chưa sync router.

## Evaluated approaches

### Approach A — Root product routes, no legacy compatibility

Định nghĩa route mới cấp root, mọi `/app/*` redirect về `/home`.

Pros:
- Sạch, đúng yêu cầu “bỏ `/app`”.
- Ít bảng mapping legacy.
- Invalid URL behavior đơn giản: về `/home`.

Cons:
- Bookmark cũ `/app/adaccounts` không tự tới Adscheck Pro.
- Cần cập nhật docs kỹ để tránh dev dùng lại `/app`.

### Approach B — Root product routes + legacy mapping

Route mới vẫn là canonical, nhưng `/app/adaccounts` redirect sang `/adscheck-pro/adaccounts`, `/app/files` sang `/ads-save`, v.v.

Pros:
- Ít gãy bookmark cũ.
- Rollout mềm hơn.

Cons:
- Trái với quyết định coi `/app/*` là không hợp lệ.
- Router có thêm mapping cũ, dễ kéo dài nợ prototype.

### Approach C — Chỉ alias tab trong remote, giữ `/app`

Giữ `/app/adaccounts`, thêm child path `/app/adaccounts/businesses`.

Pros:
- Ít sửa shell.

Cons:
- Không đáp ứng yêu cầu bỏ `/app`.
- URL vẫn không đúng tên sản phẩm.

## Final recommendation

Chọn Approach A: root product routes, `/app/*` về `/home`, Adscheck Pro tab deep-link.

Rationale:
- Khớp quyết định của Sếp.
- Không over-engineer legacy compatibility.
- Đủ deep-link/reload tab.
- Giữ MF2 contract: shell host route, remote expose child routes.

## Proposed route design

```text
/                     -> /home
/home                 -> shell placeholder/home
/adscheck-pro         -> /adscheck-pro/adaccounts
/adscheck-pro/*       -> adaccounts RemoteHost + remote child routes
/ads-manager          -> ads-manager RemoteHost or existing placeholder route
/ads-save             -> shell placeholder
/super-target         -> shell placeholder
/settings             -> shell placeholder
/support              -> shell placeholder
/account              -> shell placeholder
/app/:pathMatch(.*)*  -> /home
/:pathMatch(.*)*      -> /home
```

## Adscheck Pro tab route design

Remote child routes under shell parent `/adscheck-pro`:

```text
''             -> redirect `adaccounts`
'adaccounts'   -> AdAccountsPage, active tab `adaccounts`
'businesses'   -> AdAccountsPage, active tab `businesses`
'page'         -> AdAccountsPage, active tab `page`
'pixel'        -> AdAccountsPage, active tab `pixel`
':pathMatch'   -> /home
```

URL is source of truth on load. Pinia store remains local UI state after route sync.

## Implementation considerations

1. Update shell static routes in `apps/shell/src/router/index.ts`.
2. Update `installRemoteRoutes` matching from `/app/<segment>` to root base paths such as `/adscheck-pro`.
3. Update `ArcSidebar` item paths to absolute product routes instead of `/app/${path}`.
4. Add shell placeholder page/component for `/home`, `/ads-save`, `/super-target`, `/support`, `/settings`, `/account` if current `WorkspaceContent` is not suitable.
5. Update adaccounts remote routes to expose tab children.
6. Update `AdAccountsWorkspace` tab click handler to `router.push()` to the matching tab path.
7. Watch route path/name and set workspace active tab on reload/deep-link.
8. Keep `WorkspaceTabFrame` router-agnostic; it only emits tab changes.
9. Update feature docs: `shell-workspace-content.md`, `remote-loading-recovery.md`, `adaccounts-workspace-tabs.md`, plus README route references if touched.

## Risks

| Risk | Mitigation |
|---|---|
| Remote child route not registered before deep-link resolve | Keep global beforeEach registration and re-resolve after addRoute |
| Tab route/store sync loop | Only push router on user tab click; route watcher sets store if different |
| Placeholder masks remote again | Preserve AppLayout behavior: placeholder only for shell routes, RemoteHost renders remote branches |
| Docs drift | Run `pnpm verify:features` after updating feature docs |

## Validation criteria

- Open `/` -> lands `/home`.
- Open `/app/adaccounts` -> lands `/home`.
- Open `/does-not-exist` -> lands `/home`.
- Click sidebar Adscheck Pro -> lands `/adscheck-pro/adaccounts`.
- Click BM tab -> URL becomes `/adscheck-pro/businesses`; reload keeps BM active.
- Click Page tab -> URL becomes `/adscheck-pro/page`; reload keeps Page active.
- Click Pixel tab -> URL becomes `/adscheck-pro/pixel`; reload keeps Pixel active.
- Click `/ads-save`, `/super-target`, `/support`, `/settings` -> placeholder, not 404.
- Focused checks: `pnpm --filter @mf2/shell typecheck`, `pnpm --filter @mf2/adaccounts typecheck`, `pnpm verify:features`.

## Next steps

Recommended: create implementation plan with `/ck:plan --tdd` because this is a router behavior change with multiple redirect/deep-link acceptance cases.
