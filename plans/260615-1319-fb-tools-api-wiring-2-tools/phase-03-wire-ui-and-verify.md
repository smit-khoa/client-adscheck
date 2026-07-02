---
phase: 3
title: "Nối UI + verify"
status: pending
priority: P1
effort: "2h"
dependencies: [2]
---

# Phase 3: Nối UI + verify

## Overview
Nối nút "Bắt Đầu" vào run-batch thật: resolve TKQC đã chọn, lấy Luồng/Delay, chạy tool đang mở, toast tổng + console log. Verify toàn bộ.

## Requirements
- Functional: bấm Bắt Đầu → chạy tool đang expand qua các TKQC đã chọn; toast "Đã chạy N/M thành công"; console.log per-row.
- Non-functional: giữ decoupling account-selection (selection theo id, resolve account ở nơi có data); typecheck+build+verify:all pass.

## Architecture
- **Giữ account-selection theo id** (KHÔNG thêm selectedAccounts vào store — phá decoupling). Resolve `selectedIds → AdAccount[]` tại nơi có cả 2: `AdAccountsPage`/`BasicModeView` đã có account data; truyền `selectedAccounts` (computed) xuống ToolPanel qua prop, hoặc ToolPanel đọc account-list + account-selection cùng lúc.
  - Quyết định: ToolPanel nhận `selectedAccounts: AdAccount[]` qua prop từ BasicModeView (nơi mount ToolPanel + có account-list). KISS, không phá tách lớp.
- `AdAccount` +`bm?: string` (open/close cần adAccountID = id trần; bm cho tool sau).
- `onStart`: lấy `expandedFunction`, `formValues`, `selectedAccounts`, `threads/delayMs` (từ use-tool-runner-settings) → `runBatch(selectedAccounts, (acc)=>TOOL_RUNNERS[fn.id](acc, formValues), {threads, delayMs})` → đếm ok → emit toast tổng + console.table.

## Related Code Files
- Modify: `apps/adaccounts/src/features/account-list/types/account-list.types.ts` (+`bm?`)
- Modify: `apps/adaccounts/src/features/basic-mode/pages/BasicModeView.vue` (resolve selectedAccounts, pass prop)
- Modify: `apps/adaccounts/src/features/tool-actions/components/ToolPanel.vue` (prop selectedAccounts, onStart gọi runBatch)
- Modify: `apps/adaccounts/src/features/tool-actions/composables/use-tool-runner-settings.ts` (đã có threads/delayMs — chỉ import)
- Read: account-list composable (lấy AdAccount[] để resolve id)

## Implementation Steps
1. `AdAccount` +`bm?: string`.
2. `BasicModeView`: dùng account-list (AdAccount[]) + account-selection (selectedIds) → computed `selectedAccounts = accounts.filter(a => selectedIds.has(a.id))`. Pass `:selected-accounts` vào ToolPanel. (ToolPanel hiện chỉ nhận selectedCount — đổi/ thêm prop.)
3. `ToolPanel`: prop `selectedAccounts: AdAccount[]`; `selectedCount = selectedAccounts.length` (bỏ phụ thuộc account-selection trực tiếp hoặc giữ count, thêm accounts). `onStart` async: guard 0 → cảnh báo; lấy `{threads, delayMs}`; `runBatch` với `TOOL_RUNNERS[expandedFunction.id]`; toast `Đã chạy <ok>/<total> thành công · <label>`; `console.table(results)`. Disable nút khi đang chạy (ref `running`).
4. Xử lý lỗi token/extension: runBatch worker throw (no extension / token fail) → mỗi row `{ok:false, message}`; toast vẫn hiện "0/N", console rõ lỗi. Không crash UI.
5. Verify: `pnpm --filter @mf2/adaccounts typecheck`; production bundle; `pnpm verify:all`. Cập nhật feature doc `adaccounts-tool-actions.md` (APIs used: FB qua extension; thêm api/ files; gotcha token/extension). Cập nhật `.claude/features/README.md` nếu thêm feature doc mới cho api layer (cân nhắc: ghi trong tool-actions doc là đủ).

## Success Criteria
- [ ] Bấm Bắt Đầu (tool đang mở) → runBatch chạy, toast tổng N/M, console per-row.
- [ ] Luồng/Delay áp dụng (đọc từ use-tool-runner-settings).
- [ ] selectedAccounts resolve đúng từ id; account-selection store KHÔNG bị thêm account data.
- [ ] Không extension → row lỗi rõ, không crash.
- [ ] typecheck + build + verify:all pass; chỉ apps/adaccounts đụng.
- [ ] feature doc cập nhật.

## Risk Assessment
- Đổi prop ToolPanel (selectedCount → selectedAccounts) đụng BasicModeView — blast radius nhỏ (1 nơi mount). Walk: chỉ BasicModeView render ToolPanel.
- Resolve selectedAccounts ở BasicModeView cần account-list data sẵn — đã có (AdAccountTable dùng cùng). Xác nhận composable account-list expose accounts.
- Runtime thật cần extension + login FB — verify tự động chỉ tới typecheck/build; chạy thật Sếp test tay (ghi rõ trong report).
