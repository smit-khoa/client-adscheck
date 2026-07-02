---
phase: 3
title: "Cập nhật feature doc + catalog"
status: done
priority: P2
dependencies: [2]
---

# Phase 3: Cập nhật AI memory (feature doc + catalog)

## Overview
Cập nhật feature doc bảng + component catalog cho khớp code mới. Bắt buộc theo CLAUDE.md (cập nhật feature doc là 1 phần của task).

## Requirements
- `shared-ui-data-grid-table.md`: thêm mục Export (button, 3 định dạng, phạm vi cột/dòng, formatCopyValue, tên file, composable + ExportMenu).
- `components-catalog.md`: note `ExportMenu` thuộc Table (nếu phần Table liệt kê sub-component).

## Related Code Files
- Modify: `.claude/features/shared-ui-data-grid-table.md`
- Modify: `.claude/components-catalog.md` (chỉ khi cần)
- Modify (nếu nhắc tới export như future work): `.claude/features/adaccounts-account-list.md`

## Implementation Steps
1. Đọc `shared-ui-data-grid-table.md`, thêm section "Export / Tải xuống": files (`use-table-export.ts`, `ExportMenu.vue`), flow, dùng `visibleColumns` + `checkedConfig.selected` + `formatCopyValue`, tên file pattern, dep `xlsx`.
2. Update `adaccounts-account-list.md` nếu có dòng "export ... later" → đánh dấu done.
3. Catalog: thêm ExportMenu vào mục Table nếu mục đó liệt kê thành phần con.

## Success Criteria
- [ ] Feature doc mô tả đúng files + flow export hiện tại.
- [ ] Không còn dòng "export là future work" mâu thuẫn với code.
- [ ] `pnpm verify:all` pass (đụng AI memory + shared boundary — theo CLAUDE.md).

## Risk Assessment
- Thấp. Chỉ docs. Rủi ro duy nhất: quên chạy `verify:all` khi đụng AI memory.
