---
title: "Export bảng dữ liệu (.txt/.csv/.xlsx) trong shared-ui Table"
slug: export-data-table
date: 2026-06-20
status: done
branch: smit-khoa/feat-export-data-table
source: plans/reports/brainstorm-260620-1417-export-data-table-report.md
blockedBy: []
blocks: []
---

# Plan: Export bảng dữ liệu (.txt/.csv/.xlsx)

Thêm chức năng "Tải xuống" cho shared-ui `Table.vue`. Button stub đã có sẵn (`Table.vue:16`) → cắm Popover chọn định dạng + tải. Generic cho mọi bảng bật `tools:['download']`. AdAccountTable không cần sửa code.

**Input:** `plans/reports/brainstorm-260620-1417-export-data-table-report.md` (thiết kế đã chốt qua brainstorm).

## Nguyên tắc bắt buộc (isolation)
- Chỉ chạm `packages/shared-ui` + AI memory. **KHÔNG** mix `apps/*` trong cùng commit (layer 2).
- Thay đổi **additive**: thêm props/file mới, không đổi public API cũ (layer 1).

## Phases

| # | Phase | File | Status | Phụ thuộc |
|---|-------|------|--------|-----------|
| 1 | Composable export + dep xlsx + unit test | `phase-01-export-composable.md` | done | — |
| 2 | ExportMenu.vue + wire Table.vue | `phase-02-export-menu-wire.md` | done | P1 |
| 3 | Cập nhật feature doc + catalog | `phase-03-docs-update.md` | done | P2 |

## Sự thật codebase đã verify (scout)
- Button stub: `Table.vue:16` — render khi `tools.includes('download')`, chưa có `@click`.
- Tập cột xuất = `visibleColumns` (computed, `Table.vue:1103`): frozen + nonFrozen, **đã loại cột ẩn** (qua `columnsApply`), **đúng thứ tự hiển thị**, không gồm checkbox (checkbox là cột riêng, không phải `Column`).
- Mỗi cột: `{ field, name, type? }`. Header xuất = `column.name`.
- Dữ liệu: `props.data: RowData[]`, giá trị ô = `row.data[field]`.
- Selection: `props.checkedConfig.selected: string[]` = mảng String ID theo `props.table_info.key_id` (vd `"id"`).
- Tên bảng: `props.table_info.name` (vd `"ad-accounts"`).
- `formatCopyValue(field, rowData)` nhận **object phẳng** (`row.data`) — verify tại `Table.vue:2241` (`rangeRows` map `r.data`). Trả `undefined` → fallback giá trị gốc.
- Hạ tầng `use-range-copy.ts`: `buildTSV()`, `escapeTSVCell()` — tái dùng cho `.txt` (TSV).
- Component sẵn có: `Popover`, `RadioGroup`, `Button`, `Icon` trong shared-ui.
- Chưa có lib xlsx/csv nào.

## Acceptance (toàn plan)
1. Không tích dòng → file chứa **toàn bộ** dòng `props.data`.
2. Tích N tkqc → file chứa **đúng N dòng** đã tích (lọc theo `checkedConfig.selected`).
3. Tập + thứ tự cột file == `visibleColumns` (sau ẩn/hiện cột).
4. `status` ra "Đang chạy" (qua formatCopyValue), `balance` ra số.
5. 3 định dạng .txt/.csv/.xlsx mở được; tên file `smit-adscheck-<table>-<YYYY-MM-DD>.<ext>`.
6. Bảng khác bật `tools:['download']` export được mà không sửa thêm.
7. Build shared-ui + typecheck pass; unit test composable pass.

## Open questions
- Dynamic import `xlsx` (lazy khi bấm tải) để giảm bundle initial? → quyết trong Phase 1 theo đo lường, không chặn.
