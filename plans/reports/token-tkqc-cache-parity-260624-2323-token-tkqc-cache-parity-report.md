---
type: brainstorm-report
created: 2026-06-24
scope: token-tkqc-cache-parity
status: advisory
---

# Token/TKQC/Cache Parity Analysis

## Summary

Em đã so sánh luồng hiện tại trong `apps/adaccounts` với bản cũ tại `/Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-shared-dependency`.

Kết luận ngắn:

- Luồng token hiện tại đã port được phần lõi: `token_b`, `token_g`, `token_i`, `token_graphql`, cache 6h, Graph REST/GraphQL qua SMIT Connect extension.
- Luồng TKQC hiện tại mạnh hơn bản cũ ở vài điểm: tách seed/detail/payment/hidden-limit/check-hold queue, cache theo `user_id`, lỗi từng nhóm không làm rớt toàn bảng.
- Có 4 rủi ro parity lớn cần sửa/kiểm chứng trước khi tin là tương đương bản cũ:
  1. `token_i` và `token_graphql` không lưu session metadata (`user_id`, `fb_dtsg`, `lsd`) khi tự fetch.
  2. Luồng Graph REST mặc định dùng `token_b`, trong khi bản cũ dùng `AUTO` cho load TKQC/BM, ưu tiên `token_i -> token_b -> token_g`.
  3. Batch TKQC đang bypass `fb-graph.ts`, nên không có retry đổi token khi OAuth stale.
  4. BM legacy status/quality hiện tại có khả năng sai variables/parse so với bản cũ.

## Evidence read

### Bản mới

- `apps/adaccounts/src/api/fb-token.ts`: lấy `token_b` từ Ads Manager, parse `__accessToken`, `fb_dtsg`, `lsd`, `user_id`, cache 6h trong extension storage.
- `apps/adaccounts/src/api/fb-token-cache.ts`: lưu `adscheck_data` dạng JSON, slot `token_b|token_g|token_i|token_graphql`, TTL 6h.
- `apps/adaccounts/src/api/fb-token-auto.ts`: lấy `token_i` từ `AdsCanvasComposerDialog.react`.
- `apps/adaccounts/src/api/fb-token-graphql.ts`: lấy `token_graphql` từ `ReactComposerStatusEagerAttachment.react`.
- `apps/adaccounts/src/api/fb-bm-token.ts`: lấy `token_g` qua GraphQL `doc_id=6805088329501573` với `businessID=1347771445924940`.
- `apps/adaccounts/src/api/fb-graph.ts`: Graph REST có token policy + reset/retry một lần khi auth error; GraphQL dùng session `fb_dtsg + lsd`, hoặc legacy `access_token` khi `tokenPurpose='legacyGraphql'`.
- `apps/adaccounts/src/features/adaccounts/api/load-adaccounts-flow.ts`: TKQC seed -> detail batch -> payment batch -> hidden-limit GraphQL -> check-hold GraphQL -> merge rows.
- `apps/adaccounts/src/features/adaccounts/api/adaccount-batch.ts`: batch POST raw tới `https://graph.facebook.com/v24.0` bằng `getToken()`.
- `apps/adaccounts/src/features/businesses/composables/use-bm-data-loader.ts`: BM base-first, extension-storage cache 30m có `user_id`, session cache theo `bm:{bmId}:{group}`.

### Bản cũ

- `src/js/Facebook.js`: `onHandleGetParams({ type })` map:
  - `token_i` -> type `I` -> `ads_manager_token`
  - `token_b` -> type `B` -> `power_editor_token`
  - `token_g` -> type `G` -> `business_manager_token`
  - `token_graphql` -> type `Q` -> `token_graphql`
- `src/js/Facebook.js`: cache hợp lệ khi `decrypted_data.user_id === this.user_id` và token date < 6h; nếu token rỗng thì xóa `adaccount_cached`, `bm_cached`, `page_cached`, last cache keys.
- `src/js/Facebook.js`: Graph token `AUTO` chọn `ads_manager_token || power_editor_token || business_manager_token`.
- `src/vue/mixins/LoadInsightData.js`: load TKQC/BM dùng `token: "AUTO"`; BM type/status/quality dùng `token: "TOKEN_GRAPHQL"` qua Graph REST `/graphql`/batch.

## Current flow map

### 1. Session/extension layer

Bản mới vẫn đi đúng hướng: toàn bộ FB calls qua extension `extFetch`, không gọi trực tiếp từ page. Extension storage dùng key `adscheck_data`.

Khác biệt quan trọng:

| Điểm | Bản cũ | Bản mới | Nhận định |
|---|---|---|---|
| Storage encoding | AES obfuscation qua `adscheck.encrypt/decrypt` | JSON trực tiếp trong extension storage | Đã được ghi nhận intentional. Không phải parity bug nếu Sếp chấp nhận trade-off. |
| Cache user guard | Token cache check `decrypted_data.user_id === this.user_id` | `readCachedToken(slot, expectedUserId?)`; nhiều chỗ không truyền expected user | Có rủi ro cross-account cho slot không có expected user. |
| Token invalidation side effect | Token rỗng thì xóa cache adaccount/BM/page legacy | Reset token chỉ zero slot token | Bản mới tốt hơn nếu có user-scoped row cache, nhưng cache cũ không tự xóa khi token stale. |

### 2. Token slots

#### `token_b` / POWER_EDITOR

Bản mới khá sát bản cũ:

- URL giống: `https://adsmanager.facebook.com/adsmanager/`.
- Regex chính giống: `__accessToken`.
- Có follow `window.location.replace(...)` một lần như bản cũ.
- Lưu `fb_dtsg`, `fb_dtsg_ag`, `lsd`, `user_id`.

Rủi ro nhỏ:

- `parseTokens()` yêu cầu đủ `access_token + fb_dtsg + lsd + user_id`. Bản cũ chỉ fail cứng nếu thiếu `fb_dtsg` hoặc `access_token`; `lsd/user_id` có thể null nhưng vẫn trả object. Bản mới strict hơn, có thể fail trên markup FB thiếu `ACCOUNT_ID/USER_ID` dù token vẫn dùng được.

#### `token_i` / AUTO / Ads Manager token

Bản mới có helper riêng `fb-token-auto.ts`, nhưng khác bản cũ ở điểm lớn:

- Bản cũ khi lấy token type `I` bằng `getFacebookToken({ type: 'I' })` cũng parse thêm `user_id`, `fb_dtsg`, `lsd`, `name`, `fb_dtsg_ag`, rồi `onHandleGetParams()` ghi toàn bộ session metadata vào `adscheck_data`.
- Bản mới `getAutoToken()` chỉ ghi `token_i` vào cache, không kèm session metadata.

Tác động:

- Nếu `token_i` được fetch trước `token_b`, storage có thể có `token_i` nhưng thiếu `user_id`, khiến `readCachedToken('token_i')` không guard theo đúng user.
- `readGraph({ readPreference:'auto' })` có thể dùng token_i cũ của account khác nếu storage chưa có `user_id` hoặc caller không truyền expected user.

Hiện tại em chưa thấy nơi production gọi `readPreference:'auto'`, nên rủi ro này là **latent** (nằm chờ) hơn là bug đang chắc chắn xảy ra trong TKQC list.

#### `token_g` / BUSINESS_MANAGER

Bản mới đã port đúng hướng từ `getTokenBm()`:

- Dùng GraphQL `doc_id=6805088329501573`.
- Variables giữ `businessID=1347771445924940`, `overridePrimaryBusinessLocationEligibility=false`.
- Đọc `data.business.bizKitSettingsConfig.apiAccessToken`.

Rủi ro:

- Bản mới comment đã tự ghi: `businessID` cố định này “still needs live confirmation”. Đây là rủi ro parity thật: nếu constant này không universal, token_g sẽ fail hoặc trả token không phù hợp trên vài VIA/account.
- Bản cũ còn check 2FA khi scrape type `G` từ `business.facebook.com/content_management`, dù luồng thực tế `onHandleGetParams` cho `G` hiện dùng `getTokenBm()`. Bản mới không có trạng thái `need_2fa`, chỉ throw lỗi chung.

#### `token_graphql` / TOKEN_GRAPHQL

Bản mới có `getLegacyGraphqlToken()` nhưng parse khác bản cũ:

- Bản cũ `getTokenUseGraphQL()` regex cố định: `"accessToken":"EAAHULp..."`.
- Bản mới regex rộng hơn: `"access_token"` hoặc `access_token[:=]...`, nhưng không match rõ `"accessToken":"..."` camelCase.

Đây là điểm **đáng nghi nhất**:

- Nếu endpoint cũ vẫn trả `accessToken` camelCase như bản cũ expect, bản mới có thể không lấy được `token_graphql`.
- Trong khi BM legacy type/status/quality hiện tại phụ thuộc `tokenPurpose: 'legacyGraphql'`.

## TKQC call flow comparison

### Seed discovery

Bản cũ:

- `loadRoleAndId()` gọi `/me/adaccounts` với `token: 'AUTO'`, fields `name,account_id,account_status,users`, có `summary=1`.
- Nếu load theo IDs thì batch `/act_<id>?fields=name,account_id,account_status,users` cũng bằng `token: 'AUTO'`.

Bản mới:

- `source=all`: gọi `/me/adaccounts` + `/me/businesses`, rồi từng BM `/{bm_id}` để lấy `owned_ad_accounts/client_ad_accounts`.
- Fields seed nhẹ hơn: `name,account_id,account_status,owner_business`.
- Không lấy `users` ở seed; admin chuyển sang detail batch.

Nhận định:

- Thiết kế mới tốt hơn cho tải rộng vì seed nhẹ + detail batch riêng.
- Parity khác: bản cũ user role (`user_role_text/int`) có ngay từ seed `users`; bản mới tính `ownership/adminCount` bằng `userpermissions.user(<uid>)` + users trong detail. Nếu Graph trả `userpermissions` khác `users`, quyền hiển thị có thể lệch.

### Detail/payment fields

Bản cũ:

- Detail chọn field theo quyền: nếu `user_role_int` thuộc ADMIN_NUMBER thì lấy `BASIC + ADMIN`, nếu không chỉ `BASIC`.
- Dùng `AUTO` cho batch.

Bản mới:

- `buildDetailFields()` luôn thêm admin fields khi config `admin=true`; không phụ thuộc role seed.
- Batch dùng `getToken()` trực tiếp => `token_b`, không phải `AUTO`.

Nhận định:

- Bản mới có thể lấy nhiều field hơn bản cũ khi user không phải admin; lỗi từng response được parse nhưng không làm rớt toàn bộ.
- Tuy nhiên token dùng khác: bản cũ `AUTO` ưu tiên `token_i`; bản mới batch hardcode `token_b`. Nếu một số VIA “token_i chạy, token_b lỗi” thì bản mới thiếu cơ chế fallback.

### Auth retry / stale token

Bản mới `graph()` có logic reset token và retry một lần khi FB trả code `190/102/463/467` hoặc message chứa session/login.

Nhưng `adaccount-batch.ts` không dùng `graph()` mà tự `extFetch` raw với `getToken()`:

- Nếu token_b stale, batch có thể trả lỗi OAuth trong body từng response.
- `runAccountBatch()` hiện chỉ map lỗi vào row/payment, không reset token/refetch/retry với token mới.

Đây là bug/thiếu sót thực tế cho TKQC detail/payment.

### Hidden limit / Check hold

Bản mới có thêm hai queue GraphQL:

- Hidden limit: `doc_id=6401661393282937`.
- Check hold: `doc_id=6975887429148122`, dùng `legacy_account_id` từ hidden-limit nếu có.

Bản cũ `LoadInsightData.js` chưa thấy flow tương đương trong đoạn chính. Nhiều khả năng đây là parity với nguồn khác/Adscheck mới hơn, không phải v6 shared dependency này.

Rủi ro:

- Dùng session GraphQL (`fb_dtsg + lsd` từ `token_b`) thay vì legacy `TOKEN_GRAPHQL`. Nếu doc_id này cần session web token thì đúng; nếu cần token_graphql thì sẽ fail. Cần live sample xác nhận.

## BM data comparison

### Base BM list

Bản cũ:

- `onGetBmGraph()` gọi `/me/businesses` với `token: 'AUTO'`, fields từ `bm.basic_fields`, limit 500 khi Max.

Bản mới:

- `fetchBmBaseRows()` ưu tiên `/me?fields=businesses.limit(...){...}`, fallback `/me/businesses` nếu rows rỗng.
- Dùng Graph REST mặc định `readGraph` => `token_b`.

Nhận định:

- Bản mới có fallback tốt hơn ở endpoint.
- Nhưng token vẫn không giống: bản cũ dùng `AUTO`, bản mới mặc định `token_b`.

### BM type/status/quality legacy

Bản cũ:

- BM type: `graph('/graphql', token:'TOKEN_GRAPHQL')`, `doc_id=32061067960207573`, variables `{ businessID: item.account_id, overridePrimaryBusinessLocationEligibility:false }`, parse newline chunks tìm `num_business_user`, `ad_account_creation_limit`, set `bm_type = BM ${ad_account_creation_limit}`.
- BM status + quality: batch Graph `/graphql`, `doc_id=3920367411328805`, variables `{ entity_id: item.id, action:null }`.
  - status: `body.data.data.isRestricted` => Restricted/Live.
  - quality: `body.data.isRestricted` => ⛔️ Hạn chế/✅ Tốt.

Bản mới:

- `fetchBmLegacyType()` dùng `graphql(..., { tokenPurpose:'legacyGraphql' })`, variables chỉ `{ businessID: bmId }`, parse string bằng key generic `business_type/businessType/type/tier`.
- `fetchBmLegacyQuality()` dùng same `doc_id=3920367411328805`, nhưng variables `{ businessID: bmId }`, parse generic keys `quality/status/appeal_status/restriction_status`.

Đây là sai khác lớn nhất về BM legacy:

- `doc_id=3920367411328805` ở bản cũ dùng `entity_id`, không phải `businessID`.
- Parser bản mới không đọc đúng path `data.isRestricted` / `data.data.isRestricted` mà bản cũ dùng.
- BM type bản mới không đọc `ad_account_creation_limit`, nên có thể không ra `BM50/BM350/BM1` đúng format.

## Cache comparison

### Token cache

| Điểm | Bản cũ | Bản mới | Đánh giá |
|---|---|---|---|
| TTL | 6h | 6h | OK |
| Storage key | `adscheck_data` encrypted | `adscheck_data` JSON | Intentional trade-off |
| Per token date | Có | Có | OK |
| User guard | `decrypted_data.user_id === this.user_id` | Optional expected user | Chưa đều |
| Session metadata update | Mọi token fetch qua `onHandleGetParams` đều merge metadata | `token_b` có metadata, `token_i/token_graphql/token_g` ít/không có | Thiếu parity |

### TKQC/BM row cache

Bản mới tốt hơn bản cũ ở điểm user-scoped:

- TKQC cache `v8_adaccount_cached` có `{ user_id, saved_at, data }` và TTL 30m.
- BM cache `v8_bm_rows_cached` có `{ user_id, saved_at, data:{ rows, activeConfig } }` và TTL 30m.
- Legacy raw-array cache chỉ trust khi không resolve được current user.

Rủi ro còn lại:

- `getCurrentUserId()` gọi `getToken()`; nếu `token_b` fail dù user FB vẫn login và `token_i` dùng được, cache hydration sẽ không biết user id. Khi đó legacy raw cache có thể được trust, hoặc cache mới có `user_id` mismatch không check được.
- Khi reset token vì auth error, bản mới không clear row cache. Nhờ user-scoped cache thì ít nguy hiểm hơn bản cũ, nhưng sau logout/login nhanh vẫn cần verify bằng live.

## Findings

### F1 — High: `token_graphql` parser có thể không match bản cũ

**Evidence:** bản cũ regex `"accessToken":"EAAHULp..."`; bản mới regex `"access_token"` hoặc `access_token` dạng lowercase.

**Impact:** BM legacy type/quality/status có thể fail hoàn toàn khi cần `TOKEN_GRAPHQL`.

**Recommendation:** thêm support camelCase `accessToken`, đặc biệt prefix `EAAHULp`, trong `fb-token-graphql.ts`. Giữ regex hiện tại làm fallback.

### F2 — High: BM legacy variables/parser lệch bản cũ

**Evidence:** bản cũ `doc_id=3920367411328805` dùng `{ entity_id, action:null }`; bản mới dùng `{ businessID }`. Bản cũ parse `isRestricted`; bản mới tìm generic `quality/status` keys.

**Impact:** cột legacy quality/status có thể trống/sai; BM type có thể không ra `BM<number>`.

**Recommendation:** nếu mục tiêu là parity v6, sửa `fetch-bm-legacy.ts` theo variables/path cũ:

- Type: include `overridePrimaryBusinessLocationEligibility:false`, parse newline chunks, lấy `ad_account_creation_limit` -> `BM${limit}`.
- Quality/status: variables `{ entity_id: bmId, action:null }`, parse `isRestricted` theo đúng path cũ.

### F3 — Medium/High: Graph REST/TKQC/BM mặc định không còn `AUTO` fallback

**Evidence:** bản cũ load TKQC/BM đều `token:'AUTO'` = `token_i || token_b || token_g`; bản mới default `readGraph` -> `token_b`.

**Impact:** một số VIA/account trước đây chạy nhờ `token_i` có thể fail ở bản mới.

**Recommendation:** không đổi toàn bộ ngay. Thêm fallback có kiểm soát:

- Cho list/base read calls dùng `tokenPolicy: { readPreference:'auto' }` sau khi fix user guard token_i.
- Hoặc khi `token_b` trả auth/permission lỗi, retry một lần với `token_i`, rồi mới fail.

### F4 — Medium: `adaccount-batch.ts` bypass auth retry của `fb-graph.ts`

**Evidence:** batch POST raw dùng `getToken()` + `extFetch`, không reset token khi body lỗi OAuth.

**Impact:** token_b stale sẽ biến thành nhiều row lỗi, không tự refresh như `graph()`.

**Recommendation:** centralize batch token resolution hoặc detect OAuth error trong batch body:

- Nếu nhiều response body có code `190/102/463/467`, `resetToken()` rồi retry batch một lần.
- Không retry từng row vô hạn; giữ KISS.

### F5 — Medium: `token_i`/`token_graphql` cache thiếu user/session metadata

**Evidence:** bản mới `writeCachedToken('token_i', token)` và `writeCachedToken('token_graphql', token)` không truyền `session`. Bản cũ luôn merge metadata từ token_result/decrypted/session.

**Impact:** token slot có thể không gắn user rõ ràng; khó guard cache đúng FB user.

**Recommendation:** khi fetch token_i/token_graphql, parse thêm `user_id/fb_dtsg/lsd/name` nếu response có, hoặc gọi session bootstrap nhẹ trước khi ghi token.

### F6 — Low/Medium: `parseTokens()` cho `token_b` strict hơn bản cũ

**Evidence:** bản mới require `lsd` và `user_id`; bản cũ chỉ hard fail khi thiếu `fb_dtsg/access_token`.

**Impact:** Có thể fail token fetch dù access token vẫn usable nếu FB markup đổi.

**Recommendation:** giữ strict nếu GraphQL session thật sự cần `lsd/user_id`; nếu ưu tiên parity thì cho phép thiếu `user_id`, sau đó lấy `/me` để xác nhận user.

### F7 — Low: Không còn `need_2fa` state cho token_g

**Evidence:** bản cũ type `G` scrape content_management có detect `/security/twofactor/reauth/`; bản mới token_g qua GraphQL chỉ throw lỗi chung.

**Impact:** UX báo lỗi kém rõ khi FB yêu cầu 2FA/reauth.

**Recommendation:** chỉ thêm nếu live thấy token_g fail do 2FA. Không ưu tiên nếu không có nhu cầu UI.

## Recommended design options

### Option A — Minimal parity fix (Recommended)

Sửa đúng 3 điểm có evidence mạnh:

1. `fb-token-graphql.ts`: support `accessToken` camelCase / prefix `EAAHULp`.
2. `fetch-bm-legacy.ts`: khớp variables + parser theo v6.
3. `adaccount-batch.ts`: retry một lần khi batch body báo OAuth stale.

**Ưu:** ít thay đổi, bám evidence, giảm nguy cơ phá luồng đang chạy.  
**Nhược:** chưa giải quyết triệt để `AUTO` fallback cho mọi Graph read.

### Option B — Restore AUTO semantics cho read Graph

Sau Option A, mở rộng `readGraph` để support fallback `token_i -> token_b -> token_g` cho các list/base/batch read calls.

**Ưu:** gần bản cũ nhất cho các VIA/account khó tính.  
**Nhược:** rủi ro dùng token sai user nếu chưa fix session metadata; nhiều surface bị ảnh hưởng.

### Option C — Token manager chuẩn hóa hoàn toàn

Tạo một resolver thống nhất: bootstrap session, resolve each token slot, user guard bắt buộc, invalidate token + data cache theo user switch.

**Ưu:** sạch lâu dài.  
**Nhược:** lớn hơn cần thiết, dễ over-engineer cho phase hiện tại.

## Recommendation

Em khuyến nghị **Option A trước**.

Lý do: những lỗi này có evidence trực tiếp từ diff cũ/mới, ít phải đoán, và ảnh hưởng rõ tới TKQC/BM parity. Sau khi live test với extension + FB session, nếu vẫn thấy account nào bản cũ load được nhưng bản mới fail vì token, mới làm Option B.

## Acceptance criteria nếu triển khai

- `token_graphql` lấy được từ response có `accessToken` camelCase và response có `access_token` snake_case.
- BM legacy type trả được format `BM<number>` khi response có `ad_account_creation_limit`.
- BM legacy quality/status phản ánh được `isRestricted` theo v6.
- TKQC detail/payment batch gặp OAuth stale thì reset token và retry một lần, không spam retry.
- Không đổi UI/columns ngoài dữ liệu đã có.
- Typecheck/build adaccounts pass.

## Verification plan

- Static:
  - `pnpm --filter @mf2/adaccounts typecheck`
  - `pnpm --filter @mf2/adaccounts build`
  - `pnpm verify:features` nếu sửa feature docs
- Manual cần extension + FB login:
  - Clear `adscheck_data`, load TKQC default.
  - Load TKQC với stale token_b trong storage, xác nhận retry/refetch.
  - Load BM legacy groups: `legacyType`, `legacyQuality`; so sánh với bản cũ cho cùng BM ID.
  - Switch FB account, đảm bảo cache TKQC/BM không hiện data user cũ.

## Out of scope

- Không đề xuất thêm feature mới.
- Không đổi storage encryption trừ khi Sếp yêu cầu.
- Không sửa Page/Pixel/tool runners trong report này, dù có vài token touchpoint trong `features/page/api/page-fetch.ts`.
- Không live-test Facebook vì em chưa có extension/session thực tế trong phân tích này.

## Unresolved questions

- Sếp muốn parity với chính v6 shared-dependency này, hay với một bản Adscheck/bmmanager mới hơn có hidden-limit/check-hold?
- `businessID=1347771445924940` để lấy `token_g` có chắc universal trong production không?
- Có VIA/account cụ thể nào bản cũ load được nhưng bản mới fail không? Nếu có, nên dùng làm case manual regression.
