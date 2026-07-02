---
phase: 2
title: "Test adaccounts (logic nghiệp vụ)"
status: done
priority: P2
dependencies: [0]
---

# Phase 2: Test `apps/adaccounts` (PR riêng cho apps)

## Overview
Test api + composable thuần của app lớn nhất. Trọng tâm logic rủi ro cao: chia lô chạy hàng loạt, xóa user. KHÔNG test `.vue`.

## Requirements
- Functional: phủ logic nghiệp vụ sai-là-hậu-quả-thật (`run-batch` concurrency, `remove-user-helpers` transform).
- Non-functional: mock `@mf2/shared-store` api; test pure ưu tiên.

## Architecture

### `api/run-batch.ts` — ưu tiên #1 (pure, worker inject được, ROI cao nhất app)
Không gọi mạng — `worker` là tham số. Test:
- **bounded concurrency:** đếm số worker chạy đồng thời ≤ `threads`. Inject worker đếm `inFlight`.
- **thread floor:** `threads=0`/âm/NaN → tối thiểu 1 lane (`Math.max(1, ...)`).
- **never rejects:** worker throw → `RowResult.ok=false`, `message` = error message; các account khác vẫn chạy.
- **kết quả đúng vị trí:** `results[index]` map đúng `accountId` theo thứ tự list gốc (dù hoàn thành xen kẽ).
- **delay:** `delayMs>0` → có chờ giữa các launch (dùng fake timers `vi.useFakeTimers`).
- **empty list:** `accounts=[]` → `[]`, không treo.

### `api/tools/remove-user-helpers.ts` — ưu tiên #2 (182 LOC, KHÔNG thuần)
**Verified:** import `graph` + `extFetch` (`remove-user-helpers.ts:1-2`) → không thuần. Chỉ `parseUids` + các transform (parse `AccountAdminContext`, `BatchGraphItem`) là pure.
- **Chỉ test phần pure** (đã chốt Validation S1): `parseUids` (regex UID, tách input), các hàm map/parse không gọi `graph`.
- Phần gọi `graph`/`extFetch`: mock tối thiểu hoặc bỏ; **ghi rõ phần không test + lý do** trong test file (comment) và Success Criteria.

### `stores/mode-store.ts` (21 LOC) — nhanh
Pinia thủ công, test state transition.

### Composable (test phần logic tách khỏi UI, nếu khả thi)
- `use-account-selection`, `use-tool-actions`, `use-bm-data-loader` — chỉ test nhánh logic thuần (selection math, payload build). Nếu dính reactive/lifecycle nặng → bỏ qua, không ép.

### api gọi mạng (`fb-token`, `open-close-account`, `rename-account`, `remove-user`)
**Verified:** lớp api `adaccounts` KHÔNG dùng `@mf2/shared-store`. Mạng đi qua `extFetch` (`smit-connect.ts` → Chrome extension proxy) + `graph`/`graphql` (`fb-graph.ts`).
- **Mock target đúng (đã chốt Validation S1):** `vi.mock` `../fb-graph` (`graph`) hoặc `../smit-connect` (`extFetch`) — KHÔNG mock shared-store.
- Test: build payload/params đúng, map kết quả `graph` → `{ok,message,patch}` đúng, lỗi/`GraphError` → `ok:false`. Đây là worker của `run-batch`.
- `fb-token.ts` (`getToken`/`resetToken`): test cache token + reset khi auth error (mock `extFetch`).

## Related Code Files
- Create: `apps/adaccounts/src/api/__tests__/run-batch.test.ts`
- Create: `apps/adaccounts/src/api/tools/__tests__/remove-user-helpers.test.ts`
- Create: `apps/adaccounts/src/stores/__tests__/mode-store.test.ts`
- Create (tùy mức pure): `apps/adaccounts/src/api/tools/__tests__/*.test.ts` cho các tool worker
- Modify: chỉ refactor tách pure transform NẾU code trộn fetch+logic (xem Unresolved trong plan.md) — hỏi user trước nếu thay đổi public contract.

## Implementation Steps
1. `run-batch.test.ts` trước (pure, fake timers). ROI cao nhất.
2. Test phần pure của `remove-user-helpers.ts` (`parseUids` + transform); ghi rõ phần gọi `graph` không test.
3. `mode-store.test.ts` nhanh.
4. Tool workers: mock `graph`/`extFetch` (KHÔNG shared-store), test payload + map kết quả.
5. Composable: chỉ phần logic thuần khả thi.
6. `pnpm --filter @mf2/adaccounts test` xanh.
7. Cập nhật feature doc adaccounts liên quan (theo CLAUDE.md).

## Success Criteria
- [ ] `run-batch` phủ: concurrency cap, thread floor, never-rejects, index mapping, delay, empty.
- [ ] `remove-user-helpers`: `parseUids` + transform pure có test; phần gọi `graph` ghi rõ lý do bỏ qua.
- [ ] `mode-store` state transition có test.
- [ ] Worker tool có ít nhất 1 test payload + 1 test map-kết-quả mỗi tool đụng tới, mock `graph`/`extFetch`.
- [ ] KHÔNG mock `@mf2/shared-store` (adaccounts không dùng); KHÔNG test render `.vue`.

## Risk Assessment
- **Mock target là `extFetch`/`graph` (không phải shared-store):** đây là lớp ranh giới mạng thật của adaccounts. Mặc định KHÔNG refactor để dễ test; chỉ test pure sẵn có + mock biên. Refactor tách pure chỉ khi user duyệt (đổi contract trong app → báo user).
- **Composable reactive khó test giòn:** không ép test, ghi rõ phần bỏ qua.
- **fake timers + Promise interleaving** dễ flaky: dùng `vi.advanceTimersByTimeAsync` cẩn thận.
- **PR-split:** PR `apps/*` riêng, built trên `shared-*` đã merge. Config `adaccounts` (G0) đi kèm PR này.

<!-- Updated: Validation Session 1 - mock target = extFetch/graph (không shared-store); remove-user-helpers chỉ test pure -->

