---
slug: facebook-session-cache-account-switch
scope: state
status: active
---

## Symptom
Đổi Facebook account hoặc logout nhưng app vẫn hydrate rows TKQC/BM/Page từ cache cũ, nên UI không báo chưa đăng nhập và có thể hiển thị dữ liệu của FB user trước đó.

## Root cause
Cache data có `user_id` nhưng current user lại được lấy từ `getToken()`. `getToken()` ưu tiên module-level token memory/cache `adscheck_data`, nên sau khi đổi account nó vẫn trả `user_id` cũ. Các guard `loadedOnce`/`rows.length` còn làm composable bỏ qua bước kiểm tra lại session.

## How to avoid
Trước mọi cache hydration trong feature phụ thuộc Facebook cookie, phải probe live FB session độc lập với token cache (Banzai/session endpoint), so sánh live `user_id`, và khi mismatch/logout phải reset token memory + expire data cache timestamp + clear visible rows trước guard `loadedOnce`.

## Related
[[adaccounts-account-list]] [[adaccounts-bm-data-loading]] [[adaccounts-page-tab]]
