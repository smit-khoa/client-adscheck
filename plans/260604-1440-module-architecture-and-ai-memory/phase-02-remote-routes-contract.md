---
phase: 2
title: "MF contract: remote expose ./routes + shell dynamic addRoute"
status: completed
priority: P1
effort: "0.5-1d"
dependencies: [1]
---

# Phase 2: MF contract — remote expose `./routes` + shell dynamic addRoute

## Overview
Đổi MF contract: mỗi remote expose thêm `./routes` (RouteRecordRaw[]). Shell import động và `addRoute` vào nhánh `business/:bid/<remote>`. Route con là route vue-router thật trên host → deep-link, back/forward, breadcrumb hoạt động ở cấp shell.

## Requirements
- Functional: remote tự khai báo route con; shell nạp động khi vào nhánh remote. Deep-link tới route con của remote hoạt động (reload trang vẫn đúng).
- Non-functional: không phá lazy-load (route con vẫn chỉ tải khi vào remote). Build xanh.

## Architecture
- Remote MF exposes: `{ './App': './src/App.vue', './routes': './src/router/index.ts' }`.
- `apps/<remote>/src/router/index.ts` export default `RouteRecordRaw[]` (path tương đối dưới `business/:bid/<remote>`).
- Shell: thay `:pathMatch(.*)*` + RemoteView tĩnh bằng cơ chế nạp `import('<remote>/routes')` rồi `router.addRoute('<parent-name>', route)` lần đầu điều hướng vào remote. Cần đặt `name` cho route cha (`business/:bid/<remote>`) để addRoute target được.
- Giữ `RemoteView`/`RemoteErrorBoundary` làm component render cho từng route con (hoặc remote tự render — chốt khi cook).
- `ProtectedRoute` (roles/feature) vẫn bọc nhánh remote ở shell (gating ở host, không đẩy xuống remote).

## Related Code Files
- Modify: `apps/shell/src/router/index.ts` (dynamic addRoute, đặt name route cha)
- Modify: `apps/shell/rspack.config.ts` (remotes không đổi; chỉ cần shell biết import `<remote>/routes`)
- Modify: `apps/home/rspack.config.ts`, `apps/ads_asset/rspack.config.ts` (thêm expose `./routes`)
- Create: `apps/home/src/router/index.ts`, `apps/ads_asset/src/router/index.ts`
- Modify: `apps/shell/src/remotes.d.ts` (khai báo type cho `<remote>/routes`)

## Implementation Steps
1. Thêm `exposes['./routes']` vào rspack config của home + ads_asset, tạo `src/router/index.ts` trả `[]` (chưa có màn thật → mảng rỗng hoặc 1 placeholder route).
2. Khai báo type `declare module 'home/routes'` trong `remotes.d.ts`.
3. Shell: đặt `name` cho route cha remote; viết logic nạp `./routes` + addRoute (idempotent — chỉ add 1 lần). Cẩn thận thứ tự: addRoute trước khi resolve navigation (dùng navigation guard `beforeEnter` hoặc async resolve).
4. Test deep-link: vào thẳng URL route con, reload → render đúng, không 404.
5. typecheck + build cả 3 app.

## Success Criteria
- [ ] `home/routes` + `ads_asset/routes` expose được, shell import type-safe.
- [ ] Vào nhánh remote → route con nạp động, add đúng 1 lần (không nhân bản route khi back/forward).
- [ ] Deep-link + reload route con: không 404, render đúng.
- [ ] ProtectedRoute vẫn chặn ads-asset khi thiếu role/feature.
- [ ] build 3 app xanh.

## Risk Assessment
- **addRoute race / nhân đôi route**: nếu add nhiều lần khi điều hướng qua lại. Mitigation: cờ đã-add per remote; hoặc kiểm tra `router.hasRoute(name)`.
- **Deep-link trước khi routes nạp xong**: cần async guard chờ import `./routes` resolve trước khi vue-router match, nếu không sẽ rơi vào NotFound. Mitigation: `beforeEnter` async trên route cha load routes rồi `next({ ...to })` re-resolve.
- Contract change → cập nhật CLAUDE.md "MF2 Contract" (làm ở Phase 5).
