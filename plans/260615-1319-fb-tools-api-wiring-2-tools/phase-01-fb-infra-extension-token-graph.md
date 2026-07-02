---
phase: 1
title: "Hạ tầng FB (extension + token + graph)"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Hạ tầng FB (extension + token + graph)

## Overview
Port lớp gọi extension + lấy token FB + 2 helper Graph/GraphQL từ `Facebook.js` sang TS. Đây là nền cho mọi tool.

## Requirements
- Functional: gọi được FB qua extension (mượn cookie); lấy được `access_token`+`fb_dtsg`+`lsd`+`user_id`; có `graph()` (REST) + `graphql()` (doc_id).
- Non-functional: TS strict pass; không đụng `packages/shared-*`; không thêm dep nặng (no crypto-js vòng này).

## Architecture
```
smit-connect.ts  → detect 2 EXTENSIONS, extFetch({url,options}) qua chrome.runtime.sendMessage(id,{cmd:'fetch',url,options,key},cb)
fb-token.ts      → getToken(): extFetch adsmanager → regex token bundle (type B). No cache.
fb-graph.ts      → graph(path,opts) REST; graphql(body,host) POST api/graphql/ (strip for(;;);)
```
- extFetch trả **string** (HTML/JSON text) — caller tự parse. graph() JSON.parse + bắt `res.error`. graphql() strip `for (;;);` (9 ký tự) rồi JSON.parse.
- Token bundle module-scoped (1 user/phiên); `getToken()` trả cached-in-memory nếu đã có, else fetch.

## Related Code Files
- Create: `apps/adaccounts/src/api/smit-connect.ts` (port Adscheck.smitConnectSend + extFetch)
- Create: `apps/adaccounts/src/api/fb-token.ts` (port getFacebookToken type B + regex)
- Create: `apps/adaccounts/src/api/fb-graph.ts` (port graph() + graphql())
- Create: `apps/adaccounts/src/api/types.ts` (FbTokenBundle, ExtFetchOptions, GraphResult)
- Reference (read-only, repo khác): Facebook.js L431-617 (getFacebookToken/graph/graphql), Adscheck.js L195-260 (smitConnectSend/extFetch)

## Implementation Steps
1. `smit-connect.ts`: hằng `EXTENSIONS` (id+key — port nguyên từ global.js/Adscheck.js). `detectExtension()` (sendMessage getManifest, timeout 200ms, thử lần lượt). `extFetch({url,options})` → ghép `options.params` vào URL query, bỏ body nếu GET, `sendMessage(id,{cmd:'fetch',url,options,key},resolve)`. Trả `Promise<string>`. Lỗi (không extension) → throw Error rõ ràng.
2. `fb-token.ts`: `getToken()` — extFetch `https://adsmanager.facebook.com/adsmanager/`, regex: `__accessToken="([^"]+)"` (access_token); `"DTSGInitData".*?"token":"(.*?)","async_get_token":"(.*?)"` (fb_dtsg, fb_dtsg_ag); `"LSD"(.*?)"token":"(.*?)"}` (lsd); `"ACCOUNT_ID":"(\d+)"|"USER_ID":"(\d+)"` (user_id). Xử lý type-B redirect (`window.location.replace("...")` → fetch tiếp). Throw nếu thiếu access_token/fb_dtsg. Cache in-memory (module ref), `resetToken()` để fetch lại.
3. `fb-graph.ts`:
   - `graph(path, {method, params, body, version='v24.0'})`: nếu path không bắt đầu `https`, ghép `graph.facebook.com/<version><path>`; tự gắn `access_token`(từ getToken)+`format=json&pretty=0&suppress_http_code=1&locale=en_US`; header `x-www-form-urlencoded`; body qs-encode. JSON.parse, bắt `res.error` → `{error,message,code}`.
   - `graphql({doc_id, variables, fb_api_req_friendly_name}, host='www')`: POST `https://<host>.facebook.com/api/graphql/`, body qs `{__a:1, fb_dtsg, lsd, locale:'en_US', ...body}`. Strip `for (;;);`. Bắt `data.error`.
4. `types.ts`: `FbTokenBundle {access_token, fb_dtsg, fb_dtsg_ag?, lsd, user_id}`, `GraphResult<T> = T | {error:true, message:string, code?:number}`.
5. Typecheck: `pnpm --filter @mf2/adaccounts typecheck`.

## Success Criteria
- [ ] `apps/adaccounts/src/api/{smit-connect,fb-token,fb-graph,types}.ts` tồn tại, typecheck pass.
- [ ] `extFetch` build đúng message shape `{cmd:'fetch',url,options,key}` (đối chiếu Adscheck.extFetch).
- [ ] `getToken()` regex đúng 4 nhóm (đối chiếu Facebook.js getFacebookToken type B).
- [ ] `graphql()` strip `for (;;);` (substring 9) trước parse.
- [ ] Không import `packages/shared-*`; không thêm dep.

## Risk Assessment
- Regex token vỡ khi FB đổi markup → cô lập trong fb-token, sửa 1 chỗ. Mitigations: copy chính xác regex từ Facebook.js (đã chạy thật).
- EXTENSIONS key là secret hardcode → port nguyên (giống hệ hiện có), không phát sinh rủi ro mới. Ghi chú để sau cân nhắc env.
- Không test runtime được nếu thiếu extension → typecheck + đối chiếu code mẫu là cổng vòng này.
