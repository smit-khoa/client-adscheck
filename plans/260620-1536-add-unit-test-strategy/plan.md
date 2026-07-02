---
title: "Thêm Unit Test theo lớp rủi ro cho SMIT Client MFE"
status: in_progress
created: 2026-06-20
branch: smit-khoa/feat-add-unit-test
source: plans/reports/brainstorm-260620-1536-unit-test-strategy-report.md
blockedBy: []
blocks: []
---

# Plan: Thêm Unit Test theo lớp rủi ro cho SMIT Client MFE

## Bối cảnh

Codebase MFE (Vue 3 + Module Federation 2.0) gần như không có test. Chỉ `shared-ui` có 4 file test (table composables). Vùng rủi ro cao nhất — `shared-store` (MF singleton, 1 lỗi sập 3 app) — chưa có test nào. Plan này thêm test theo **hệ số nhân rủi ro**, ưu tiên pure logic, chạy local trước (CI để sau).

Nguồn brainstorm: `plans/reports/brainstorm-260620-1536-unit-test-strategy-report.md`

## Quyết định cố định (không relitigate)

- **Chỉ test pure logic** — composable/api transform/store action. KHÔNG test render `.vue` (giòn, ROI thấp trong MFE).
- **Mỗi package tự config vitest** — không tạo root config tập trung (KISS, đúng pattern hiện có của `shared-ui`).
- **PR-split bắt buộc** (luật CLAUDE.md): G1 (`packages/*`) và G2 (`apps/*`) là **2 PR tách biệt**, không trộn.
- **Chạy local trước** — chưa nối CI. Nhưng nối CI ngay sau G1 là khuyến nghị mạnh (test không CI dễ mục).
- Không chạy theo coverage %. Mục tiêu: phủ public API `shared-*` + logic nghiệp vụ rủi ro cao của `adaccounts`.

## Phases

| Phase | Tên | Scope | PR | Priority | Status |
|-------|-----|-------|-----|----------|--------|
| 0 | Hạ tầng test | `shared-store`, `adaccounts` configs + turbo | **config gộp vào PR G1/G2** (không PR riêng) | P1 | done |
| 1 | Test `shared-*` | `shared-store` + mở rộng `shared-ui` | PR packages | P1 | done |
| 2 | Test `adaccounts` | api + composable thuần | PR apps | P2 | done |
| 3 | (để ngỏ) E2E + nối CI | Playwright + turbo/CI gate | sau | P3 | pending |

Dependencies: G1 blockedBy G0 · G2 blockedBy G0 · G3 blockedBy G1,G2

> **CI:** nối CI **ngay sau G1** (không đợi hết G2) — xem G3. `.github/workflows/` hiện chưa tồn tại, tạo mới.

## Acceptance criteria (toàn plan)

- [x] `pnpm --filter @mf2/shared-store test` chạy được, xanh (32 tests).
- [x] Public API `shared-store` (api-client 401/timeout/abort, auth-store, layout-store) có test; đổi signature → đỏ.
- [x] `pnpm --filter @mf2/adaccounts test` chạy được (38 tests); `run-batch` đầy đủ + `remove-user-helpers` phần pure có test.
- [x] `turbo run test` gom được test mọi package có test (shared-store 32 + shared-ui 67 + adaccounts 38 = 137).
- [x] Không có test nào test render `.vue` (giữ đúng quyết định).
- ( ) G3 (nối CI + E2E) chưa làm — chờ quyết định Sếp.

## Phase files

- [phase-00-test-infrastructure.md](phase-00-test-infrastructure.md)
- [phase-01-shared-packages-tests.md](phase-01-shared-packages-tests.md)
- [phase-02-adaccounts-logic-tests.md](phase-02-adaccounts-logic-tests.md)
- [phase-03-e2e-and-ci-gate.md](phase-03-e2e-and-ci-gate.md)

## Unresolved questions

- (đã chốt) ~~Mốc nối CI~~ → **ngay sau G1**.
- Có refactor tách pure transform khỏi api `adaccounts` nếu cần? → mặc định KHÔNG; chỉ test phần pure sẵn có, mock `extFetch`/`graph` cho worker. Refactor chỉ khi user duyệt.

## Validation Log

### Session 1 — 2026-06-20

**Verification Results (tier: Standard, 4 phases)**
- Claims checked: 6 | Verified: 4 | Failed: 2 | Unverified: 0
- FAILED #1 — G2 ghi "mock `api`/`api_post` từ `@mf2/shared-store`". Code thật: `apps/adaccounts/src/api/` KHÔNG import shared-store; gọi mạng qua `extFetch` (`smit-connect.ts` → Chrome extension proxy) + `graph`/`graphql` (`fb-graph.ts`). → **Sửa mock target sang `extFetch`/`graph`.**
- FAILED #2 — G2 ghi `remove-user-helpers.ts` "khả năng cao pure". Code thật: import `graph` + `extFetch` (`remove-user-helpers.ts:1-2`), KHÔNG thuần. Chỉ `parseUids` + transform là pure. → **Hạ phạm vi: chỉ test phần pure.**
- VERIFIED — `run-batch.ts` pure, worker inject được (test concurrency OK).
- VERIFIED — `shared-store` đã có devDeps `pinia`+`vue` (G0 chỉ cần thêm `vitest`+`jsdom`).
- VERIFIED — `auth-store`/`api-client` logic phức tạp đáng test (401 one-shot, abort/timeout, business-switch race).
- VERIFIED — `.github/workflows/` chưa tồn tại → G3 tạo CI từ đầu.

**Quyết định từ interview**
1. G2 mock target → mock `extFetch`/`graph` (đúng lớp ranh giới mạng adaccounts).
2. `remove-user-helpers` → chỉ test phần pure; ghi rõ phần bỏ qua + lý do.
3. Nối CI → ngay sau G1.
4. G0 packaging → gộp config vào PR G1/G2; KHÔNG có PR G0 riêng (tránh trộn packages+apps).

### Whole-Plan Consistency Sweep
- Đã rà `plan.md` + 4 phase file. Sửa: G0 packaging (plan.md + phase-00), G2 mock target (phase-02), helpers scope (phase-02), CI timing (phase-03 + plan.md note).
- Không còn mâu thuẫn tồn đọng. Plan đủ điều kiện cook.
