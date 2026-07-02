# Brainstorm — Dialog animation upgrade (spring) + hồi sinh animation toàn bộ overlay

Date: 2026-06-12 | Branch: smit-khoa/feat-custom-component | Status: APPROVED by user

## Problem statement

User thấy Dialog (shadcn-vue, reka-ui) mở/đóng "khá basic", muốn hiệu ứng chuyên nghiệp, mượt, sáng tạo hơn.

**Root cause phát hiện khi scout:** animation hiện tại không phải "basic" — nó **CHẾT hẳn**. Toàn bộ class `animate-in / animate-out / fade-in-0 / zoom-in-95 / slide-in-*` trong shared-ui đến từ `tw-animate-css` (chuẩn shadcn cho Tailwind v4) nhưng package này **chưa được cài** và **chưa được import** ở bất kỳ `styles.css` nào. Tailwind v4 không generate các class không tồn tại → dialog bật/tắt tức thì, 0ms.

## Scout findings

- Dialog: `packages/shared-ui/src/components/ui/dialog/` (10 file, wrap reka-ui). Animation classes ở `DialogContent.vue:37`, `DialogOverlay.vue:17`.
- Tailwind v4 (`@import "tailwindcss"` + `@source "../../../packages"` trong `apps/shell/src/styles.css`). Không có `tw-animate-css` trong pnpm-lock.
- Cùng bệnh: drawer, popover, dropdown-menu, select, tooltip... đều dùng các class chết này.
- Tiền lệ custom keyframes: `apps/shell/src/styles.css:81-104` (`dropdown-enter`, `content-fade`...).
- Tiền lệ CSS co-located trong shared-ui: `table/style.css` import trực tiếp từ `Table.vue:605` → keyframes đặt trong shared-ui sẽ theo component đến mọi app.
- Demo/test surface: `apps/ads-manager/src/pages/ComponentShowcasePage.vue:256`.

## Decisions (user đã chốt qua AskUserQuestion)

| Quyết định | Lựa chọn |
|---|---|
| Phong cách | **Spring/bounce nảy nhẹ** — mở ~400ms scale 0.92 → vượt nhẹ → 1 (overshoot), đóng ~150ms scale+fade nhanh |
| Phạm vi | **Dialog + sửa nền tảng cho tất cả overlay** (cài tw-animate-css hồi sinh mọi class có sẵn) |
| Dependency | **tw-animate-css + custom keyframes** (CSS thuần, 0 runtime JS) |
| Backdrop | Fade + blur (user duyệt full design, không chọn phương án bỏ blur) |

## Evaluated approaches

1. **tw-animate-css + custom keyframes (CHỌN)** — ưu: hồi sinh ngay mọi overlay, ít code tự viết, đúng thiết kế shadcn; nhược: +1 dep (CSS thuần).
2. 100% tự viết keyframes — zero dep nhưng phải viết lại fade/zoom/slide cho từng state, các overlay khác vẫn chết. Bị loại.
3. motion-v (JS spring thật, interruptible) — đẹp nhất nhưng thêm runtime JS vào shared-ui singleton, overkill. Bị loại.

## Final design

### Bước 1 — Hồi sinh nền tảng (PR app-side)
- Cài `tw-animate-css` (devDep) cho các app có entry CSS Tailwind (shell + remotes chạy standalone).
- Thêm `@import "tw-animate-css";` sau `@import "tailwindcss";` trong từng `styles.css` (cả `remote-styles.css` nếu remote tự build CSS).
- Kết quả: Dialog/Drawer/Popover/Dropdown/Select/Tooltip lập tức có lại fade/zoom/slide mặc định 200ms.

### Bước 2 — Nâng cấp Dialog spring (PR shared-ui, ADDITIVE)
- Tạo `packages/shared-ui/src/components/ui/dialog/style.css` (theo tiền lệ table/style.css), import từ `DialogContent.vue`:
  - `@keyframes dialog-spring-in`: opacity 0→1, scale 0.92→1, translateY nhẹ; ease `cubic-bezier(0.34, 1.56, 0.64, 1)` (ease-out-back → tự overshoot ~2%), duration ~400ms.
  - `@keyframes dialog-zoom-out`: opacity→0, scale→0.97, duration 150ms, ease-in.
  - Overlay: fade + `backdrop-filter: blur(4px)` (mở), fade-out nhanh (đóng).
  - `@media (prefers-reduced-motion: reduce)`: tắt scale/translate, chỉ fade nhanh — accessibility bắt buộc.
- Sửa class trong `DialogContent.vue` + `DialogOverlay.vue`: thay `zoom-in-95/zoom-out-95` mặc định bằng class spring mới, gate theo `data-[state=open/closed]` (reka-ui set sẵn).
- Transform gốc `translate(-50%,-50%)` của positioning phải được giữ trong keyframes (scale phải compose với translate, không ghi đè) — footgun chính.
- AlertDialog: chưa tồn tại trong shared-ui (chỉ có dialog), không cần đụng.

### PR split (tuân CLAUDE.md MF2 layer 2)
- PR A: `apps/*` (deps + css import) — độc lập, merge trước cũng được.
- PR B: `packages/shared-ui` (dialog spring) — additive, không breaking: chỉ đổi visual của class, không đổi public API.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Keyframe scale ghi đè translate(-50%,-50%) → dialog nhảy vị trí | Keyframes phải khai báo `translate(-50%,-50%) scale(...)` đầy đủ, hoặc dùng CSS `scale`/`translate` properties riêng (Tailwind v4 OK) |
| `backdrop-filter: blur` tốn GPU trên máy yếu / trang nhiều layer | Blur nhẹ 4px; nếu QA thấy giật → bỏ blur, chỉ fade (user đã biết option này) |
| Spring 400ms cảm giác chậm với dialog xác nhận xoá | Đóng vẫn 150ms; nếu chê chậm → hạ 300-350ms, chỉnh 1 biến duration |
| tw-animate-css đổi behavior class cũ ở component khác | Nó chính là thứ các class này được viết cho — chỉ "bật" thứ vốn dĩ phải chạy; verify bằng ComponentShowcasePage |
| Remote standalone thiếu import → animation chết khi dev standalone | Checklist: mọi entry CSS có `@import "tw-animate-css"` |

## Success criteria

1. Mở dialog tại ComponentShowcasePage: thấy overlay fade+blur, dialog scale nảy nhẹ (overshoot) rồi đậu đúng giữa màn hình.
2. Đóng (X, ESC, click overlay, nút Huỷ): fade+scale-out nhanh ~150ms, không giật.
3. Popover/Dropdown/Drawer/Select/Tooltip có lại animation mặc định.
4. `prefers-reduced-motion: reduce` → chỉ fade, không scale.
5. Dialog không lệch tâm ở mọi frame animation (kiểm tra translate compose).
6. `pnpm verify:all` xanh (đụng shared + app boundary).

## Next steps

- `/ck:plan` với report này làm context → plan 2 phase khớp 2 PR.
- Sau implement: cập nhật `.claude/components-catalog.md` (mục Dialog — ghi chú hiệu ứng spring), cân nhắc lesson "animate-in classes chết vì thiếu tw-animate-css".

## Unresolved questions

- Danh sách chính xác app cần import (shell/adaccounts/ads-manager/home/ads_asset?) — chốt lúc plan bằng cách liệt kê mọi `styles.css` có `@import "tailwindcss"`.
