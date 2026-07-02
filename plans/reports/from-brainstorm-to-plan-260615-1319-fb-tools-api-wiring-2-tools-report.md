# Brainstorm → Plan: Đấu API thật cho 2 tool TKQC (Đổi tên + Mở/Đóng TK)

> Nguồn tham chiếu chính: `/Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-shared-dependency/src/js/Facebook.js` (+ `Adscheck.js`) — implementation FB token + tool đã có sẵn, port sang TS.
> smitConnect gốc: `/Volumes/Workspace/smit/client-smit-vn/src/controller/global.js`.

## Problem statement
Tool panel TKQC (remote adaccounts) hiện UI-only — nút "Bắt Đầu" chỉ demo toast. Cần đấu logic + API FB thật. Gọi FB qua extension (mượn cookie, vượt CORS). Làm 2 tool đầu (Đổi tên, Mở/Đóng TK) verify pattern trước; logic đúng mới làm 15 tool còn lại.

## Scout findings (chốt)
- `smitConnect`/`global.js` ở repo **client-smit-vn** (JS thuần) — không import được sang project hiện tại (Vue3+TS+MFE). Lõi = `chromeFetch({url,options})` → extension fetch hộ.
- `Facebook.js` (repo adscheck) = implementation đầy đủ: lấy token (regex từ trang FB qua extFetch), `graph()`/`graphql()` helpers, và **2 tool đã có**: `onRenameAdaccount`, đóng/mở qua `graphql(doc_id)`.
- Project hiện tại chưa có gì về extension/FB token. `AdAccount` = `{id,name,status,budget,currency}` — thiếu `bm`.
- `account-selection` chỉ expose `selectedCount` (cần thêm `selectedAccounts`).
- `api-client.ts` chỉ gọi gateway SMIT, không gọi FB.

## Cơ chế token (từ Facebook.js — KHÔNG cần cmd extension riêng)
- `getFacebookToken({type})` = extFetch (proxy extension, credentials:include mượn cookie) tới URL FB → **regex** token:
  - type **B** (POWER_EDITOR): `adsmanager.facebook.com/adsmanager/` → `__accessToken="..."`
  - type **I** (ADS_MANAGER): `facebook.com/ajax/bootloader-endpoint/...` → `"access_token":"..."`
  - type **G** (BUSINESS_MANAGER): `business.facebook.com/content_management` → `"accessToken":"..."` (+ check 2FA)
  - đồng thời regex `fb_dtsg`, `fb_dtsg_ag` (từ `DTSGInitData`), `lsd` (từ `LSD`), `user_id` (`ACCOUNT_ID`/`USER_ID`), `name`.
- Token là của **user FB đang login trên browser** (1 user thao tác nhiều TKQC) — KHÔNG per-account.
- Facebook.js cache token AES trong `chrome.storage.local` TTL 6h → **vòng này BỎ cache** (KISS).

## Giải pháp chốt — port Facebook.js → TS, đặt `apps/adaccounts/src/api/`

```
ToolPanel "Bắt Đầu" → run-batch.ts (concurrency=Luồng, delay=Delay)
   ├→ tools/rename-account.ts     → fb-graph.graph()   (POWER_EDITOR token)
   └→ tools/open-close-account.ts → fb-graph.graphql()  (doc_id + fb_dtsg)
        fb-token.ts (getToken type B) ← fb-graph ← smit-connect.ts (extFetch → extension)
```

| File mới | Port từ | Nội dung |
|---|---|---|
| `api/smit-connect.ts` | Adscheck.smitConnectSend + extFetch | detect 2 EXTENSIONS (id+key port nguyên), `extFetch({url,options})` qua `chrome.runtime.sendMessage(id, {cmd:'fetch',url,options,key}, resolve)` |
| `api/fb-token.ts` | getFacebookToken({type:'B'}) | extFetch adsmanager → regex access_token/fb_dtsg/lsd/user_id. No cache. Trả `{access_token, fb_dtsg, lsd, user_id}` |
| `api/fb-graph.ts` | graph() + graphql() | graph(): REST, auto gắn access_token+format+locale; graphql(): POST api/graphql/ auto fb_dtsg+lsd, strip `for (;;);` |
| `api/tools/rename-account.ts` | onRenameAdaccount | graph('/act_<id>', POST, params{name}); wildcard `*`→digit random |
| `api/tools/open-close-account.ts` | graphql + doc_id (tài liệu) | Đóng: `BizKitSettingsDeactivateAdAccountMutation` doc_id `9895135750555877` vars `{adAccountID}`; Mở: `useBillingReactivateAdAccountMutation` doc_id `9984888131552276` (host adsmanager) |
| `api/run-batch.ts` | mới | pool concurrency=threads, delay giữa request; trả per-row `{account, ok, message}` |

**Sửa file có sẵn:**
- `AdAccount` type +`bm?: string`.
- `account-selection` thêm `selectedAccounts: AdAccount[]` (cạnh selectedCount).
- `ToolPanel.onStart` → gọi run-batch thật + render per-row result thay demo toast.

## Acceptance criteria
1. Bấm Bắt Đầu với tool Đổi tên + ≥1 TKQC chọn → gọi FB thật đổi tên, hiện per-row OK/lỗi.
2. Tool Mở/Đóng theo mode (open|close) → gọi đúng doc_id, per-row result.
3. Chạy hàng loạt theo Luồng (concurrency) + Delay (ms).
4. Không có extension/chưa login FB → báo lỗi rõ ràng (không crash).
5. typecheck + build + verify:all pass; chỉ đụng apps/adaccounts.

## Quyết định / đánh đổi
- **Port thay vì import:** Facebook.js ở repo khác + JS → port bản TS tối giản (chỉ phần cần cho 2 tool).
- **Bỏ token cache:** fetch token mỗi lần chạy (chậm ~1 request, đơn giản, không cần crypto-js + hardcode key).
- **Token POWER_EDITOR (type B):** đúng code mẫu rename; mở/đóng dùng graphql fb_dtsg.
- **2 tool phủ 2 lớp API** (REST + GraphQL doc_id) → verify trọn pattern cho 15 tool sau.

## Out-of-scope
15 tool còn lại · cache AES token · tab BM/Page · 2FA (type G) · retry/fallback chain.

## Rủi ro
- doc_id + regex token dễ vỡ khi FB đổi schema (chấp nhận — tài liệu ghi).
- Cần extension SMIT Connect cài + user login FB để chạy thật. Trước đó: wiring + UI đủ, lỗi token báo rõ.
- `EXTENSIONS` id+key là secret hardcode (giống Facebook.js/global.js) — port nguyên, không phát sinh rủi ro mới so với hệ hiện có.

## Hiển thị kết quả (chốt)
- Vòng đầu: **toast tổng** "Đã chạy N/M thành công" + **console.log** chi tiết per-row. Panel kết quả chi tiết / ghi trạng thái lên bảng TKQC để sau.

## Câu hỏi chưa giải quyết
1. `EXTENSIONS` id/key có cần đưa vào env thay vì hardcode? (Facebook.js hardcode — port nguyên vòng đầu, tách env sau nếu cần.)
