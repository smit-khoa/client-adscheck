---
slug: google-sans-flex-font-loading
scope: ui
status: active
---

## Symptom

Google Sans Flex đã có trong `packages/shared-ui/src/styles/fonts.css` và có đủ `.woff2` assets, nhưng dev server vẫn render bằng system font. Production build cũng có thể chỉ chứa literal family name trong JS/CSS mà không có `@font-face` hoặc font asset thật trong `dist`.

## Root cause

Font asset + `@font-face` nằm trong shared-ui không tự động được app load. Mỗi app root CSS phải import một subpath CSS được package export, nếu không Rspack/Tailwind không đưa `@font-face` vào CSS graph và không emit `.woff2`. Ngoài ra family name trong component phải khớp đúng `font-family` của `@font-face`; tên kiểu `"Google Sans Flex 120pt"` không match `"Google Sans Flex"` nên browser fallback im lặng.

## How to avoid

- Export font CSS từ `packages/shared-ui/package.json`, ví dụ `"./styles/fonts.css": "./src/styles/fonts.css"`.
- Import font CSS ở mọi app root CSS trước các style dùng token/font stack: `@import "@mf2/shared-ui/styles/fonts.css";`.
- Đặt app-level token riêng, ví dụ `--smit-font-sans: "Google Sans Flex", system-ui, -apple-system, "Segoe UI", sans-serif;`, rồi dùng `font-family: var(--smit-font-sans)` trên `html, body`. Tránh dùng `--font-sans` vì Tailwind v4 theme/preflight có thể ghi đè biến này về stack mặc định.
- Kiểm tra template `public/index.html`: inline `body { font-family: ... }` không nằm trong cascade layer nên sẽ thắng rule app CSS trong `@layer base`; bỏ inline font-family hoặc set cùng Google Sans Flex.
- Nếu cần optical size, dùng variable axis (`font-variation-settings: "opsz" 120`) thay vì đổi family name.
- Verify cả CSS output và asset output: build/dev-compiled CSS phải có `@font-face`, và `dist` phải emit các file `.woff2`.

## Related

[[rspack-native-css-order-and-mf-split-chunks]]
