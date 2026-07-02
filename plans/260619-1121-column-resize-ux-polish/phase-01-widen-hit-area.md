---
phase: 1
title: "Mở rộng hit-area resizer"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Mở rộng hit-area resizer

## Overview
Vùng bắt chuột của `.column-resizer` đang 4px → khó trúng, dễ bấm nhầm nút sort/drag/dropdown kế bên.
Mở rộng vùng bắt chuột lên ~10px mà KHÔNG đổi vẻ ngoài (vạch hiển thị vẫn mảnh).

## Requirements
- Functional: vùng click/drag rộng hơn (~10px), trúng dễ hơn; vạch màu chỉ sáng khi hover đúng vùng resizer.
- Non-functional: không đổi DOM structure (giữ 1 div `.column-resizer`), không đụng JS handler, additive CSS.

## Architecture
- `.column-resizer` thành "vùng bắt chuột vô hình" rộng hơn; vạch hiển thị chuyển sang pseudo-element `::before`.
- Tách khỏi cụm nút bên trái: dịch resizer ra mép phải (`right: -5px`) + `z-index` cao hơn header controls.
- Hover: chỉ `::before` đổi màu/đậm (không nhảy width 4→6px như cũ → mượt hơn, phục vụ Phase 2).

## Related Code Files
- Modify: `packages/shared-ui/src/components/ui/table/style.css` (`.column-resizer` ~493-534)
- Modify: `packages/shared-ui/src/components/ui/table/Table.vue` CSS (`.column-resizer` ~4099-4102, gộp tránh trùng)
- Không sửa template (`Table.vue:86`, `:121`) — giữ nguyên `@mousedown`/`@dblclick`.

## Implementation Steps
1. Trong `style.css`: đổi `.column-resizer` → width ~10px, `right: -5px`, `background: transparent`, `z-index` cao, bỏ tooltip comment chết (515-534).
2. Thêm `.column-resizer::before`: vạch hiển thị (1-2px) căn giữa vùng, `transition` màu.
3. `.column-resizer:hover::before` / `:active::before`: đổi màu `var(--primary)` + đậm — KHÔNG đổi width vùng cha.
4. Kiểm tra trùng lặp rule `.column-resizer` ở `Table.vue:4099-4102` → gộp/cleanup để 1 nguồn sự thật cursor.
5. Đảm bảo resizer không che drag-handle cột kế bên (test mép cột frozen ↔ non-frozen).

## Success Criteria
- [ ] Hit-area ≥10px, trúng dễ rõ rệt.
- [ ] Vạch hiển thị vẫn mảnh, chỉ sáng khi hover vùng resizer (không phải cả header).
- [ ] Không bấm nhầm sort/drag/dropdown ở mép cột.
- [ ] Không có rule `.column-resizer` trùng/đá nhau giữa 2 file.

## Risk Assessment
- Hit-area rộng có thể chồng lên header cột kế bên → giới hạn bằng `right` âm vừa phải + test trực quan.
- `z-index` quá cao có thể che dropdown trigger → chỉ nâng đủ trên cell, không trên overlay.
