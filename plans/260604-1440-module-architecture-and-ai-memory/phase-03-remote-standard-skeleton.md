---
phase: 3
title: "Áp khung remote chuẩn cho home + ads_asset"
status: completed
priority: P2
effort: "0.5d"
dependencies: [2]
---

# Phase 3: Áp khung remote chuẩn cho home + ads_asset

## Overview
Tạo bộ thư mục layer chuẩn (§2 design doc) trong mỗi remote: `api/ components/ composables/ pages/ stores/ router/ types/`. CHỈ dựng khung + 1 page mẫu di chuyển từ App.vue hiện tại — KHÔNG nhồi business feature thật (YAGNI).

## Requirements
- Functional: remote vẫn render placeholder như cũ, nhưng nội dung chuyển vào `pages/`. App.vue trở thành shell mỏng render router-view của remote (hoặc giữ render trực tiếp — chốt theo kết quả Phase 2).
- Non-functional: cấu trúc 2 remote GIỐNG HỆT nhau (screaming consistency). build xanh.

## Architecture
- **Quyết định đã chốt (Validation Session 1): tạo dần khi cần.** Chỉ tạo `pages/` + `router/` ngay (đã có nội dung từ Phase 2). `api/ components/ composables/ stores/ types/` tạo KHI feature thật xuất hiện — KHÔNG tạo thư mục rỗng/.gitkeep. Convention layer được ghi trong docs (Phase 5) + feature template (Phase 4) để vẫn nhất quán khi mọc thêm.
<!-- Updated: Validation Session 1 - tạo dần thay vì full skeleton rỗng -->
- Di chuyển nội dung `App.vue` placeholder hiện tại vào `pages/HomePage.vue` / `pages/AdsAssetPage.vue`, route trong `router/index.ts` trỏ tới page đó.

## Related Code Files
- Create: `apps/home/src/pages/HomePage.vue`, `apps/ads_asset/src/pages/AdsAssetPage.vue`
- Modify: `apps/home/src/App.vue`, `apps/ads_asset/src/App.vue` (mỏng lại)
- Modify: `apps/home/src/router/index.ts`, `apps/ads_asset/src/router/index.ts` (route → page)

## Implementation Steps
1. Tạo `pages/` + chuyển markup placeholder vào page component.
2. `router/index.ts` khai báo route con trỏ page.
3. App.vue render route-view remote (nếu Phase 2 chọn remote-render) hoặc giữ default export page.
4. Đảm bảo standalone mode (bootstrap.ts createPinia) vẫn chạy độc lập.
5. build + chạy thử dev cả 2 remote standalone.

## Success Criteria
- [ ] Cấu trúc 2 remote nhất quán.
- [ ] Placeholder render đúng cả khi mount trong shell và standalone.
- [ ] Convention layer được ghi vào docs (link Phase 5).
- [ ] build xanh.

## Risk Assessment
- **Pinia standalone vs host singleton**: remote standalone tự `createPinia()`, trong host dùng pinia singleton của shell. Đảm bảo store remote-local không xung đột khi mount trong host. Mitigation: store remote dùng id riêng, không trùng `auth`/`layout`.
- **Over-engineer thư mục rỗng**: bám quyết định "tạo layer khi có nội dung" để tránh rác.
