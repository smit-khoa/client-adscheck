---
phase: 1
title: "Refactor shell về layout chuẩn + fold bug fixes"
status: completed
priority: P1
effort: "1-1.5d"
dependencies: []
---

# Phase 1: Refactor shell về layout chuẩn + fold bug fixes

## Overview
Đưa `apps/shell` về layout chuẩn (§2 design doc): tách `router/`. Fold các bug đã verify từ code review vào lớp api của shared-store. KHÔNG tạo `shell/src/api/` rỗng — shell hiện đã sạch (mọi API call nằm trong `auth-store`, components/pages không gọi `fetch`/`api_get` trực tiếp — verified). API-layer convention chỉ áp cho REMOTE khi có fetch thật.

<!-- Updated: Validation Session 1 - shell không có api call trực tiếp; helper 401/timeout đặt trong shared-store thay vì shell/src/api/; bỏ hẳn is_sync_asset -->

## Requirements
- Functional: auth flow giữ nguyên hành vi quan sát được (redirect, gating). 401 đẩy về login đúng 1 lần. Switch business nhanh không bị stale data. initialize() retry được sau lỗi mạng.
- Non-functional: `pnpm typecheck` + `pnpm build` xanh. Chữ ký `api()` không breaking (additive only).

## Architecture
- `shared-store/api-client.ts` (đây là "api layer" của hệ — cross-cutting, không đặt trong shell):
  - Thêm per-call timeout (AbortController) — optional param, additive.
  - Phân loại lỗi: network vs HTTP vs 401 (mở rộng `ApiError` hoặc thêm field — additive).
  - 401 handling tập trung: helper phát hiện 401 → trigger `auth.logout()` đúng 1 lần (guard cờ tránh gọi lặp khi nhiều request 401 đồng thời). Lưu ý hướng phụ thuộc: api-client không import auth-store (vòng lặp) → dùng callback/handler đăng ký, hoặc auth-store tự xử 401 từ error phân loại. Chốt khi cook.
- `shared-store/auth-store.ts`: cross-cutting state. Sửa:
  - `setCurrentBusiness`: dùng AbortController hủy request roles/onboarding cũ khi switch business nhanh; response cũ không ghi đè mới.
  - `fetchOnboardingProgress`: **BỎ HẲN field `is_sync_asset`** (cả hardcode lẫn branch comment). Đang xây khung xương, field này chưa dùng → gỡ khỏi `OnboardingProgress` type luôn (xem Phase liên quan shared-types — additive: chỉ remove field chưa ai dùng thật). Nếu type được app khác dùng → giữ optional, đừng phá.
  - `initialize_promise`: reset về null trong `catch` khi lỗi để cho phép retry (không chỉ reset ở logout).

## Related Code Files
- Modify: `packages/shared-store/src/api-client.ts` (additive: optional timeout, error phân loại, 401 hook)
- Modify: `packages/shared-store/src/auth-store.ts` (race setCurrentBusiness, bỏ is_sync_asset, initialize retry)
- Modify: `packages/shared-types/src/index.ts` (bỏ `is_sync_asset` khỏi `OnboardingProgress` — kiểm tra không app nào đọc field này trước)
- Move: `apps/shell/src/router.ts` → `apps/shell/src/router/index.ts`
- Verify imports: `main.ts` (import router), không đụng components

## Implementation Steps
1. `api-client.ts`: thêm optional timeout (AbortController) + phân loại lỗi network/HTTP/401 (additive, không đổi chữ ký call hiện có).
2. Cơ chế 401 tập trung: chọn hướng không tạo import vòng (handler đăng ký HOẶC auth-store đọc error phân loại). Chốt hướng khi cook.
3. `setCurrentBusiness`: dùng AbortController hủy request business cũ.
4. Bỏ hẳn `is_sync_asset` ở auth-store + gỡ khỏi `OnboardingProgress` type (verify không app nào dùng).
5. Reset `initialize_promise` khi lỗi để retry được.
6. Move `router.ts` → `router/index.ts`, cập nhật import trong `main.ts`.
7. `pnpm typecheck && pnpm build` (toàn workspace vì đụng shared-*).

## Success Criteria
- [ ] `api-client.ts` có timeout + phân loại lỗi; chữ ký call cũ không đổi (additive).
- [ ] 401 → logout chạy đúng 1 lần (test thủ công: giả lập 401).
- [ ] Switch business nhanh 2 lần: roles/onboarding khớp business cuối cùng.
- [ ] Lỗi mạng ở initialize → gọi lại initialize() chạy lại được (không kẹt).
- [ ] `is_sync_asset` bị gỡ hoàn toàn (auth-store + type), không app nào còn tham chiếu.
- [ ] router đã ở `router/index.ts`; typecheck + build toàn workspace xanh.

## Risk Assessment
- **Import vòng api-client↔auth-store**: api-client KHÔNG được import auth-store. Mitigation: handler đăng ký 401, hoặc auth-store đọc error đã phân loại. Chốt hướng cụ thể khi cook.
- **Gỡ `is_sync_asset` khỏi type**: phải verify không component/remote nào đọc field. Đã grep: chỉ auth-store set, Remote/home/ads_asset không dùng. An toàn, nhưng verify lại lúc cook.
- PR-split: shared-store + shared-types là 1 PR (cùng nhịp additive), merge trước; shell (move router) PR sau.
