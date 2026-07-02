# TKQC Prototype — 2 App + Chế độ cơ bản, và cú rẽ CORS

**Date**: 2026-06-05
**Severity**: Medium (feature prototype + routing refactor)
**Component**: shell routing, adaccounts remote, auth flow
**Status**: Resolved

## What Happened

Brainstorm → plan → cook một prototype: rename 2 remote placeholder (`home`→`adaccounts` = Quản lý TKQC, `ads_asset`→`ads-manager` = Quản lý quảng cáo), build chế độ cơ bản cho app TKQC (bảng TKQC tích chọn 3/4 + panel công cụ grid nhóm→chức năng 1/4 + nút chuyển mode nâng cao). Kiến trúc: mode = runtime toggle (Pinia mode-store), business logic ở composables, view chỉ render — để mode nâng cao sau này tái dùng lõi.

Rename + 3 phase feature chạy trơn: typecheck + build pass mỗi phase, MF wiring verified qua manifest name (`adaccounts`/`ads_manager`) + remoteEntry 200.

## The Notable Part

Giữa lúc finalize, user báo **CORS khi gọi auth**. Đây là chỗ phải nói thẳng sự thật kỹ thuật thay vì vá mò: CORS là quyết định của gateway server, client KHÔNG "tắt" được. Và luồng auth không gọi 1 mà **4 endpoint gateway** (`/public/authentication`, `/gate/me/businesses`, `/gate/:bid/me`, `/gate/:bid/feature-onboarding-progress`) — mock 1 cái thì 3 cái kia vẫn CORS.

User đưa 2 hướng mâu thuẫn trong 2 message liên tiếp (ẩn auth vs giữ auth + paste response thật). Thay vì đoán, dừng lại liệt kê 3 hướng khả thi thật (bypass / mock toàn bộ 4 endpoint / dev-proxy) kèm trade-off, để user chốt. User chọn bypass + đổi URL `/business/:bid/*` → `/app/*`.

Điểm dễ sót: nguồn CORS không chỉ ở `AuthLayout.initialize()` mà còn ở `BusinessLayout` (watch bid → `setCurrentBusiness` → fetch roles/onboarding). Phải truy cả blast radius — grep mọi ref `/business`+`bid` — mới gỡ sạch. Header dropdowns chỉ đọc store (tự ẩn `v-if`), không tự gọi API nên an toàn.

## Technical Details

- `AppLayout.vue` (mới) thay `BusinessLayout.vue`: chrome (background + header + sidebar) không auth/bid/fetch.
- Router: `/` → `/app` → `/app/adaccounts`. `pathTargetsRemote` regex đổi `^/business/[^/]+/<seg>` → `^/app/<seg>`.
- File auth cũ (AuthLayout, BusinessLayout, 4 header dropdown, QuickLogin, CreateBusiness) giữ dạng **orphan** — không import → không vào bundle → bật lại auth sau không phải viết lại. Xóa là one-way door nên không xóa.
- Naming footgun MF: `ads-manager` (folder/package có `-`) nhưng MF name/owners key/import phải `ads_manager` (underscore, valid JS identifier + env-safe). Khớp 3 chỗ MF, hyphen chỉ ở URL segment + npm package.
- Code-review (subagent) bắt 1 bug HIGH thật: selection state module-scoped giữ qua navigation (MF singleton). User quyết **giữ cố ý** → gỡ `clearSelection` dead export + thêm comment WHY thay vì "fix" nhầm.

## Lessons

1. CORS report từ user → đừng hứa "fix client". Nói rõ nó là server-side, rồi đưa hướng client khả thi (proxy/bypass/mock) kèm trade-off.
2. Khi user đưa 2 hướng mâu thuẫn → dừng, hỏi chốt, không đoán. Cost 1 câu hỏi ≪ refactor sai hướng.
3. Bỏ auth ≠ bỏ 1 file. Truy blast radius (grep bid/business/initialize) mới gỡ hết nguồn gọi mạng.
4. Orphan-giữ thay vì xóa cho thứ có thể bật lại (auth) — đảo ngược rẻ.
