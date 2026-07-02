---
phase: 2
title: "Dialog spring animation upgrade (PR shared-ui)"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Dialog spring animation upgrade (PR shared-ui)

## Overview

Nâng Dialog từ fade+zoom mặc định lên hiệu ứng spring/bounce: mở ~400ms scale 0.92 → overshoot ~2% → 1 (ease-out-back), đóng ~150ms fade+scale-out; overlay fade + backdrop blur 4px. Thay đổi ADDITIVE trong `packages/shared-ui` — không đổi public API, chỉ đổi visual. PR riêng, KHÔNG đụng `apps/*`.

## Requirements

- Functional:
  - Mở: dialog scale từ 0.92 + fade in, overshoot nhẹ rồi đậu lại 100%, ~400ms.
  - Đóng: fade + scale về 0.97, ~150ms, mọi đường đóng (X, ESC, click overlay, DialogClose button).
  - Overlay: fade in + `backdrop-filter: blur(4px)` khi mở; fade out khi đóng.
- Non-functional:
  - `prefers-reduced-motion: reduce` → chỉ fade nhanh, không scale/translate (accessibility bắt buộc).
  - Dialog KHÔNG lệch tâm ở bất kỳ frame nào (transform positioning `translate(-50%,-50%)` phải compose với scale).
  - CSS thuần, không JS runtime.

## Architecture

- Theo tiền lệ `table/style.css`: tạo `packages/shared-ui/src/components/ui/dialog/style.css`, import từ `DialogContent.vue` → CSS đi theo component đến mọi app, không phụ thuộc entry CSS app.
- **Footgun chính:** positioning hiện dùng class `translate-x-[-50%] translate-y-[-50%]` (Tailwind v4 compile ra CSS `translate` property hoặc `transform` — PHẢI kiểm tra output thật). Giải pháp an toàn nhất: keyframes chỉ animate `scale` + `opacity` bằng CSS individual properties (`scale: 0.92` → `scale: 1.02` → `scale: 1`), KHÔNG đụng `transform`/`translate` → compose tự nhiên với translate positioning, không thể lệch tâm.
  - Cách thay thế nếu individual `scale` không ăn: dùng `cubic-bezier(0.34, 1.56, 0.64, 1)` trên transition `scale 0.92→1` (bezier tự overshoot, chỉ cần 2 keyframe).
- Gate theo `data-[state=open]` / `data-[state=closed]` (reka-ui đã set). Reka-ui chờ animation kết thúc trước khi unmount (animation-aware unmount) — animation đóng bằng CSS animation (không transition) để chắc chắn chạy được trên element sắp unmount.
- Class cũ `animate-in ... zoom-in-95` trên DialogContent thay bằng class custom (`dialog-spring-in` / `dialog-spring-out`); DialogOverlay giữ fade của tw-animate-css + thêm class blur.

### Keyframes phác thảo

```css
@keyframes dialog-spring-in {
  from { opacity: 0; scale: 0.92; }
  to   { opacity: 1; scale: 1; }
}
@keyframes dialog-spring-out {
  from { opacity: 1; scale: 1; }
  to   { opacity: 0; scale: 0.97; }
}
[data-slot="dialog-content"][data-state="open"] {
  animation: dialog-spring-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
[data-slot="dialog-content"][data-state="closed"] {
  animation: dialog-spring-out 150ms ease-in forwards;
}
[data-slot="dialog-overlay"] { backdrop-filter: blur(4px); }
@media (prefers-reduced-motion: reduce) {
  [data-slot="dialog-content"][data-state="open"],
  [data-slot="dialog-content"][data-state="closed"] {
    animation-duration: 100ms;
    animation-name: dialog-fade-only-in / dialog-fade-only-out; /* fade thuần, không scale */
  }
}
```

(`cubic-bezier(0.34,1.56,0.64,1)` có y > 1 → scale vượt ~1.02 rồi nảy về — không cần keyframe trung gian 102%.)

## Related Code Files

- Create: `packages/shared-ui/src/components/ui/dialog/style.css`
- Modify: `packages/shared-ui/src/components/ui/dialog/DialogContent.vue` (import style.css, bỏ class zoom-in-95/zoom-out-95 + animate-in/out của content, giữ positioning)
- Modify: `packages/shared-ui/src/components/ui/dialog/DialogOverlay.vue` (thêm blur; giữ fade tw-animate-css)
- KHÔNG đụng: `DialogScrollContent.vue` để vòng sau (hoặc áp dụng cùng class nếu trivial — quyết định lúc implement, vẫn trong shared-ui PR).

## Implementation Steps

1. Kiểm tra CSS output thật của `translate-x-[-50%]` (build hoặc devtools): xác nhận nó dùng `translate` property riêng → `scale` property riêng compose an toàn.
2. Tạo `dialog/style.css` với keyframes như phác thảo + biến thể reduced-motion (fade-only).
3. Import `"./style.css"` trong `DialogContent.vue` script block (tiền lệ Table.vue:605).
4. Sửa class string DialogContent: bỏ `data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ... duration-200` (animation giờ do style.css gánh qua `[data-slot]` selector). Giữ nguyên positioning/layout class.
5. Sửa DialogOverlay: thêm blur (qua style.css selector `[data-slot="dialog-overlay"]`), giữ class fade hiện có.
6. `pnpm --filter @mf2/shared-ui typecheck && pnpm --filter @mf2/shared-ui test`.
7. Verify trực quan trên ComponentShowcasePage (standalone + trong shell): mở/đóng đủ 4 đường (X, ESC, overlay click, Huỷ/Xoá), check không lệch tâm, check reduced-motion qua devtools emulation.
8. `pnpm verify:all` (đụng shared boundary).
9. Cập nhật AI memory: `.claude/components-catalog.md` (Dialog — hiệu ứng spring), lesson mới `tw-animate-css-missing-dead-animations.md` + row index.

## Success Criteria

- [ ] Mở dialog: scale nảy nhẹ (overshoot cảm nhận được) + overlay fade/blur, ~400ms.
- [ ] Đóng dialog cả 4 đường: fade+scale-out ~150ms, element không "nhảy" khi unmount.
- [ ] Dialog đúng tâm ở mọi frame (quay chậm bằng devtools Animations panel).
- [ ] `prefers-reduced-motion: reduce`: chỉ fade, không scale.
- [ ] Typecheck + test shared-ui xanh; `pnpm verify:all` xanh.
- [ ] Commit/PR KHÔNG chứa thay đổi `apps/`.
- [ ] Components catalog + lesson đã cập nhật.

## Risk Assessment

- Individual `scale` property bị Tailwind class khác ghi đè (vd zoom utilities còn sót) → bước 4 phải gỡ sạch zoom/fade class cũ của content.
- `backdrop-filter` tốn GPU trên trang nặng → blur chỉ 4px; nếu QA báo giật, gỡ blur (1 dòng CSS) — user đã biết trade-off.
- Reka-ui unmount trước khi animation đóng chạy xong → dùng CSS animation + `forwards`; nếu vẫn bị, kiểm tra reka-ui `DialogContent` có cần `forceMount` không (chỉ điều tra khi tái hiện được).
- Spring 400ms bị chê chậm → hạ duration là đổi 1 số trong style.css, không đổi API.
