---
slug: shared-ui-subpath-injection-key
scope: mf
status: active
---

## Symptom
Sau khi shell + remotes chuyển từ `import { SpriteProvider, Icon } from '@mf2/shared-ui'` sang subpath `'@mf2/shared-ui/icons'` (plan optimize-page-load), TOÀN BỘ Icon trong app biến mất: 98 `<!--v-if-->` placeholder, 0 `<svg use>`, sprite container vẫn có 96 symbol đúng. Không có lỗi console.

## Root cause
MF2 `shared` config chỉ khai báo singleton cho package gốc `@mf2/shared-ui`. Subpath `@mf2/shared-ui/icons` KHÔNG ở trong `shared` → shell và mỗi remote bundle riêng instance của `sprite-provider.ts`. Mỗi instance thực thi `Symbol("mf2-sprite-ready")` tạo ra một Symbol UNIQUE.

Kết quả:
- `SpriteProvider` ở shell `provide(SymbolA, ready)` → ready=true sau `onMounted`.
- `Icon` ở remote `inject(SymbolB, ref(false))` → SymbolB ≠ SymbolA → fallback `ref(false)` → `v-if="is_ready"` luôn false → component không mount → không có instance trong Vue tree.

Vue DevTools cho thấy SpriteProvider provide đúng `Symbol(mf2-sprite-ready)` và `ready.value === true`, nhưng `iconCount === 0` — Icon chưa từng được mount.

## How to avoid
Khi shared-ui dùng InjectionKey để giao tiếp giữa Provider/consumer qua MFE boundary mà subpath không được MF singleton:
1. Dùng `Symbol.for("mf2-key-name")` thay vì `Symbol("mf2-key-name")`. `Symbol.for` resolves qua global registry chung cho cả process → mọi instance module đều lấy cùng symbol.
2. Quy tắc: bất kỳ InjectionKey nào ở `packages/shared-*` mà có thể cross MFE boundary đều phải dùng `Symbol.for`, không dùng `Symbol()`.
3. Hoặc thêm subpath vào MF `shared` config (vd `'@mf2/shared-ui/icons': { singleton: true }`) — tuỳ phiên bản MF có support; phải verify build.

Kiểm tra nhanh khi thêm InjectionKey shared mới: `inject` ở remote phải resolve được giá trị provide ở shell. Test path: shell A.vue provide → remote ChildComp inject → render expected.

## Related
[[mf-remote-naming]] [[shared-ui-data-grid-table]] [[data-grid-mutate-props-columns]]
