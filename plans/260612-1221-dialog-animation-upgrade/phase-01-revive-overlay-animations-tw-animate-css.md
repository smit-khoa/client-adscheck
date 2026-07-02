---
phase: 1
title: "Revive overlay animations với tw-animate-css (PR apps)"
status: completed
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Revive overlay animations với tw-animate-css (PR apps)

## Overview

Cài `tw-animate-css` và import vào mọi entry CSS Tailwind, làm sống lại toàn bộ class `animate-in/animate-out/fade-*/zoom-*/slide-*` đang chết trong shared-ui (Dialog, Drawer, Popover, DropdownMenu, Select, Tooltip...). PR này chỉ đụng `apps/*` + lockfile — KHÔNG đụng `packages/`.

## Requirements

- Functional: mở/đóng các overlay component có animation mặc định shadcn (fade+zoom ~200ms).
- Non-functional: zero runtime JS thêm (tw-animate-css là CSS thuần), không tăng đáng kể CSS size, không double-import trong remote khi mount vào shell.

## Architecture

- Tailwind v4 dùng CSS-first config; `tw-animate-css` được thiết kế để `@import` trong file CSS (thay thế plugin `tailwindcss-animate` của v3).
- 5 entry CSS:
  - Full: `apps/shell/src/styles.css`, `apps/adaccounts/src/styles.css`, `apps/ads-manager/src/styles.css` → thêm `@import "tw-animate-css";` ngay sau `@import "tailwindcss";`.
  - Remote (theme+utilities, không preflight): `apps/adaccounts/src/remote-styles.css`, `apps/ads-manager/src/remote-styles.css` → cũng cần import để remote mount trong shell có đủ keyframes/utilities (shell chỉ scan `@source` của chính nó; utilities được generate per-bundle).
- Lưu ý dedupe: khi remote chạy trong shell, cả 2 CSS cùng định nghĩa keyframes trùng tên — CSS keyframes trùng tên là idempotent (định nghĩa sau thắng, cùng nội dung) → không gây lỗi.

## Related Code Files

- Modify: `apps/shell/package.json` (devDependencies + `tw-animate-css`)
- Modify: `apps/adaccounts/package.json` (devDependencies)
- Modify: `apps/ads-manager/package.json` (devDependencies)
- Modify: `apps/shell/src/styles.css`
- Modify: `apps/adaccounts/src/styles.css`
- Modify: `apps/ads-manager/src/styles.css`
- Modify: `apps/adaccounts/src/remote-styles.css`
- Modify: `apps/ads-manager/src/remote-styles.css`
- Modify: `pnpm-lock.yaml`

## Implementation Steps

1. `pnpm --filter @mf2/shell --filter @mf2/adaccounts --filter @mf2/ads-manager add -D tw-animate-css` (check tên package filter thật trong package.json từng app trước khi chạy).
2. Thêm `@import "tw-animate-css";` sau dòng import tailwind đầu tiên trong cả 5 file CSS trên.
3. Build affected: `pnpm turbo run build --filter=...[origin/main]`.
4. Chạy ads-manager standalone, mở `ComponentShowcasePage` → verify Dialog/Popover/Dropdown/Drawer/Tooltip có animation fade+zoom.
5. Chạy shell + remote mount → verify tương tự trong shell context.

## Success Criteria

- [ ] Mở Dialog tại ComponentShowcasePage thấy fade+zoom ~200ms (không bật tắt tức thì).
- [ ] Popover / DropdownMenu / Drawer / Select / Tooltip cũng có animation.
- [ ] Animation chạy cả khi remote mount trong shell lẫn standalone.
- [ ] Build xanh, không warning CSS mới.
- [ ] Commit/PR KHÔNG chứa thay đổi `packages/`.

## Risk Assessment

- Turbo cache stale sau khi đổi CSS deps → nếu kết quả lạ, build lại với `--force`.
- Remote thiếu import → animation chỉ chết khi dev standalone; checklist 5 file ở trên chống sót.
- tw-animate-css "bật" lại animation ở component lâu nay đứng im → review nhanh các trang chính xem có hiệu ứng ngoài ý muốn (đặc biệt Select trong form).
