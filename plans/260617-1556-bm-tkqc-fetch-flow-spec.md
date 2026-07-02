# Spec code luồng get dữ liệu BM/TKQC từ report so sánh cột

> Ngày: 2026-06-17
> Mục đích: tài liệu đưa cho GPT/LLM để code luồng get dữ liệu BM/TKQC.
> Nguồn report: `/Users/smit_hai/Desktop/meofb-xmeta/plans/reports/bm-column-comparison-260611-1023-adscheck-vs-xmeta-report.md`
> Nguồn tham chiếu bmmanager: `/Users/smit_hai/Documents/Smit/tai-lieu-nghien-cuu/bmmanager/mbmanager.js`
> Nguồn nghiên cứu chiến lược TKQC: `/Users/smit_hai/Documents/Smit/tai-lieu-nghien-cuu/nghien-cuu-doi-thu/so_sanh_api_get_tkqc.md`

---

## 1. Kết luận nhanh

API key trong report hiện tại **đủ để biết cột nào lấy từ field/API nào**, nhưng **chưa đủ để GPT code đúng luồng get dữ liệu BM/TKQC hoàn chỉnh**.

Lý do: report đang thiên về **field mapping**. Để code được flow thật, GPT cần thêm:

- cách chọn nguồn tải dữ liệu;
- cách lọc theo quyền TKQC;
- cách lọc loại tài khoản;
- cách chia nhóm dữ liệu cần tải;
- số luồng song song/concurrency;
- batch size;
- cách merge dữ liệu từ nhiều API;
- cách tính field dẫn xuất ở client;
- các caveat về API đang có trong UI nhưng chưa thấy được nối vào fetch chính.

Tài liệu này bổ sung phần thiếu đó.

---

## 2. Phạm vi cần GPT code

### 2.1. Mục tiêu

Code luồng get dữ liệu để dựng bảng BM/TKQC theo report so sánh cột.

Luồng cần hỗ trợ ít nhất:

1. Load danh sách BM.
2. Load danh sách TKQC theo nhiều phương thức.
3. Load chi tiết TKQC bằng batch Graph API.
4. Chọn nhóm dữ liệu cần tải theo cấu hình.
5. Chạy nhiều worker song song để tăng tốc nhưng hạn chế rate limit.
6. Merge dữ liệu về row table cuối cùng.

### 2.2. Không nên để GPT tự đoán

Không để GPT tự đoán các phần sau:

- tên config key;
- field nào thuộc nhóm nào;
- `pageLimit` là page size hay concurrency;
- `owner_business` dùng để phân biệt cá nhân/BM;
- payment fields nên tách riêng khỏi detail fields;
- admin fields cần `uid` để gọi `userpermissions.user({uid}){role}`;
- `checkHold` và `hiddenBm` có UI config nhưng chưa xác nhận API xử lý riêng trong fetch chính.

---

## 3. API inventory từ report

### 3.1. BM APIs

| Mã | Mục đích | API | Field chính |
| --- | --- | --- | --- |
| API 1 | BM list | `GET /me/businesses` | `name,id,verification_status,sharing_eligibility_status,is_disabled_for_integrity_reasons,permitted_roles` |
| API 2 | IG accounts | `GET /{bm_id}/owned_instagram_accounts` | `data[]` |
| API 3 | Agencies | `GET /{bm_id}/agencies` | `data[].id,name` |
| API 4 | Client ad accounts | `GET /{bm_id}/client_ad_accounts` | `data[]` |
| API 5 | Enforcement | `POST https://business.facebook.com/api/graphql/` | `BSHEnforcedEntityGAMEDetailsRootQuery` |
| API 6 | BM batch | `POST https://graph.facebook.com/v24.0` | `business_users`, `owned_ad_accounts`, `owned_pages`, `partners`, `owned_apps` |
| API 7 | Owned ad accounts DSL | `GET /{bm_id}/owned_ad_accounts` | `account_id,name,adtrust_dsl,currency,account_status,permitted_roles` |
| API 8 | Tài sản | `GET /{bm_id}?fields=...` | pages, IG, WhatsApp assets |

### 3.2. TKQC APIs theo Adscheck

| Mã | Mục đích | API | Field chính |
| --- | --- | --- | --- |
| API A | Danh sách TKQC | `GET /me/adaccounts?fields=name,account_id,account_status,users` | `name`, `account_id`, `account_status`, `users` |
| API B | Chi tiết từng TKQC | Batch `POST https://graph.facebook.com` với `GET /act_{account_id}?fields=...` | detail/payment/finance/admin fields |
| API C | Limit ẩn | GraphQL `doc_id=6401661393282937` | `billable_account_by_asset_id.formatted_dsl` |

### 3.3. TKQC APIs theo bmmanager

bmmanager dùng flow gần giống nhưng có chia config rõ hơn:

| Nhóm | API | Field |
| --- | --- | --- |
| Seed từ toàn bộ TKQC | `GET /me/adaccounts` hoặc `GET /{uid}/adaccounts` | `name,account_id,account_status,owner_business` |
| Seed từ BM ID | `GET /{bm_id}?fields=name,owned_ad_accounts.limit(5000){account_id,name,account_status},client_ad_accounts.limit(5000){account_id,name,account_status}` | owned/client ad accounts |
| Detail batch | Batch `GET /act_{account_id}?fields={fields}` | fields từ `basic`, `finance`, `admin` |
| Payment batch | Batch `GET /act_{account_id}?fields={payment_fields}` | `funding_source_details`, `all_payment_methods` |

---

## 4. Chiến lược get TKQC từ tài liệu nghiên cứu đối thủ

Tài liệu `so_sanh_api_get_tkqc.md` bổ sung góc nhìn quan trọng: không chỉ biết field/API, mà còn cần chọn chiến lược request để tránh timeout/rate-limit.

### 4.1. So sánh chiến lược

| Tool | Tổng request tham chiếu | Triết lý | Điểm mạnh | Rủi ro |
| --- | --- | --- | --- | --- |
| Adscheck | 3 requests | Gộp dữ liệu aggressive | Nhanh, ít request, render UI sớm | Payload nặng; `users` và payment có thể làm nghẽn/lỗi batch |
| Xmeta | 4 requests | Defensive, tách rủi ro | Payment lỗi không kéo chết toàn bộ detail | Nhiều request hơn, flow phức tạp hơn |
| MeoFB | 4 requests | Scale-oriented | Hợp với nhiều BM/TKQC, phân trang lớn | Cần kiểm soát concurrency và aggregate tốt |

### 4.2. Khuyến nghị áp dụng vào flow mới

Không nên copy nguyên flow Adscheck cũ nếu mục tiêu là code mới bền hơn. Nên dùng hướng hybrid:

1. **Request khởi tạo nhẹ**:
   - Không nhét `users` vào request list nếu không bắt buộc.
   - Dùng field list nhẹ: `account_id,name,account_status,owner_business`.
   - Có thể tăng limit list lên `100` hoặc cao hơn tùy độ ổn định.

2. **Đẩy admin/users vào batch detail**:
   - Khi `options.admin = true`, thêm `users{id,role}` và `userpermissions.user({uid}){role}` vào detail batch.
   - Tránh làm request list đầu tiên quá nặng với Via cầm Agency/BM lớn.

3. **Payment nên tách queue riêng**:
   - `all_payment_methods` là nhóm dễ lỗi/rate-limit.
   - Nếu payment batch lỗi, vẫn giữ được basic/finance/admin data.
   - Đây là hướng gần Xmeta và cũng khớp với bmmanager: payment fields chạy queue riêng.

4. **Currency normalization nên chuẩn bị field riêng nếu cần tổng hợp nhiều tiền tệ**:
   - Tài liệu nghiên cứu đề xuất `account_currency_ratio_to_usd`.
   - Nếu sản phẩm cần tổng tài sản/tổng chi tiêu chuẩn USD, nên thêm field này vào nhóm finance.
   - Nếu chỉ hiển thị tiền theo currency gốc, có thể chưa cần.

5. **GraphQL Billing Hub mới cần source xác nhận trước khi code**:
   - Tài liệu nghiên cứu nhắc Xmeta dùng `doc_id=6747949808592904` (`BillingHubPaymentSettingsViewQuery`).
   - Không nên tự thay Adscheck `doc_id=6401661393282937` bằng doc_id mới nếu chưa có source/payload/response path cụ thể.

### 4.3. Điều chỉnh field groups sau nghiên cứu

Field group finance nên cân nhắc thêm optional field:

```txt
account_currency_ratio_to_usd
```

Chỉ bật khi cần quy đổi USD hoặc tổng hợp đa tiền tệ.

Field group admin nên nằm trong batch detail, không nằm ở list request đầu tiên:

```txt
users{id,role}
userpermissions.user({uid}){role}
```

Field group payment tiếp tục tách riêng:

```txt
funding_source_details{display_string,type}
all_payment_methods{...}
```

### 4.4. Quy tắc fallback khi payment lỗi

Nếu payment batch lỗi nhiều lần:

```txt
1. Không fail toàn bộ row.
2. Mark payment status = error/unavailable.
3. Giữ basic/finance/admin data đã load được.
4. Cho phép retry riêng nhóm payment.
```

Đây là điểm bắt buộc nếu muốn tránh lỗi payment kéo chết toàn bộ bảng.

---

## 5. Cấu hình tải TKQC theo bmmanager

Default config tìm được trong `mbmanager.js`:

```js
{
  source: "all",
  bmIds: "",
  advanced: true,
  options: {
    basic: true,
    payment: true,
    finance: true,
    admin: true,
    checkHold: false,
    hiddenBm: false
  },
  permission: "all",
  accountType: "bm",
  pageLimit: 100
}
```

### 5.1. Phương thức tải

| UI | Config value | Ý nghĩa | Flow |
| --- | --- | --- | --- |
| Tải toàn bộ | `source: "all"` | Quét toàn bộ tài khoản quảng cáo | Tùy `permission` và `accountType`, gọi `/me/adaccounts`, `/{uid}/adaccounts`, hoặc `/me/businesses` rồi lấy TKQC trong BM |
| Theo ID TKQC | `source: "tkqcIds"` | Nhập trực tiếp danh sách ID TKQC | Parse danh sách ID, tạo seed `{ account_id, name: "" }`, sau đó batch `/act_{id}` lấy detail |
| Theo ID BM | `source: "bmIds"` | Nhập trực tiếp danh sách ID BM | Với từng BM gọi `/{bm_id}?fields=owned_ad_accounts,client_ad_accounts`, sau đó batch detail từng TKQC |

Input ID nên cho phép các dạng:

```txt
act_1234567890
1234567890
123,456;789
mỗi dòng 1 ID
```

Khi parse, bmmanager dùng hướng đơn giản: bỏ ký tự không phải số và giữ ID đủ dài.

### 5.2. Quyền TKQC

| UI | Config value | Ý nghĩa | Flow |
| --- | --- | --- | --- |
| Tất cả | `permission: "all"` | Lấy tất cả TKQC tìm được | Dùng source hiện tại, không bắt buộc user có role trực tiếp |
| Có Quyền | `permission: "hasRole"` | Chỉ lấy TKQC user có role trực tiếp | Dùng `/{uid}/adaccounts`, vẫn áp dụng filter `accountType` nếu có |

Ghi chú:

- `permission: "hasRole"` cần biết `uid` hiện tại.
- Nếu không có `uid`, không nên gọi flow này vì không dựng được endpoint `/{uid}/adaccounts` chính xác.

### 5.3. Loại tài khoản

| UI | Config value | Điều kiện lọc | Ý nghĩa |
| --- | --- | --- | --- |
| Tất cả | `accountType: "all"` | Không lọc | Lấy cả TKQC cá nhân và TKQC thuộc BM |
| Cá nhân | `accountType: "personal"` | `!owner_business` | TKQC không thuộc BM |
| BM | `accountType: "bm"` | `!!owner_business` | TKQC thuộc BM |

Cách dùng trong flow:

```js
if (accountType === "personal") filter = account => !account.owner_business
if (accountType === "bm") filter = account => !!account.owner_business
if (accountType === "all") không filter
```

### 5.4. Cài đặt dữ liệu

`advanced` là công tắc bật/tắt nhóm dữ liệu nâng cao.

- Nếu `advanced: false`: chỉ nên lấy seed/basic tối thiểu.
- Nếu `advanced: true`: dùng `options` để quyết định field nào đưa vào batch.

| UI | Config key | Mục đích | Fields/API |
| --- | --- | --- | --- |
| Cơ bản | `options.basic` | Thông tin cơ bản TKQC | `agencies{id}`, `created_time`, `timezone_name`, `timezone_offset_hours_utc`, `disable_reason`, `business_country_code`, `is_prepay_account`, `currency` |
| Thanh toán | `options.payment` | Phương thức thanh toán | `funding_source_details{display_string,type}`, `all_payment_methods{pm_credit_card{credential_id,display_string},payment_method_direct_debits{display_string},payment_method_paypal{email_address},payment_method_tokens{type}}` |
| Tài Chính | `options.finance` | Số dư, ngưỡng, tổng tiêu | `next_bill_date`, `balance`, `adtrust_dsl`, `spend_cap`, `amount_spent`, `adspaymentcycle{threshold_amount}`, `insights.date_preset(maximum){spend}` |
| Quản trị viên | `options.admin` | Danh sách admin/quyền | `users{id,role}`, `userpermissions.user({uid}){role}` |
| Check Hold | `options.checkHold` | Kiểm tra TKQC bị hold | Có trong UI config, nhưng trong fetch chính đã đọc chưa thấy nối vào API riêng |
| TK ẩn BM | `options.hiddenBm` | TKQC bị ẩn trong BM | Có trong UI config, nhưng trong fetch chính đã đọc chưa thấy nối vào API riêng |

Field builder theo bmmanager:

```js
base = new Set(["account_id", "name", "account_status", "owner_business"])

if (options.basic) add basic fields
if (options.finance) add finance fields
if (options.admin) {
  add "users{id,role}"
  if (uid) add `userpermissions.user(${uid}){role}`
}
```

Payment fields chạy queue riêng, không trộn vào detail fields chính.

### 5.5. Số luồng song song

| UI | Config key | Ý nghĩa |
| --- | --- | --- |
| Số luồng song song | `pageLimit` | Số worker lấy detail/payment cùng lúc |

Quan trọng:

- Trong modal bmmanager, label là **Số luồng song song**.
- Code clamp config về khoảng `1..500`.
- Default modal là `100`.
- Trong fetch helper có fallback `vN = 8` khi không truyền config.
- Batch size của mỗi request detail là `50` account/request.

Không nên hiểu `pageLimit` là số item/trang UI. Ở flow TKQC này, nó đóng vai trò concurrency/worker count.

Khuyến nghị an toàn:

| Quy mô TKQC | Concurrency gợi ý |
| --- | --- |
| Dưới 50 | 5–10 |
| 50–300 | 10–30 |
| 300+ | 30–100, cần retry/backoff tốt |

---

## 5. Flow tải TKQC đề xuất cho GPT code

### 5.1. Input config

```ts
interface LoadAdAccountsConfig {
  source: "all" | "tkqcIds" | "bmIds";
  bmIds: string;
  advanced: boolean;
  options: {
    basic: boolean;
    payment: boolean;
    finance: boolean;
    admin: boolean;
    checkHold: boolean;
    hiddenBm: boolean;
  };
  permission: "all" | "hasRole";
  accountType: "all" | "personal" | "bm";
  pageLimit: number;
}
```

Tên `bmIds` trong bmmanager được dùng chung cho textarea ID, dù source có thể là `tkqcIds` hoặc `bmIds`. Nếu code mới muốn rõ hơn, có thể đổi thành `idsText`, nhưng phải map từ UI rõ ràng.

### 5.2. Thuật toán tổng quát

```txt
1. Normalize config:
   - source default "all"
   - advanced default true
   - permission default "all"
   - accountType default "all" hoặc theo UI default
   - pageLimit clamp 1..500

2. Lấy Facebook credentials:
   - token EAAG/access_token
   - uid current user

3. Build field groups:
   - detailFields = base + basic + finance + admin
   - paymentFields = payment group

4. Tạo queues:
   - allRows = []
   - seenAccountIds = Set
   - detailQueue = [] nếu có basic/finance/admin
   - paymentQueue = [] nếu có payment
   - detailMap = {}
   - paymentMap = {}

5. Hàm pushSeed(account):
   - lấy account_id
   - bỏ qua nếu rỗng hoặc đã seen
   - push vào allRows
   - nếu cần detail thì push vào detailQueue
   - nếu cần payment thì push vào paymentQueue

6. Load seed theo source:
   - tkqcIds: parse textarea, pushSeed từng ID
   - bmIds: parse textarea, gọi fetchBmAccounts(bmId), pushSeed từng TKQC
   - all: gọi flow toàn bộ theo permission/accountType

7. Chạy worker batch song song:
   - detail workers đọc detailQueue, mỗi batch 50 account
   - payment workers đọc paymentQueue, mỗi batch 50 account
   - mỗi response parse JSON và đưa vào map theo account_id
   - retry/backoff khi lỗi batch tạm thời

8. Merge row:
   - row = mapAdAccountRow(seed, detailMap[id], paymentMap[id])

9. Emit incremental result:
   - Có thể callback mỗi 350ms để UI update dần.
```

### 5.3. Flow seed theo từng mode

#### Mode `source: "tkqcIds"`

```txt
Input textarea → split by whitespace/comma/semicolon/newline → remove non-digit → keep valid ID
→ pushSeed({ account_id: id, name: "" })
→ batch detail/payment theo config
```

Ưu điểm: nhanh, không cần list API.
Nhược điểm: nếu ID sai/không có quyền, detail batch sẽ lỗi/rỗng.

#### Mode `source: "bmIds"`

```txt
Input BM IDs → với từng BM:
GET /v24.0/{bm_id}?fields=name,owned_ad_accounts.limit(5000){account_id,name,account_status},client_ad_accounts.limit(5000){account_id,name,account_status}
→ merge owned + client accounts
→ gắn owner_business = { id: bm_id, name: bm_name }
→ pushSeed từng TKQC
→ batch detail/payment theo config
```

Ưu điểm: đúng khi user muốn lấy TKQC trong BM cụ thể.
Nhược điểm: cần quyền đọc BM; BM nhiều TKQC thì response lớn.

#### Mode `source: "all"`, `permission: "hasRole"`

```txt
GET /v14.0/{uid}/adaccounts?limit=1000&fields=name,account_id,account_status,owner_business
→ filter accountType nếu cần
→ pushSeed từng TKQC
→ batch detail/payment theo config
```

Ưu điểm: chỉ lấy TKQC user có quyền trực tiếp.
Nhược điểm: bỏ sót TKQC trong BM nếu user không có role trực tiếp theo endpoint này.

#### Mode `source: "all"`, `permission: "all"`, `accountType: "personal"`

```txt
GET /v14.0/me/adaccounts?limit=1000&fields=name,account_id,account_status,owner_business
→ filter !owner_business
→ pushSeed từng TKQC
→ batch detail/payment theo config
```

#### Mode `source: "all"`, `permission: "all"`, `accountType: "bm"`

```txt
GET /v14.0/me/businesses?limit=99999
→ với từng BM gọi fetchBmAccounts(bmId)
→ pushSeed từng TKQC
→ batch detail/payment theo config
```

#### Mode `source: "all"`, `permission: "all"`, `accountType: "all"`

```txt
Chạy song song:
- /me/adaccounts để lấy TKQC user thấy trực tiếp
- /me/businesses → từng BM → owned/client ad accounts
Deduplicate theo account_id
→ batch detail/payment theo config
```

---

## 6. Flow tải BM list theo bmmanager

bmmanager có flow riêng để load BM list, hàm tương ứng trong bundle là `lw()`.

### 6.1. Load toàn bộ BM

```txt
GET /v25.0/me?fields=businesses.limit({pageLimit}){id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,permitted_roles,agencies.limit(100){id,name}}
```

Ghi chú:

- `pageLimit` ở BM list được clamp khoảng `1..200` trong field `businesses.limit(...)`.
- Có phân trang bằng `paging.next`.
- Giới hạn vòng lặp tối đa thấy trong code: 100 trang.

### 6.2. Load BM theo danh sách ID

Khi có `ids`, bmmanager làm thêm bước lấy roles:

1. Thử lấy roles từ:

```txt
GET /v25.0/me?fields=businesses.limit(200){id,permitted_roles}
```

2. Nếu thiếu role cho một số BM, fallback:

```txt
GET /v25.0/me/business_users?fields=role,business{id}&limit=200
```

3. Sau đó chạy nhiều worker song song để fetch từng BM:

```txt
GET /v25.0/{bm_id}?fields=id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,agencies.limit(100){id,name}
```

4. Nếu có role map thì gắn lại `permitted_roles` vào BM row.

### 6.3. Field BM cơ bản

| Field | Ý nghĩa |
| --- | --- |
| `id` | ID BM |
| `name` | Tên BM |
| `is_disabled_for_integrity_reasons` | Trạng thái hoạt động/integrity |
| `sharing_eligibility_status` | Dùng suy ra hạng/limit BM ở một số tool |
| `created_time` | Ngày tạo |
| `verification_status` | Xác minh doanh nghiệp |
| `permitted_roles` | Quyền của user với BM |
| `agencies.limit(100){id,name}` | Đối tác/agency liên quan |

---

## 7. Mapping row TKQC cuối cùng

Khi merge seed + detail + payment, row cuối nên có các field sau.

| Row field | Nguồn | Cách tính |
| --- | --- | --- |
| `account_status` | seed/detail | `account_status` |
| `account` / `name` | seed/detail | `name` |
| `actId` / `account_id` | seed/detail | `account_id` |
| `balance` | finance detail | `balance`, chia theo currency factor nếu cần |
| `threshold` | finance detail | `adspaymentcycle.data[0].threshold_amount` |
| `remainThreshold` | derived | `threshold - balance` khi đủ dữ liệu |
| `limit` | finance detail | `adtrust_dsl`; `-1` có thể hiển thị `Nolimit` |
| `spent` / `tong_tieu` | finance detail | `insights.data[0].spend` hoặc `amount_spent` tùy cột |
| `currency` | basic/finance | `currency` + loại trả trước/trả sau nếu cần |
| `payment` | payment detail | `funding_source_details`, `all_payment_methods` |
| `billDate` | finance detail | `next_bill_date`, format ngày |
| `daysToDue` | derived | diff ngày từ `next_bill_date` tới hiện tại |
| `spendLimit` | finance detail | `spend_cap` |
| `country` | basic detail | `business_country_code` |
| `created` | basic detail | `created_time`, format ngày |
| `type` | derived | `owner_business ? "Business" : "Cá nhân"` |
| `bm` | basic/detail/seed | `owner_business.id/name` |
| `line2Bm` | basic detail | từ `agencies.data[]` nếu có |
| `timezone` | basic detail | `timezone_name` + `timezone_offset_hours_utc` |
| `lockReason` | basic detail | `disable_reason`, map sang label nếu có bảng mapping |
| `adminCount` | admin detail | count `users.data[]` có role admin |
| `ownership` / `role` | admin detail | `userpermissions.user({uid}){role}` hoặc role map |
| `hasRole` | admin detail | true nếu userpermissions có role |

---

## 8. Mapping nhóm cài đặt dữ liệu sang cột UI

| Nhóm | Cột nên được fill |
| --- | --- |
| Cơ bản | trạng thái, tên, ID, ngày tạo, loại TK, múi giờ, BM, quốc gia, lý do khóa, dòng 2 BM/agency nếu có |
| Thanh toán | thanh toán, danh sách thẻ/payment methods |
| Tài Chính | số dư, ngưỡng, ngưỡng còn lại, limit, tổng tiêu, spend cap, ngày lập hóa đơn, số ngày đến hạn TT |
| Quản trị viên | quyền TKQC, số admin, ownership/role |
| Check Hold | chưa xác nhận API riêng trong fetch chính; không nên bịa implementation |
| TK ẩn BM | chưa xác nhận API riêng trong fetch chính; nếu cần, phải bổ sung API cụ thể trước khi code |

---

## 9. Pseudo-code TypeScript

```ts
async function loadAdAccounts(config: LoadAdAccountsConfig): Promise<AdAccountRow[]> {
  const normalized = normalizeConfig(config);
  const { token, uid } = await getFacebookCredentials();

  const detailFields = buildDetailFields(uid, normalized.options, normalized.advanced);
  const paymentFields = buildPaymentFields(normalized.options, normalized.advanced);

  const seeds: AdAccountSeed[] = [];
  const seen = new Set<string>();
  const detailQueue: AdAccountSeed[] = [];
  const paymentQueue: AdAccountSeed[] = [];
  const detailMap = new Map<string, unknown>();
  const paymentMap = new Map<string, unknown>();

  function pushSeed(seed: AdAccountSeed): void {
    const id = normalizeAccountId(seed.account_id);
    if (!id || seen.has(id)) return;

    const normalizedSeed = { ...seed, account_id: id };
    seen.add(id);
    seeds.push(normalizedSeed);

    if (detailFields.length > 0) detailQueue.push(normalizedSeed);
    if (paymentFields.length > 0) paymentQueue.push(normalizedSeed);
  }

  await loadSeedsBySource({ config: normalized, token, uid, pushSeed });

  await Promise.all([
    runBatchWorkers({ queue: detailQueue, fields: detailFields, token, targetMap: detailMap, concurrency: normalized.pageLimit }),
    runBatchWorkers({ queue: paymentQueue, fields: paymentFields, token, targetMap: paymentMap, concurrency: normalized.pageLimit }),
  ]);

  return seeds.map((seed, index) => mapAdAccountRow({
    seed,
    detail: detailMap.get(seed.account_id),
    payment: paymentMap.get(seed.account_id),
    index,
  }));
}
```

---

## 10. Retry/backoff bắt buộc

Vì flow có thể gọi nhiều batch song song, cần xử lý lỗi mềm.

Khuyến nghị:

```txt
- Nếu batch response không phải array → retry.
- Nếu request lỗi network/rate limit → sleep tăng dần.
- Backoff gợi ý: 800ms, 1600ms, 2400ms... max 5000ms.
- Sau 8 lần lỗi liên tiếp trên worker thì dừng worker đó.
- Không làm fail toàn bộ nếu một batch lỗi; giữ row seed và field rỗng.
```

bmmanager có pattern tương tự: lỗi batch thì tăng delay và tiếp tục, nhiều lỗi liên tiếp thì worker return.

---

## 11. Những điểm cần ghi rõ cho GPT để tránh code sai

1. `pageLimit` trong modal TKQC là **số luồng song song**, không phải số account mỗi page.
2. Batch size detail/payment là `50` account/request.
3. Payment nên là queue riêng vì field payment có thể nặng và cần quyền cao hơn.
4. `owner_business` là field quyết định `accountType`:
   - rỗng = cá nhân;
   - có giá trị = BM.
5. `permission: "hasRole"` dùng `/{uid}/adaccounts`, không phải `/me/adaccounts`.
6. Mode `bmIds` phải lấy cả `owned_ad_accounts` và `client_ad_accounts`.
7. Deduplicate account bằng `account_id` trước khi batch detail.
8. `checkHold` và `hiddenBm` chưa đủ thông tin API từ đoạn fetch chính; không tự bịa.
9. Các field như `remainThreshold`, `daysToDue`, `type`, `bm`, `payment display` là field derive ở client.
10. Nếu code UI, nên emit kết quả dần thay vì chờ tất cả xong mới render.

---

## 12. Acceptance criteria cho implementation

GPT/code implement xong được coi là đúng khi:

- Có thể load TKQC bằng 3 mode: toàn bộ, ID TKQC, ID BM.
- Có thể lọc quyền: tất cả/có quyền.
- Có thể lọc loại tài khoản: tất cả/cá nhân/BM.
- Có thể bật/tắt nhóm dữ liệu: basic/payment/finance/admin.
- Không gọi payment fields nếu `options.payment = false`.
- Không gọi admin fields nếu `options.admin = false`.
- Deduplicate account trước batch detail.
- Batch detail/payment chạy song song theo `pageLimit`.
- Batch mỗi request tối đa 50 account.
- Có retry/backoff khi batch lỗi.
- Row cuối có đủ field phục vụ các cột trong bảng TKQC.
- Không implement giả `checkHold`/`hiddenBm` khi chưa có API spec rõ.

---

## 13. Unresolved questions

- `checkHold` trong bmmanager có UI config nhưng chưa thấy API xử lý riêng trong fetch chính đã đọc. Cần source chưa minify hoặc thêm grep sâu nếu muốn code thật.
- `hiddenBm` trong bmmanager có UI config nhưng chưa thấy API xử lý riêng trong fetch chính đã đọc. Không nên dùng GraphQL Adscheck `hidden_limit` để suy diễn thành “TK ẩn BM” nếu chưa xác nhận.
- Nếu mục tiêu cuối là chỉ code **BM table**, có thể tách spec BM riêng gọn hơn; tài liệu này đang bao gồm cả BM và TKQC vì ảnh/config là modal TKQC.

---

## 14. Source code cần bổ sung nếu muốn doc đầy đủ nhất

Sau khi rà lại report và spec hiện tại, phần core flow BM/TKQC đã đủ để GPT code bản cơ bản theo bmmanager. Tuy nhiên nếu muốn code **đầy đủ mọi cột trong report** và hạn chế GPT tự đoán, cần bổ sung source cho các nhóm dưới đây.

### 14.1. Cần source bmmanager chưa minify hoặc source module gốc

| Nhóm/cột | Lý do cần source |
| --- | --- |
| TKQC `Check Hold` | Trong `mbmanager.js` đã thấy UI config `options.checkHold`, nhưng chưa thấy đoạn fetch/API riêng được nối vào flow `AN()` |
| TKQC `TK ẩn BM` | Trong `mbmanager.js` đã thấy UI config `options.hiddenBm`, nhưng chưa thấy đoạn fetch/API riêng được nối vào flow `AN()` |
| BM advanced metrics nếu có ngoài `lw()` | Bundle minified khó xác nhận toàn bộ các helper lấy detail BM/tài sản/limit/nút kháng |

Nếu có source React/TS gốc của bmmanager, nên cung cấp để xác nhận các module fetch riêng thay vì đọc bundle minified.

### 14.2. Cần source Xmeta nếu muốn code đúng các cột/toggle theo Xmeta

| Bảng | Cột/nhóm | Lý do cần source |
| --- | --- | --- |
| BM | `Ngày Die`, `Nút Kháng` | Report ghi API Enforcement GraphQL, nhưng cần source để biết đúng `doc_id`/query name, variables, headers, response path, điều kiện lỗi |
| BM | `SL IG`, `SL Account Share`, `Đối tác`, `Limit` | Report có API key, nhưng cần source để xác nhận version Graph API, pagination, count logic, field path chính xác |
| Page | `Page Live`, `Page Tích`, `Kiếm tiền`, `Check Post`, `Process`, `Message` | Đây là nhóm non-batch/toggle, cần source để biết endpoint, payload, response path, retry và cache |
| TKQC | `Check Hold`, `TK ẩn BM` nếu lấy theo Xmeta | Report chỉ nêu nhóm toggle, chưa có source xác nhận API/field cụ thể |

### 14.3. Cần source MeoFB nếu muốn code đúng các cột riêng của MeoFB

| Bảng | Cột/nhóm | Lý do cần source |
| --- | --- | --- |
| BM | `Hoạt động`, `Ứng dụng`, `Tiền tệ`, `Chi tiêu`, `Level BM` | Report có field gợi ý, nhưng cần source để xác nhận cách aggregate từ nhiều ad account/BM |
| Page | `Earnings 28D (USD)`, `Monetization Tools`, `Hoạt động`, `Chủ sở hữu`, `Đối tác`, `ID Profile` | Cần source để xác nhận endpoint, permission, response path và format kết quả |
| TKQC | `Chủ sở hữu` | Report ghi MeoFB có cột này, cần source để biết lấy từ `owner`, `owner_business`, hay field khác |

### 14.4. Không cần thêm source cho phần đã đủ

| Phần | Trạng thái |
| --- | --- |
| TKQC cơ bản Adscheck/bmmanager: status, name, id, balance, threshold, limit, spend, currency, role, payment, created, account type, timezone, BM, country, bill date, disabled reason | Đủ để code flow cơ bản |
| Cấu hình modal TKQC bmmanager: phương thức tải, quyền, loại tài khoản, nhóm dữ liệu, số luồng song song | Đủ để code UI/config và flow queue/batch |
| BM list cơ bản bmmanager: id, name, status/integrity, sharing eligibility, created, verification, permitted roles, agencies | Đủ để code BM list cơ bản |

### 14.5. Kết luận bổ sung

Nếu mục tiêu của GPT là code **MVP lấy BM/TKQC cơ bản**: doc hiện tại đủ.

Nếu mục tiêu là code **full parity theo bảng so sánh Adscheck/Xmeta/MeoFB/bmmanager**: cần Sếp cung cấp thêm source của:

1. Xmeta;
2. MeoFB;
3. bmmanager source gốc chưa minify, nếu có.
