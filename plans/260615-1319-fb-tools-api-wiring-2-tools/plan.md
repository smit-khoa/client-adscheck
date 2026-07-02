---
title: "Đấu API FB thật cho 2 tool TKQC (Đổi tên + Mở/Đóng TK)"
status: completed
created: 260615-1319
source: brainstorm
brainstorm: plans/reports/from-brainstorm-to-plan-260615-1319-fb-tools-api-wiring-2-tools-report.md
blockedBy: []
blocks: []
---

# Đấu API FB thật cho 2 tool TKQC

Port logic FB từ `Facebook.js` (repo adscheck) sang TS trong `apps/adaccounts/src/api/`, đấu vào nút "Bắt Đầu" của tool panel. Làm 2 tool đầu (Đổi tên, Mở/Đóng TK) verify pattern; 15 tool còn lại làm sau khi logic đúng.

**Reference code:** `/Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-shared-dependency/src/js/Facebook.js` (+ `Adscheck.js`).
**Design doc:** [brainstorm report](../reports/from-brainstorm-to-plan-260615-1319-fb-tools-api-wiring-2-tools-report.md).

## Nguyên tắc cố định (không relitigate)
- Gọi FB qua extension (`chrome.runtime.sendMessage`, cmd `fetch`) — mượn cookie, vượt CORS. KHÔNG fetch FB trực tiếp.
- Token = của user FB đang login trên browser (1 user, nhiều TKQC) — KHÔNG per-account. Lấy bằng extFetch + regex (type B / POWER_EDITOR). KHÔNG cache vòng đầu.
- Chỉ đụng `apps/adaccounts` (+ types). KHÔNG đụng `packages/shared-*` (isolation rule).
- UI dùng shared-ui; theme token đã có trong adaccounts styles.css.

## Phases

| # | Phase | Status | Mô tả |
|---|-------|--------|-------|
| 1 | [Hạ tầng FB (extension + token + graph)](phase-01-fb-infra-extension-token-graph.md) | completed | Port smit-connect, fb-token, fb-graph |
| 2 | [2 tool + run-batch](phase-02-two-tools-and-run-batch.md) | completed | rename-account, open-close-account, run-batch concurrency |
| 3 | [Nối UI + verify](phase-03-wire-ui-and-verify.md) | completed | selectedAccounts, onStart thật, toast tổng, typecheck/build/verify |

## Key dependencies
- Phase 2 cần Phase 1 (token + graph helpers).
- Phase 3 cần Phase 2 (tool fns + run-batch).
- Runtime: cần extension SMIT Connect cài + user login FB để chạy thật (không chặn typecheck/build).

## Acceptance (toàn plan)
1. Bấm Bắt Đầu (Đổi tên / Mở-Đóng) với ≥1 TKQC chọn → gọi FB thật, toast "Đã chạy N/M thành công" + console log per-row.
2. Chạy hàng loạt theo Luồng (concurrency) + Delay (ms).
3. Không extension / chưa login FB → lỗi rõ ràng, không crash.
4. typecheck + build + verify:all pass; chỉ đụng apps/adaccounts.

## Out-of-scope
15 tool còn lại · cache AES token · tab BM/Page · 2FA (type G) · ghi trạng thái lên bảng TKQC · retry/fallback chain.
