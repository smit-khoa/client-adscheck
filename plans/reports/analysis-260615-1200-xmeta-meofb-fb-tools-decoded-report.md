# Phân tích 2 dự án công cụ FB Ads/Business (XMETA + MEOFB) — tài liệu tham chiếu để dựng UI/panel

> **Nguồn:** `~/Downloads/final-report/` (7 file Sếp nghiên cứu). XMETA = 4 file (ads/bm/page + bm-3-buttons), MEOFB = 3 file (tkqc/bm/page).
> **Mục tiêu report:** nắm bản chất + bộ chức năng + cấu trúc UI để **dựng UI/panel** trong remote `adaccounts` (chưa nối API thật).
> **Điểm nối codebase:** khung demo `apps/adaccounts/src/features/tool-actions/` — feature doc ghi rõ "Swap point for real action APIs later".

---

## 1. Bản chất 2 dự án

Cả hai là **công cụ tự động hoá Facebook Ads/Business** (Chrome Extension + web panel), thao tác **hàng loạt** thay user trên tài khoản FB thật. Đều reverse-engineer API riêng của Meta → **vi phạm ToS**, `doc_id`/version **dễ vỡ** khi Meta xoay vòng.

| Tiêu chí | XMETA | MEOFB |
|---|---|---|
| Nạp logic | Lazy-load server `/api/feature/<key>/logic` → cache `localStorage` → `FIOX.registerFeature(key,{run})` | Đóng gói 1 file JS obfuscate (`web-meofb.js`) |
| Gọi mạng | `window.ExtensionBridge.fetch(url,opts)` (proxy nền, mượn cookie) | `chrome.runtime.sendMessage({type:'fetch',url,options})` (proxy nền) |
| Concurrency | tuỳ nút (vài chục thread) | mặc định **2** (né rate-limit) |
| Hạ tầng riêng | — | `email.meofb.com`, `bm999mail.me` (đọc mail nhận BM), `@meofb.com` |

**Cơ chế UI chung (cả hai):** mỗi nút `btn-*` → mở **panel cấu hình** → user chọn danh sách đối tượng (TKQC/BM/Page) + nhập tham số → nút **start/run/confirm** lặp hàng loạt qua hàng đợi đồng thời.

---

## 2. Hai lớp API Facebook (nền tảng mọi nút)

1. **Graph REST** `graph.facebook.com/vXX.0/...` (+ `adsmanager-graph`, `z-p3-graph`, `b-graph`) — auth `access_token` (EAAG/EAAB/EAAH). Dùng cho thao tác đơn giản (rename, agencies, users, asset group).
2. **GraphQL nội bộ** `business.facebook.com/api/graphql/` (+ `adsmanager.facebook.com`, `www.facebook.com`) — auth `fb_dtsg`+`lsd`+cookie session, dùng `doc_id` + `fb_api_req_friendly_name`. Mô phỏng thao tác web Business Suite. Response prefix `for(;;);` phải strip trước `JSON.parse`.

Token `fb_dtsg`/`lsd` lấy từ session web; `access_token` lấy khi "quét" tài khoản. Nhiều nút có cơ chế **refresh token** + **auto-assign quyền** khi gặp lỗi.

---

## 3. Bộ chức năng đầy đủ (gom theo 3 tab)

### TAB TKQC (Tài khoản quảng cáo `act_<id>`)

| Chức năng | XMETA key | MEOFB button | Lớp API |
|---|---|---|---|
| Đổi tên | `ads-doi-ten` | `btn-rename-ads` | Graph REST `?name=` |
| Mở/Đóng tài khoản | `ads-dong-tai-khoan` / `ads-mo-tai-khoan-dong` | `btn-open-close-ads-account` | GraphQL (deactivate/reactivate) |
| Đổi thông tin | `ads-doi-thong-tin` | `btn-change-info-ads` | GraphQL |
| Thêm admin | `ads-them-nguoi` | `btn-add-user-ads` | Graph REST `/users` |
| Xoá admin | `ads-xoa-admin` | `btn-remove-user-ads` | REST + form |
| Giới hạn chi tiêu | `ads-gioi-han-chi-tieu` | `btn-ads-spend-limit` | Graph REST / GraphQL |
| Share đối tác | `ads-share-doi-tac-bm` | `btn-share-partner-ads` | Graph REST `/agencies` |
| Xoá đối tác | `ads-xoa-doi-tac` | `btn-remove-partner-ads` | Graph REST DELETE `/agencies` |
| Share pixel | `ads-share-pixel` | `btn-share-pixel`* | Graph REST `/shared_accounts` |
| Nhóm tài sản | — | `btn-add-to-asset-group` | Graph REST `contained_adaccounts` |
| Lên camp | `ads-len-camp-xlsx` (XLSX) | `btn-ads-seed-camp` (camp mồi) | Graph REST draft→publish |
| Quản lý chiến dịch | — | `btn-ads-campaign-manager` | GET campaigns + Relay status |
| Thẻ (thêm/xoá) | — | `btn-add-card-ads` / `btn-delete-card-ads` | GraphQL billing |
| Thanh toán dư nợ | — | `btn-ads-pay-debt` | GraphQL billing (5 bước + 3DS) |
| Kích hoạt trả trước | `ads-kich-hoat-tra-truoc` | — | GraphQL |
| Lấy link TKBM/XMDT/kháng | `ads-lay-link-tkbm`/`-xmdt` | — | GraphQL chuỗi |
| Tạo cuộc gọi / Check call | `ads-schedule-call` / `ads-check-call` | — | GraphQL |
| Thoát tài khoản | `ads-thoat-tai-khoan` | — | Graph REST DELETE self |

\* `btn-share-pixel` ở MEOFB nằm tab BM.

### TAB BM (Business Manager)

Tạo: BM (`bm-tao-bm`/`btn-open-create-bm`), TKQC (`bm-tao-tkqc`/`btn-create-ads`), Page (`bm-nhet-page`/`btn-create-page-bm`), WABA (`bm-create-waba`), App (`btn-create-app`). Quản trị: đổi tên/thông tin, thêm miền (`btn-add-bm-domain`), QL admin/đối tác, YC quyền QC, nhét TKQC, nhóm tài sản, tách TK, kích hoạt page, rời/xoá BM. Backup & nhận lại: lấy link backup → đọc mail/OTP → nhận BM (`bm-nhan-link-bm`/`btn-open-auto-claim`/`btn-open-link-claim`). Billing nhạy cảm: kích info BM = **credit-sharing/monthly-invoicing** (4 bước GraphQL).

### TAB PAGE (Fanpage)

Chỉ định/cập nhật & xoá quyền, nhận lời mời, kích hoạt page, gỡ/nhét page↔BM, nhóm tài sản, đổi tên (`name.php` legacy), avatar+bìa (upload multipart + set mutation), xoá bài (ảnh/video/story — mutation theo loại), share đối tác, bật/tắt nhắn tin, huỷ link IG, check earning, check boots livestream, tạo/chấp nhận page.

**Đặc thù tab Page:** phần lớn mutation đi qua `www.facebook.com/api/graphql/` (Profile-Plus/Comet) + cần **switch profile** (`CometProfileSwitchMutation` / cookie `i_user`) + reauth password (`ProfilePlusMarkReauthedMutation`) trước khi thao tác. Đây là điểm khác lớn so với BM/TKQC.

---

## 4. Ánh xạ sang khung `tool-actions` hiện có (để dựng UI/panel)

Khung hiện tại trong `apps/adaccounts/src/features/tool-actions/`:
- `ToolGroupGrid` (grid nhóm) → `ToolFunctionGrid` (grid hàm) → `runFunction` (demo, trả toast).
- Catalog tĩnh `data/mock-tool-groups.ts`; types `ToolGroup`/`ToolFunction`/`DemoActionResult`.
- **Thiếu** (so với 2 dự án mẫu): **panel cấu hình per-function** (nhập tham số + chọn mode), header "Áp dụng cho N đối tượng" đã có.

**Mô hình UI 2 dự án mẫu (chung):**
```
[Nút chức năng]  --click-->  [Panel cấu hình]
                               ├─ input tham số (tên, mode, danh sách UID/ID...)
                               ├─ dropdown mode (vd open|close, all|byId, v1|v2|auto)
                               └─ [Nút Start/Run/Confirm]  --> chạy hàng loạt qua N đối tượng đã tick
```

**Mỗi function có "shape panel" riêng** — quy về vài kiểu input lặp lại:
- **text/number đơn** (tên mới, số lượng, amount).
- **textarea danh sách** (UID, ID BM, email, link — multiline).
- **dropdown mode** (mode chạy + chọn API version/fallback).
- **toggle/checkbox** (các cờ phụ: afterAddPermission, grant_full_control...).
- **file/folder picker** (avatar/cover, XLSX) — nâng cao, ít dùng giai đoạn UI.

→ Để dựng UI/panel, hướng gọn nhất: **mở rộng `ToolFunction` thêm metadata mô tả panel** (danh sách field + kiểu), render panel bằng 1 component generic theo schema. Tránh viết tay từng panel (28+24+18 nút).

---

## 5. Điểm dễ vỡ & rủi ro (ghi nhận, không xử lý ở giai đoạn UI)

- `doc_id` + version API là reverse-engineer → Meta đổi schema là hỏng. **Giai đoạn UI không bị ảnh hưởng** (chưa nối API).
- Cơ chế cookie `i_user` switch (tab Page) dễ vỡ nhất khi FB siết New Pages Experience.
- Vi phạm ToS Meta (cả 2 report đều ghi chú) — quyết định kinh doanh, ngoài phạm vi kỹ thuật.
- MEOFB phụ thuộc hạ tầng email riêng (`email.meofb.com`, `bm999mail.me`).

---

## 6. Phần chưa giải mã trọn (nếu sau cần nối API thật)

- **XMETA:** `ads-doi-thong-tin` (obfuscate control-flow, thiếu doc_id+payload); `bm-backup-bm` (custom cipher, mới trace động một phần); `FIOX_AAM` (module remove/assign quyền — chưa dump); `bm-khang-bm` (không có trong dump cache).
- **MEOFB:** `btn-add-card-ads` chưa trace payload submit thẻ cuối; nút **"Quản Lý Page Vị Trí"** (`btn-page-location-manager`) là **STUB chết** — khai báo trong map nhưng không có handler/listener.

---

## Câu hỏi chưa giải quyết

1. UI/panel làm cho **tab nào trước** (TKQC / BM / Page) và **bao nhiêu nút** ở vòng đầu? (28+24+18 nút là quá lớn cho 1 vòng — nên chọn subset).
2. Panel render theo **schema generic** (1 component, metadata mô tả field) hay **viết tay từng panel**? Schema generic gọn hơn nhưng cần thiết kế type trước.
3. Bộ **icon** cho từng nhóm/hàm phải nằm trong `shared-ui ICON_NAMES` — cần đối chiếu danh sách icon có sẵn trước khi dựng catalog.
