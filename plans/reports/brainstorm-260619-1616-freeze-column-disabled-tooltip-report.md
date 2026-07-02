# Brainstorm — Tooltip lý do disable cho item "Đóng băng cột"

**Date:** 2026-06-19 · **Branch:** smit-khoa/feat-custom-component · **Status:** Approved

## Problem
`DropdownMenuItem` "Đóng băng cột này" bị disable bởi điều kiện gộp
`!(showFrozenControls && !pivotMode && canShowFreezeButton(field))`.
User không biết TẠI SAO không bấm được → cần tooltip giải thích lý do khi hover.

## Decisions (user-approved)
- Phạm vi: hiển thị tooltip cho **mọi lý do disable** (tắt tính năng / pivot / không đủ width).
- Nội dung: **mô tả + gợi ý khắc phục**.
- Kỹ thuật hover: **bọc wrapper `<span>` (TooltipTrigger)** giữ pointer-events — item disabled vẫn không click được.
- Text (default, approved): 3 message theo case (xem dưới).
- Cấu trúc: **giữ inline 2 chỗ** (KISS — file đã ~4.4k LOC, không tách sub-component lần này).

## Solution
File duy nhất: `packages/shared-ui/src/components/ui/table/Table.vue`.

1. Thêm computed `freezeDisabledReason(field) → string | null`:
   - cột đang frozen → `null` (luôn cho bỏ băng).
   - `!showFrozenControls` → "Tính năng đóng băng cột đang tắt."
   - `pivotMode` → "Không thể đóng băng cột khi đang ở chế độ pivot."
   - `!canShowFreezeButton(field)` → "Không đủ khoảng trống để đóng băng cột này. Hãy bỏ đóng băng hoặc thu nhỏ cột khác."
   - else `null`.
2. Sửa 2 chỗ dropdown (header frozen ~L80 + non-frozen ~L116): khi có reason → bọc
   `Tooltip > TooltipTrigger(as-child) > span > DropdownMenuItem disabled`; else giữ item enable như cũ.
3. Mount `TooltipProvider` 1 lần ở gốc template; import Tooltip parts từ shared-ui.

## Governance
- shared-ui → **PR riêng**, không trộn `apps/*` (layer 2). Thay đổi **additive** (layer 1).
- Sau khi xong: cập nhật `.claude/features/shared-ui-data-grid-table.md` (bắt buộc).

## Acceptance
- Hover item disable → đúng 1 trong 3 message.
- Item enable → không tooltip, click bình thường.
- Item disable không click được (giữ semantic).
- Áp dụng cả 2 vùng header.

## Out of scope
- Không đổi `maxFrozenWidth` / `canShowFreezeButton`.
- Không thêm tooltip cho item sort.
- Không tách sub-component.

## Open questions
- None.
