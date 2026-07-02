---
slug: mf-remote-naming
scope: mf
status: active
---

## Symptom
Remote MF tải manifest OK nhưng runtime báo "remote not found" / container global name mismatch. Hoặc đổi tên remote xong build phục vụ bản cache cũ (stale) dù đã sửa code.

## Root cause
Một remote có 4 định danh PHẢI khớp nhau: `owners.remotes` key === remote MF `name` (rspack `ModuleFederationPlugin.name` + `output.uniqueName`) === chuỗi trong `import('key/routes')` (remote-routes.ts) === module declaration trong `remotes.d.ts`. Nếu owners key ≠ MF name → URL manifest resolve được nhưng container global name lệch → "remote not found". (Lưu ý: `owners.json` có 2 nhánh — `shell` là host, `remotes` mới là danh sách remote; chỉ key dưới `remotes` mới tính.)

Footgun separator (verified 2026-06-05): cùng 1 remote dùng 3 dạng dấu nối hợp lệ khác nhau:
- MF name / `owners.remotes` key / `import()` path: `ads_manager` (gạch dưới)
- URL segment / router path / sidebar nav: `ads-manager` (gạch ngang)
- npm package: `@mf2/ads-manager` (gạch ngang)
`RemoteHost` `props.name` chỉ là nhãn hiển thị cho UI lỗi/loading — KHÔNG dựng MF import nên gạch ngang ở đó vô hại. `adaccounts` dùng 1 token mọi nơi nên né được vấn đề.

## How to avoid
Khi review/đổi tên 1 remote, grep tên mới qua TẤT CẢ: `owners.json`, rspack `name`/`uniqueName`/`publicPath` port, `remotes.d.ts`, `remote-routes.ts` `import()`, router parent `name`/`props.name`. Env override key là `${KEY.toUpperCase()}_REMOTE_URL` — nếu dùng ở build time PHẢI khai trong `turbo.json` `build.env`, nếu không Turbo phục vụ build cache cũ.

## Related
[[remote-loading-recovery]]
