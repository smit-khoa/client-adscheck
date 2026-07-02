---
phase: 2
title: "2 tool + run-batch"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: 2 tool + run-batch

## Overview
Viết logic 2 tool (Đổi tên, Mở/Đóng TK) dùng helper phase 1, + runner chạy hàng loạt theo Luồng/Delay.

## Requirements
- Functional: rename + open/close gọi đúng endpoint/doc_id; run-batch chạy concurrency + delay, trả per-row result.
- Non-functional: mỗi tool 1 file <100 dòng; tách thuần (không import UI).

## Architecture
- Mỗi tool = 1 hàm `run(account, values) → Promise<{ok, message}>`.
- `run-batch(items, worker, {threads, delayMs}) → Promise<RowResult[]>`: pool concurrency = threads, delay giữa các lần khởi chạy; mỗi item gọi worker, bắt lỗi → `{account, ok:false, message}`.
- ToolPanel map `expandedFunction.id` → tool runner (registry nhỏ `{ 'rename': renameAccount, 'open-close-account': openCloseAccount }`).

## Related Code Files
- Create: `apps/adaccounts/src/api/tools/rename-account.ts` (port onRenameAdaccount)
- Create: `apps/adaccounts/src/api/tools/open-close-account.ts` (graphql doc_id)
- Create: `apps/adaccounts/src/api/run-batch.ts` (concurrency pool + delay)
- Create: `apps/adaccounts/src/api/tools/index.ts` (registry id→runner)
- Reference: Facebook.js L886-894 (onRenameAdaccount), L619-659 (graphql), tài liệu doc_id (xmeta-ads report)

## Implementation Steps
1. `rename-account.ts`: `renameAccount(account, values)` — newName = values.newName, wildcard `*`→`randomDigit` (port `randomNumberRange`). `graph('/act_<id>', {method:'POST', params:{name:newName}})`. OK nếu `res.success` hoặc không `res.error`. Trả `{ok, message}`. (Mode random/sequential: vòng đầu chỉ random — sequential để sau.)
2. `open-close-account.ts`: `openCloseAccount(account, values)` — mode `values.mode` (open|close). adAccountID = id bỏ prefix `act_`.
   - close: `graphql({fb_api_req_friendly_name:'BizKitSettingsDeactivateAdAccountMutation', doc_id:'9895135750555877', variables:JSON.stringify({adAccountID})}, 'business')`. OK nếu có `data.business_settings_deactivate_ad_account`.
   - open: `graphql({fb_api_req_friendly_name:'useBillingReactivateAdAccountMutation', doc_id:'9984888131552276', variables:JSON.stringify({input:{billable_account_payment_legacy_account_id:adAccountID, actor_id:user_id, client_mutation_id:'1'}})}, 'adsmanager')`. OK nếu response chứa `ADMARKET_ACCOUNT_STATUS_ACTIVE` hoặc không error.
   - (api v1/v2/auto từ form: vòng đầu map mode open/close trực tiếp; auto-fallback để sau.)
3. `run-batch.ts`: `runBatch(items, worker, {threads, delayMs})` — index pool: chạy tối đa `threads` worker song song, mỗi lần khởi chạy cách nhau `delayMs`. Trả `RowResult[] = {account, ok, message}[]`. Bắt mọi throw → `{ok:false, message:String(err)}`.
4. `tools/index.ts`: `TOOL_RUNNERS: Record<string, ToolRunner>` map `rename`/`open-close-account`. ToolRunner = `(account, values) => Promise<{ok,message}>`.
5. Typecheck.

## Success Criteria
- [ ] 3 file api/tools + run-batch tồn tại, typecheck pass.
- [ ] rename gọi `graph` POST act_<id> name=; open/close gọi đúng 2 doc_id + host (business/adsmanager).
- [ ] run-batch tôn trọng threads + delayMs; mọi lỗi thành RowResult, không reject cả batch.
- [ ] registry map đúng id tool (khớp catalog: `rename`, `open-close-account`).

## Risk Assessment
- doc_id mở TK (`9984888131552276`) + vars: lấy từ tài liệu MEOFB/xmeta — đối chiếu cả 2 report. Nếu vars sai → lỗi FB rõ ràng (bắt được). Mitigation: ghi rõ nguồn doc_id trong comment (không ref plan number — chỉ mô tả mutation).
- adAccountID prefix: rename dùng `act_<id>`, graphql dùng id trần — dễ nhầm. Ghi rõ trong code.
