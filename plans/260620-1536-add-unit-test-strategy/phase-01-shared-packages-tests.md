---
phase: 1
title: "Test shared-* (ROI cao nhất)"
status: done
priority: P1
dependencies: [0]
---

# Phase 1: Test `shared-*` (ROI cao nhất, PR riêng cho packages)

## Overview
Test public API của `shared-store` (hệ số nhân rủi ro ×3 — singleton) + bù composable logic chưa phủ ở `shared-ui`. Bộ test = "hợp đồng public API" enforce luật additive-only.

## Requirements
- Functional: phủ logic phức tạp đã đọc trong code thật (one-shot 401, abort vs timeout, business-switch race, hasRole/hasFeature).
- Non-functional: KHÔNG test render. Test thuần logic + store action qua Pinia thủ công.

## Architecture

### `api-client.ts` — ưu tiên #1 (logic dễ sai, dùng chung toàn hệ)
Mock `globalThis.fetch`. Test các nhánh:
- **timeout vs aborted phân biệt đúng:** `timeout_ms` nhỏ → `ApiError.kind === "timeout"`, `is_transient === true`. Caller signal abort → `kind === "aborted"`.
- **401 one-shot:** đăng ký handler qua `setUnauthorizedHandler`, bắn nhiều 401 đồng thời → handler chạy **đúng 1 lần** (`unauthorized_in_flight` guard). Đăng ký handler mới → re-arm (gọi lại được).
- **error classification:** 401 → `kind "auth"`; 4xx/5xx khác → `kind "http"`; fetch reject network → `kind "network"`, `is_transient true`.
- **`is_transient` getter:** network/timeout = true; http/auth/aborted = false.
- **composeSignals:** 0 signal → undefined; 1 → chính nó; 2 → `AbortSignal.any` fire khi 1 cái fire.
- params → query string; body JSON hóa khi có data.

### `auth-store.ts` — ưu tiên #2 (Pinia thủ công, mock api-client)
- Mock module `./api-client` (`vi.mock`). `setActivePinia(createPinia())` mỗi test.
- **hasRole/hasFeature:** owner/full_permission → luôn true; role có trong list → true; roles null → false.
- **checkAuth:** transient error → rethrow (KHÔNG set logged-out); non-transient → `is_authenticated=false`, `user=null`.
- **initialize one-shot:** gọi 2 lần đồng thời → `checkAuth` chạy 1 lần (initialize_promise guard). Transient fail → `auth_error=true` + clear promise (gọi lại re-run).
- **setCurrentBusiness race:** gọi 2 lần liên tiếp → controller cũ `.abort()` trước khi tạo mới (stale response không ghi đè). Cần mock `localStorage`.
- **logout:** xóa STORAGE_KEY, reset state, set `window.location.href`. Mock `window.location`.

### `layout-store.ts` — nhẹ, hoàn thiện coverage
- setTitle / setHeaderSlot / setSidebarOpen cập nhật state đúng.

### `shared-ui` — mở rộng composable chưa phủ
- `use-range-copy-flow.ts`, `range-copy-presets.ts`, `use-table-range-selection.ts` (phần pure). KHÔNG test render component.

## Related Code Files
- Create: `packages/shared-store/src/__tests__/api-client.test.ts`
- Create: `packages/shared-store/src/__tests__/auth-store.test.ts`
- Create: `packages/shared-store/src/__tests__/layout-store.test.ts`
- Create: `packages/shared-ui/src/components/ui/table/composables/__tests__/use-range-copy-flow.test.ts` (+ presets/range-selection nếu pure)
- Modify: none (test-only; nếu code khó test thì DỪNG, hỏi user trước khi refactor shared)

## Implementation Steps
1. `api-client.test.ts` trước (ROI cao nhất, không cần Pinia): mock fetch + `AbortSignal.timeout`.
2. `auth-store.test.ts`: `vi.mock("./api-client")`, Pinia thủ công, mock localStorage/window.
3. `layout-store.test.ts`: nhanh, hoàn thiện.
4. Mở rộng `shared-ui` composable pure còn thiếu.
5. `pnpm --filter @mf2/shared-store test` + `--filter @mf2/shared-ui test` xanh.
6. Cập nhật feature doc liên quan nếu có (theo CLAUDE.md, sau khi xong).

## Success Criteria
- [ ] `api-client` test phủ: timeout/aborted/network/http/auth, 401 one-shot, is_transient, composeSignals.
- [ ] `auth-store` test phủ: hasRole/hasFeature, checkAuth transient, initialize one-shot, setCurrentBusiness abort race, logout.
- [ ] `layout-store` test phủ 3 setter.
- [ ] Đổi signature bất kỳ public API `shared-store` → có test đỏ (xác minh thủ công 1 lần).
- [ ] Toàn bộ test-only, KHÔNG sửa code shared (nếu phải sửa → dừng hỏi user).

## Risk Assessment
- **`AbortSignal.timeout`/`AbortSignal.any` trong jsdom:** Node 20 hỗ trợ; nếu jsdom thiếu thì dùng env `node` cho riêng file api-client (vitest cho phép `// @vitest-environment node` per-file).
- **Test khóa nhầm bug thành spec:** đọc comment code (giải thích invariant) để xác nhận hành vi ĐÚNG, không chụp mù.
- **PR-split:** đây là PR `packages/*` riêng. Config `shared-store` (G0) đi kèm PR này.
- **Sửa code shared để dễ test = vi phạm additive-only nếu không cẩn thận.** Nếu cần, DỪNG và hỏi user (theo quyết định plan).
