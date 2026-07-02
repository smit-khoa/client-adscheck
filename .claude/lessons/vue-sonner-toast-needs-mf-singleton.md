---
slug: vue-sonner-toast-needs-mf-singleton
scope: mf
status: active
---

## Symptom
Dùng `Toaster` + `toast()` từ `@mf2/shared-ui` (vue-sonner). Chạy **standalone** (remote tự serve, vd :3010/:3011) toast hiện bình thường. Chạy **qua shell** (:8301) thì `toast()` không lỗi, console im lặng, `<Toaster>` container CÓ trong DOM (`[data-sonner-toaster]`) nhưng **0 toast item** (`document.querySelectorAll('[data-sonner-toast]').length === 0`). Toast không bao giờ hiện.

## Root cause
`vue-sonner` giữ hàng đợi toast trong **module-scoped state** (một emitter). `toast()` push vào emitter của bản vue-sonner mà nó import; `<Toaster>` subscribe vào emitter của bản nó import.

`@mf2/shared-ui` là MF singleton, NHƯNG `vue-sonner` (dependency bên trong shared-ui) KHÔNG nằm trong MF `shared` config → mỗi app (shell, mỗi remote) **bundle bản vue-sonner riêng**, mỗi bản có emitter riêng. Qua shell: `toast()` (chạy trong remote) đẩy vào emitter bản-remote, `<Toaster>` (cũng remote nhưng resolve qua shared-ui singleton của shell) nghe emitter bản-shell → 2 emitter khác nhau → 0 item. Standalone chỉ có 1 bản nên chạy.

Đây cùng họ với [[shared-ui-subpath-injection-key]]: **module state không qua được MF boundary nếu package không được khai báo singleton**.

## How to avoid
Bất kỳ thư viện nào giữ **state trong module** và cần dùng chung qua MF boundary (vue-sonner toast queue, event bus, store global, injection registry) PHẢI được thêm vào MF `shared` với `singleton: true` ở **shell VÀ mọi remote dùng nó**, và thêm vào `dependencies` của app đó (để MF resolve được). App code nên import toast qua narrow entrypoint `@mf2/shared-ui/sonner` để tránh kéo root shared-ui barrel và tránh CSS-order side effects từ component groups không dùng:
```
// rspack.config.ts shared: { ... }
'vue-sonner': { singleton: true, requiredVersion: '^2.0.9' },
```
Lưu ý: thêm vào `shared` chỉ có hiệu lực khi **RESTART dev server** (hot-reload không đọc lại rspack.config).

Phân biệt triệu chứng nhanh: standalone chạy + qua shell hỏng + container có nhưng item = 0 → **singleton/instance** (fix như trên), KHÔNG phải CSS. (CSS thiếu thì item CÓ trong DOM nhưng vô hình / position sai.)

## Related
[[shared-ui-subpath-injection-key]] [[shadcn-form-components-reuse-and-theme-tokens]] [[adaccounts-tool-actions]]
