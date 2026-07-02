---
title: "Dialog spring animation + revive overlay animations (tw-animate-css)"
status: completed
created: 2026-06-12
source: ck-plan
brainstorm_report: ../reports/brainstorm-260612-1221-dialog-animation-upgrade-report.md
blockedBy: []
blocks: []
---

# Dialog spring animation + revive overlay animations

## Goal

1. Hồi sinh toàn bộ animation overlay (Dialog/Drawer/Popover/DropdownMenu/Select/Tooltip) — hiện CHẾT vì class `animate-in/animate-out/...` đến từ `tw-animate-css` chưa được cài/import (Tailwind v4 không generate class không tồn tại).
2. Nâng Dialog lên hiệu ứng spring/bounce: mở ~400ms scale 0.92 → overshoot nhẹ → 1, đóng ~150ms fade+scale nhanh; overlay fade + backdrop blur 4px; tôn trọng `prefers-reduced-motion`.

Design doc (nguồn sự thật): [brainstorm report](../reports/brainstorm-260612-1221-dialog-animation-upgrade-report.md)

## Verified baseline

- Animation classes chết: `packages/shared-ui/src/components/ui/dialog/DialogContent.vue:37`, `DialogOverlay.vue:17` dùng `animate-in/zoom-in-95/...`; `tw-animate-css` KHÔNG có trong pnpm-lock.
- 5 entry CSS Tailwind v4: `apps/shell/src/styles.css`, `apps/adaccounts/src/styles.css`, `apps/ads-manager/src/styles.css`, `apps/adaccounts/src/remote-styles.css`, `apps/ads-manager/src/remote-styles.css` (2 file remote chỉ import theme+utilities, không preflight).
- Tiền lệ CSS co-located trong shared-ui: `table/style.css` import từ `Table.vue:605`.
- Test surface: `apps/ads-manager/src/pages/ComponentShowcasePage.vue:256`.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Revive overlay animations với tw-animate-css (PR apps) | completed | [phase-01](phase-01-revive-overlay-animations-tw-animate-css.md) |
| 2 | Dialog spring animation upgrade (PR shared-ui) | completed | [phase-02](phase-02-dialog-spring-animation-shared-ui.md) |

## Key dependencies

- Phase 2 cần Phase 1 merge trước (class spring custom vẫn tự định nghĩa keyframes riêng, nhưng verify trực quan cần nền tảng animate sống).
- PR split bắt buộc theo CLAUDE.md MF2 layer 2: KHÔNG mix `apps/*` và `packages/shared-*` trong 1 PR/commit.

## Post-implementation memory updates (mandatory)

- `.claude/components-catalog.md` mục Dialog: ghi chú hiệu ứng spring.
- Lesson mới: "animate-in classes chết vì thiếu tw-animate-css" (Tailwind v4 + shadcn-vue footgun).
