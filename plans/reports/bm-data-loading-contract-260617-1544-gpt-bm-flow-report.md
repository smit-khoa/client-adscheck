# BM Data Loading Contract cho GPT

> Ngày: 2026-06-17
> Mục tiêu: tài liệu này dùng làm prompt/brief cho GPT code luồng lấy dữ liệu Business Manager (BM), dựa trên report so sánh cột và source `bmmanager/mbmanager.js`.

## 1. Kết luận nhanh

### API key hiện tại đã đủ để GPT code chưa?

**Chưa đủ nếu chỉ đưa nguyên bảng API key hiện tại.**

Bảng hiện tại đã đủ để hiểu **mỗi cột lấy từ endpoint/field nào**, nhưng chưa đủ để GPT code đúng một luồng hoàn chỉnh vì còn thiếu:

- Nguồn tải dữ liệu: tải toàn bộ BM hay tải theo danh sách BM ID.
- Nhóm dữ liệu nâng cao: user chọn nhóm nào thì chỉ gọi API nhóm đó.
- Thứ tự gọi API: base list trước, detail theo nhóm sau.
- Số luồng song song: giới hạn số BM lấy detail cùng lúc để tránh bị Facebook limit.
- Cách merge dữ liệu từ nhiều API vào một row BM.
- Trạng thái lỗi/loading từng nhóm dữ liệu.

**Khuyến nghị:** dùng bảng API key hiện tại làm phần mapping field, và dùng contract bên dưới làm phần flow orchestration.

---

## 2. UI config cần code

Dựa trên `bmmanager/mbmanager.js`, modal cấu hình BM có 3 phần chính.

### 2.1. Nguồn tải dữ liệu

| Option | Key | Ý nghĩa | Input phụ |
| --- | --- | --- | --- |
| Tải toàn bộ | `all` | Quét toàn bộ Business Manager user có quyền thấy | Không |
| Tải theo ID | `byId` | User nhập trực tiếp danh sách BM ID | Textarea, mỗi dòng một BM ID |

Pseudo state:

```ts
interface BmLoadConfig {
  source: 'all' | 'byId';
  ids: string[];
  advEnabled: boolean;
  adv: BmAdvancedOptions;
  concurrency: number;
}
```

Default từ bmmanager:

```ts
const defaultBmLoadConfig = {
  source: 'all',
  ids: [],
  advEnabled: true,
  adv: {
    status: true,
    page: true,
    limit: true,
    bmAccount: true,
    partner: true,
    admin: true,
    instagram: true,
    whatsapp: true,
    share: true,
  },
  concurrency: 50,
};
```

> Trong source bmmanager field này tên nội bộ là `pageLimit`, nhưng UI hiển thị là **Số luồng song song (Limit API)**. Khi code mới nên đặt tên rõ hơn là `concurrency`.

---

### 2.2. Cấu hình dữ liệu nâng cao

Khi `advEnabled = false`, bmmanager vẫn tải base BM list, nhưng không chạy các runner detail theo BM.

Khi `advEnabled = true`, user bật/tắt từng **nhóm dữ liệu**. Đây không chỉ là ẩn/hiện UI: mỗi nhóm quyết định API nào được gọi và field nào được patch vào BM row.

| Toggle UI | Key | Runner/API trong source | Cột/output được cập nhật |
| --- | --- | --- | --- |
| Trạng thái | `status` | `q_()` GraphQL restriction, sau đó `G_()` enforcement detail cho BM không live/unknown | `appealStatus`, `appealLabel`, `appealDaysLeft` |
| Page | `page` | `V_()` gọi `/{bm_id}?fields=owned_pages,client_pages,...` | `pageCount`, `pageDetail` |
| Limit | `limit` | `Ax()` gọi owned ad accounts để lấy `adtrust_dsl`; bmmanager cũng luôn gọi `Ox()` để lấy `createLimit` | `limit`, `currency`, `createLimit` |
| Tài khoản BM | `bmAccount` | `Ax()` gọi `/{bm_id}/owned_ad_accounts` | `accountBm`, `accountBmDetail` |
| Đối tác | `partner` | `lw()` thêm `agencies.limit(100){id,name}` ngay trong base BM list | `partnerCount`, `partnerDetail` |
| Admin | `admin` | `Fr()` → `Dx()`/`Px()` GraphQL people table + `X_()` system users | `admin`, `adminDetail`, `adminViewerId` |
| Instagram | `instagram` | `V_()` gọi `owned_instagram_assets`, `client_instagram_assets`, `owned_instagram_accounts` | `instagramCount`, `instagramDetail` |
| WhatsApp | `whatsapp` | `V_()` gọi `whatsapp_business_accounts` | `whatsappCount`, `whatsappDetail` |
| Share | `share` | `Ax()` gọi `/{bm_id}/client_ad_accounts` | `accountShare`, `accountShareDetail` |

Source-level flow trong `mbmanager.js`:

```text
submit config
  → lw(config)  // tải base BM list; partner được include tại đây nếu bật
  → aw(rows, include)  // chạy detail theo từng BM với concurrency = pageLimit
      include.page/instagram/whatsapp → V_()
      include.bmAccount/share/limit   → Ax()
      include.admin                   → Fr()
      include.createLimit             → Ox() luôn bật trong source
  → nếu include.status → q_() rồi G_() cho BM cần lấy enforcement detail
```

Điểm quan trọng cho GPT: **toggle là nhóm API + nhóm cột**, không chỉ là checkbox hiển thị cột.

---

### 2.3. Số luồng song song

UI label:

```text
Số luồng song song (Limit API)
Số BM lấy chi tiết cùng lúc — cao thì nhanh hơn nhưng dễ bị Facebook giới hạn
```

Ý nghĩa:

- Đây là số BM được lấy detail đồng thời.
- Default giữ theo bmmanager: `50`.
- Khi parse input nên đảm bảo tối thiểu `1`; bmmanager dùng `pageLimit` làm concurrency cho cả `lw()` và `aw()`.
- Cảnh báo UX vẫn nên giữ nguyên: số càng cao càng nhanh nhưng dễ bị Facebook giới hạn.

Pseudo runner:

```ts
async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  });
  await Promise.all(workers);
}
```

---

## 3. Flow lấy dữ liệu BM đề xuất

### 3.1. Step 1 — Resolve danh sách BM cần tải

#### Case A: `source = all`

Gọi Graph API để lấy toàn bộ BM:

```text
GET https://graph.facebook.com/v18.0/me/businesses
  ?fields=id,name,verification_status,sharing_eligibility_status,is_disabled_for_integrity_reasons,permitted_roles,created_time
  &limit=...
  &access_token={token}
```

Map base row:

| Output field | Source |
| --- | --- |
| `bmId` | `id` |
| `name` | `name` |
| `verificationStatus` | `verification_status` |
| `levelBm` | `sharing_eligibility_status` (`enabled` → `BM350`, còn lại → `BM50`) |
| `role` | `permitted_roles[]` |
| `createdTime` | `created_time` |

#### Case B: `source = byId`

- Parse textarea theo dòng.
- Trim, bỏ dòng rỗng, dedupe.
- Với mỗi BM ID, gọi detail API theo nhóm được bật.
- Nếu cần base name/verified/created thì gọi:

```text
GET https://graph.facebook.com/v18.0/{bm_id}
  ?fields=id,name,verification_status,sharing_eligibility_status,is_disabled_for_integrity_reasons,created_time
  &access_token={token}
```

---

### 3.2. Step 2 — Fetch dữ liệu nâng cao theo toggle

Chỉ chạy nếu `advEnabled = true`.

Với mỗi BM row, chạy các nhóm đang bật. Có thể gom một số nhóm vào cùng endpoint để giảm call.

#### Nhóm `page`, `instagram`, `whatsapp`

Trong source bmmanager, 3 toggle này đi chung runner `V_()`. Runner chỉ thêm field tương ứng với toggle đang bật, rồi patch đúng nhóm output về row.

```text
GET https://graph.facebook.com/v25.0/{bm_id}
  ?fields={fields theo toggle bật}
  &access_token={token}
```

Nếu `page = true`, thêm fields:

```text
owned_pages.limit(100){id,name,picture,fan_count,verification_status},
client_pages.limit(100){id,name,picture,fan_count,verification_status}
```

Nếu `instagram = true`, thêm fields:

```text
owned_instagram_assets.limit(200){id,ig_username},
client_instagram_assets.limit(200){id,ig_username},
owned_instagram_accounts.limit(200){id,username,name,profile_pic,followed_by_count,follow_count,media_count}
```

Nếu `whatsapp = true`, thêm fields:

```text
whatsapp_business_accounts.limit(100){id,name,verified_name,phone_numbers,status}
```

Mapping:

| Toggle | Output | Source |
| --- | --- | --- |
| `page` | `pageCount` | `owned_pages.data.length + client_pages.data.length` |
| `page` | `pageDetail` | JSON `{ owned, client }`, mỗi item có `_scope: owned/client` |
| `instagram` | `instagramCount` | `owned_instagram_assets + client_instagram_assets`, enrich bằng `owned_instagram_accounts` theo username |
| `instagram` | `instagramDetail` | JSON array `{ id, username, name, profile_pic, followed_by_count, follow_count, media_count }` |
| `whatsapp` | `whatsappCount` | `whatsapp_business_accounts.data.length` |
| `whatsapp` | `whatsappDetail` | JSON array WhatsApp business accounts |

#### Nhóm `bmAccount`, `share`, `limit`

Trong source bmmanager, 3 toggle này đi chung runner `Ax()`. Runner gọi owned/client ad accounts theo toggle:

- `bmAccount` hoặc `limit` bật → gọi `owned_ad_accounts`.
- `share` bật → gọi `client_ad_accounts`.
- Nếu cả owned/client trả rỗng, source retry 1 lần sau delay ngắn.

```text
GET https://graph.facebook.com/v25.0/{bm_id}/owned_ad_accounts
  ?fields=account_status,adtrust_dsl,currency,account_id,name,created_time
  &limit=1000
  &access_token={token}

GET https://graph.facebook.com/v25.0/{bm_id}/client_ad_accounts
  ?fields=account_id,account_status,adtrust_dsl,currency,name,created_time
  &limit=1000
  &access_token={token}
```

Mapping:

| Toggle | Output | Source/cách tính |
| --- | --- | --- |
| `bmAccount` | `accountBm` | `Total: {owned.length} - Live: {status=1} - Die: {status=2}` |
| `bmAccount` | `accountBmDetail` | JSON owned ad accounts: `account_id, account_status, adtrust_dsl, currency, name, created_time` |
| `share` | `accountShare` | `Total: {client.length} - Live: {status=1} - Die: {status=2}` |
| `share` | `accountShareDetail` | JSON client ad accounts: `account_id, account_status, adtrust_dsl, currency, name, created_time` |
| `limit` | `limit` | max `owned_ad_accounts[].adtrust_dsl`; nếu không có owned account thì rỗng; nếu không tìm được max thì `No Limit` |
| `limit` | `currency` | currency của owned account đang có `adtrust_dsl` lớn nhất |

#### Nhóm `createLimit` nội bộ

bmmanager còn có `include.createLimit: true` luôn bật trong `aw()`, không có checkbox riêng trên UI. Runner `Ox()` lấy giới hạn tạo tài khoản quảng cáo của BM và patch vào `createLimit`.

Thứ tự fallback trong `Ox()`:

1. Nếu có token Graph API phù hợp: `Fx()` gọi GraphQL v24 `doc_id=32061067960207573` với `businessID` → parse `ad_account_creation_limit`.
2. Nếu có `fb_dtsg`: `Z_()` gọi `BusinessCometBizSuiteSettingsBusinessInfoV3ViewContainerQuery`, `doc_id=26524571973804472` → parse limit từ response.
3. Fallback cũ: `ew()` gọi `https://business.facebook.com/business/adaccount/limits/?business_id={bm_id}` → parse `adAccountLimit`.

Output:

| Output | Ý nghĩa |
| --- | --- |
| `createLimit` | giới hạn tạo TKQC/BM type từ Business Info, khác với `limit` lấy từ `adtrust_dsl` của ad account |

#### Nhóm `admin`

Theo quyết định của Sếp: **Admin MVP cần detail đầy đủ như bmmanager**, không dùng bản rút gọn chỉ đếm số lượng.

bmmanager dùng runner `Fr()`:

1. Ưu tiên `Dx()` nếu có access token:

```text
GET https://graph.facebook.com/graphql
  ?method=post
  &fb_api_req_friendly_name=BizKitSettingsPeopleTableListPaginationQuery
  &doc_id=9371006629693295
  &variables={ id: bm_id, first: 200, orderBy: 'MOST_RECENTLY_CREATED', ... }
  &access_token={token}
```

2. Nếu `Dx()` fail và có `fb_dtsg`, fallback `Px()`:

```text
POST https://business.facebook.com/api/graphql/
  fb_api_req_friendly_name=BizKitSettingsPeopleTableListPaginationQuery
  doc_id=24411698895145972
  variables={ id: bm_id, first: 200, orderBy: 'MOST_RECENTLY_CREATED', ... }
```

3. Sau khi có people table, gọi thêm system users:

```text
GET https://graph.facebook.com/v25.0/{bm_id}?fields=system_users&access_token={token}
```

Mapping từ source:

| Output | Source/cách tính |
| --- | --- |
| `admin` | label dạng `Admin {total} - FB: {fbCount} - IG: {igCount}` hoặc có thêm `- Sys: {systemCount}` |
| `adminDetail` | JSON array `{ id, name, email, type, role, active }` |
| `adminViewerId` | `business_user_for_viewer.id` |

Cách parse từng user trong `Q_()`:

| Field | Cách lấy |
| --- | --- |
| `id` | `userInfoForSelection.id` |
| `name` | `userInfoForSelection.name`, nếu pending thì fallback email |
| `email` | `nameColumn.email` |
| `type` | `nameColumn.backed_user_type`; nếu pending/non-FB/non-IG thì `PENDING` |
| `role` | `roleColumn.permitted_business_account_tasks_summary.standalone.primary_access_details`; chứa `basic` → `Basic`, có giá trị khác → `Admin`, fallback `roleColumn.role`/`access_type` |
| `active` | có `lastActiveColumn.last_active_time` dài hơn 5 ký tự → `Active`, ngược lại `None` |

System users được merge thêm vào `adminDetail` với shape:

```ts
{ id, name, email: '', type: 'SYSTEM', role: systemUser.role || 'System', active: 'Active' }
```

Không nên dùng fallback đơn giản `GET /me/business_users?fields=role,business{id}` cho MVP này, vì không đủ detail admin như bmmanager.

#### Nhóm `partner`

Trong source bmmanager, `partner` không nằm trong detail runner `aw()`. Nó được xử lý ngay trong base list `lw()` qua `includePartner`:

```text
fields base = id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,permitted_roles
if includePartner = true:
  append agencies.limit(100){id,name}
```

Với `source = all`:

```text
GET https://graph.facebook.com/v25.0/me
  ?fields=businesses.limit({pageLimit}){id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,permitted_roles,agencies.limit(100){id,name}}
  &access_token={token}
```

Với `source = byId`:

```text
GET https://graph.facebook.com/v25.0/{bm_id}
  ?fields=id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,agencies.limit(100){id,name}
  &access_token={token}
```

Mapping trong `Ag()`:

| Output | Source/cách tính |
| --- | --- |
| `partnerCount` | `agencies.data.length` |
| `partnerDetail` | JSON `agencies.data` |

Nếu `advEnabled = false` thì `includePartner = true` theo source hiện tại. Nếu `advEnabled = true` thì `includePartner = adv.partner`.

#### Nhóm `status`

Có 2 mức:

1. Restriction tổng quan:

```text
POST https://business.facebook.com/api/graphql/
  doc_id=24978143705145562 hoặc bmmanager source doc_id=4941582179260904
  → viewer.ad_businesses.nodes[].advertising_restriction_info
```

2. Enforcement/kháng chi tiết:

```text
POST https://business.facebook.com/api/graphql/
  fb_api_req_friendly_name=BSHEnforcedEntityGAMEDetailsRootQuery
  doc_id=25166016149718566
  variables={ ides_enforcement_instance_id: bm_id, screen: 'DETAIL', entityID: bm_id, entrypoint: 'BSH_ENFORCED_ENTITY_PAGE', scale: 1 }
```

Mapping:

| Output | Source |
| --- | --- |
| `status` | `appealStatus` | restriction tổng quan từ `advertising_restriction_info`: `live`, `die_permanent`, `die_3strike`, `days_left`, `unknown` |
| `status` | `appealLabel` | label hiển thị: `Live`, `Die vĩnh viễn`, `Die 3 dòng`, `Đang xem xét`, hoặc status raw |
| `status` | `appealDaysLeft` | từ enforcement detail: parse text dạng `x ngày` nếu có |

Lưu ý: base row cũng có `status` riêng từ `is_disabled_for_integrity_reasons`: `true` → `Vô Hiệu Hóa`, ngược lại `Hoạt Động`. Toggle `status` advanced patch thêm `appealStatus/appealLabel/appealDaysLeft`, không thay thế trực tiếp base `status`.

---

## 4. Merge dữ liệu vào BM row

Mỗi BM row nên có shape ổn định:

```ts
interface BmRow {
  bmId: string;
  name?: string;
  role?: string;
  verificationStatus?: string;
  createdTime?: string;
  levelBm?: string;

  status?: string;
  appealStatus?: string;
  appealDaysLeft?: number;

  pageCount?: number;
  pageDetail?: unknown[];

  limit?: string;
  currency?: string;
  accountBm?: string;
  accountBmDetail?: unknown[];
  accountShare?: string;
  accountShareDetail?: unknown[];

  partnerCount?: number;
  partnerDetail?: unknown[];

  adminLabel?: string;
  adminDetail?: unknown[];
  viewerBusinessUserId?: string;

  instagramCount?: number;
  instagramDetail?: unknown[];

  whatsappCount?: number;
  whatsappDetail?: unknown[];

  loadingGroups?: Partial<Record<keyof BmAdvancedOptions, boolean>>;
  errorGroups?: Partial<Record<keyof BmAdvancedOptions, string>>;
}
```

Nguyên tắc merge:

- Base row tạo trước từ `source`.
- Mỗi nhóm advanced patch thêm field của nhóm đó.
- Nếu một nhóm fail, chỉ set `errorGroups[group]`, không làm fail cả BM row.
- Nếu user tắt toggle, giữ data đã fetch trong cache/session, chỉ ẩn cột trên UI.

---

## 5. Contract tối thiểu để GPT code đúng

Khi đưa cho GPT, nên yêu cầu rõ:

1. Implement modal config gồm:
   - `source: all | byId`
   - textarea BM IDs khi `byId`
   - `advEnabled`
   - 9 toggles advanced
   - `concurrency`
2. Fetch base BM list trước.
3. Với `advEnabled`, chạy detail fetch theo toggle.
4. Dùng concurrency limit cho per-BM detail calls.
5. Merge kết quả theo `bmId`.
6. Có loading/error theo từng nhóm, không fail toàn bộ bảng khi 1 API lỗi.
7. Không gọi API của nhóm user đã tắt.
8. Không gọi lại nhóm đã có cache trong cùng session.

---

## 6. Rủi ro và lưu ý

| Rủi ro | Cách xử lý |
| --- | --- |
| Facebook rate limit | Giữ default concurrency `50` theo bmmanager và hiển thị cảnh báo UX: cao thì nhanh nhưng dễ bị giới hạn |
| GraphQL doc_id đổi | Bọc try/catch, degrade về `unknown` thay vì crash |
| Token thiếu quyền | Hiển thị lỗi theo nhóm, vẫn render row base |
| BM nhiều asset > limit | Cần follow paging nếu endpoint trả `paging.next` |
| API version khác nhau | Dùng version thống nhất nếu có thể, nhưng giữ doc_id GraphQL theo source đang chạy |

---

## 7. Prompt ngắn có thể đưa GPT

```text
Hãy code luồng tải dữ liệu BM theo contract này:
- Có modal config: source all/byId, ids[], advEnabled, adv toggles status/page/limit/bmAccount/partner/admin/instagram/whatsapp/share, concurrency.
- source=all: GET /me/businesses lấy base rows.
- source=byId: parse BM IDs, tạo/fetch base rows theo từng BM ID.
- advEnabled=true: với mỗi BM, chỉ gọi API của nhóm toggle đang bật.
- Gom page+instagram+whatsapp vào một request /{bm_id}?fields=...
- Gom bmAccount+share+limit qua owned_ad_accounts + client_ad_accounts.
- Admin dùng GraphQL people table đầy đủ như bmmanager (`Dx`/`Px`) + merge `system_users`, không dùng bản rút gọn.
- Status dùng GraphQL restriction/enforcement, fail thì set unknown.
- Chạy detail theo concurrency limit, merge patch vào row theo bmId.
- Có loading/error theo từng group, cache session theo key bm:{bmId}:{group}.
```

---

## 8. Decisions locked

- Default concurrency: giữ `50` như bmmanager.
- Admin MVP: lấy detail đầy đủ như bmmanager bằng GraphQL people table + `system_users`.
- Advanced config: hiểu là nhóm API/cột dữ liệu, không chỉ là checkbox hiển thị UI.

## 9. Unresolved questions

None.
