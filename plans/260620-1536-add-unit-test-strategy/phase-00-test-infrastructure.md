---
phase: 0
title: "Hạ tầng test"
status: done
priority: P1
dependencies: []
---

# Phase 0: Hạ tầng test

## Overview
Mỗi package cần test (`shared-store`, `adaccounts`) có thể chạy `pnpm test` với 1 quy ước chung. Chưa viết test logic, chỉ dọn đường.

## Requirements
- Functional: `pnpm --filter @mf2/shared-store test` và `pnpm --filter @mf2/adaccounts test` chạy được (pass kể cả khi mới có 0–1 test).
- Non-functional: KISS — mỗi package tự config, không root config tập trung. Không đụng logic app.

## Architecture
- Mẫu chuẩn = `packages/shared-ui/vitest.config.ts` (đã có): `include: ["src/**/*.test.ts"]`, `globals: true`.
- Env theo nhu cầu thật:
  - `shared-store`: `node` (api-client/store logic, nhanh) — NHƯNG auth-store dùng `localStorage` + `window.location` → cần `jsdom`. Chốt: `jsdom` cho `shared-store`.
  - `adaccounts`: `node` (api/composable thuần, mock mạng). Nâng `jsdom` chỉ khi 1 file cần DOM.
- `turbo.json`: thêm `test` task (`"test": {}`) để `turbo run test` gom được. CHƯA nối `verify:all`/CI (giai đoạn local).

## Related Code Files
- Create: `packages/shared-store/vitest.config.ts`
- Create: `apps/adaccounts/vitest.config.ts`
- Modify: `packages/shared-store/package.json` (thêm `"test": "vitest run"`, devDeps `vitest`, `jsdom`, `@vue/test-utils`? — KHÔNG, không test component; chỉ cần `vitest`, `jsdom`, `@pinia/testing` hoặc tạo pinia thủ công)
- Modify: `apps/adaccounts/package.json` (thêm `"test": "vitest run"`, devDep `vitest`)
- Modify: `turbo.json` (thêm `test` task)
- Modify: root `package.json` (tùy chọn: script `"test": "turbo run test"`)

## Implementation Steps
1. Copy `vitest.config.ts` từ `shared-ui` sang `shared-store`, đổi env phù hợp (`jsdom` vì có localStorage/window).
2. Thêm devDeps cho `shared-store`: `vitest`, `jsdom`. Pinia store cần test → tạo Pinia thủ công trong test (`createPinia`/`setActivePinia`), không cần lib mới.
3. Copy `vitest.config.ts` sang `adaccounts`, env `node`.
4. Thêm devDep `vitest` cho `adaccounts`.
5. Thêm `test` task vào `turbo.json`.
6. (Tùy chọn) root `package.json`: `"test": "turbo run test"`.
7. `pnpm install` rồi chạy thử `pnpm -r test` — xác nhận không vỡ.

## Success Criteria
- [ ] `pnpm --filter @mf2/shared-store test` chạy (0 test = pass).
- [ ] `pnpm --filter @mf2/adaccounts test` chạy (0 test = pass).
- [ ] `turbo run test` gom được cả `shared-ui` (đã có test).
- [ ] Không thêm dependency thừa (không `@vue/test-utils`, không jest).

## Risk Assessment
- **Phiên bản vitest lệch nhau giữa packages** → pin cùng version với `shared-ui` (`^2.1.8`).
- **PR-split (đã chốt Validation Session 1):** KHÔNG tạo PR G0 riêng. Config `shared-store` đi trong PR G1 (packages); config `adaccounts` đi trong PR G2 (apps). Việc "G0" ở đây là logic gộp, không phải PR độc lập.
- **`shared-store` đã có devDeps `pinia`+`vue`** (verified) → G0 chỉ cần thêm `vitest` + `jsdom`.

<!-- Updated: Validation Session 1 - G0 packaging gộp vào PR G1/G2, không PR riêng -->

