---
phase: 1
title: "Composable export + dep xlsx + unit test"
status: done
priority: P1
dependencies: []
---

# Phase 1: Composable export + dep xlsx

## Overview
Tạo lõi export thuần (không UI): nhận rows + columns + options → build matrix → ghi file `.txt`/`.csv`/`.xlsx`. Thêm dep `xlsx`. Unit test lõi.

## Requirements
- Functional: 1 hàm `exportTable(params)` xuất 3 định dạng. Header = `column.name`. Cell convert qua `formatCopyValue` rồi fallback giá trị gốc; số giữ nguyên kiểu number cho `.xlsx`.
- Non-functional: thuần, side-effect chỉ ở bước trigger download. Test được tách rời DOM.

## Architecture

**Dep mới:** `xlsx` (SheetJS) trong `packages/shared-ui/package.json`.

**File mới:** `packages/shared-ui/src/components/ui/table/composables/use-table-export.ts`

```ts
export type ExportFormat = 'txt' | 'csv' | 'xlsx'

export interface ExportColumn { field: string; name: string; type?: string }

export interface ExportTableParams {
  rows: Record<string, any>[]            // đã là object phẳng (row.data)
  columns: ExportColumn[]                // = visibleColumns, đúng thứ tự
  format: ExportFormat
  fileName: string                       // không kèm đuôi
  formatCopyValue?: (key: string, row: Record<string, any>) => string | undefined
}

// Build Array-of-Arrays: [header row] + data rows
// cell(field,row):
//   v = formatCopyValue?.(field,row); if v !== undefined return v
//   raw = row[field]
//   xlsx + typeof raw === 'number' → giữ number; else → raw ?? ''
export function buildExportMatrix(params): (string|number)[][]

export function exportTable(params: ExportTableParams): void
//   .txt → buildTSV (tái dùng use-range-copy) → Blob('text/plain') → triggerDownload(.txt)
//   .csv → XLSX.utils.aoa_to_sheet → XLSX.utils.sheet_to_csv → Blob → .csv (BOM UTF-8 để Excel đọc tiếng Việt)
//   .xlsx → XLSX.utils.aoa_to_sheet → book_new → book_append_sheet → XLSX.writeFile(wb, fileName.xlsx)
```

**Lưu ý kỹ thuật:**
- `.txt` tái dùng `escapeTSVCell`/logic TSV từ `use-range-copy.ts` — nhưng `buildTSV` hiện gắn với `CopyRange`+`CopyEntry`. Nếu chữ ký không khớp trực tiếp → viết helper `matrixToTSV(matrix)` nhỏ dùng `escapeTSVCell` (export sẵn). KHÔNG sửa API `buildTSV` cũ (additive).
- `.csv`: prepend BOM `﻿` để Excel mở đúng tiếng Việt.
- `.xlsx`: số phải vào sheet dạng number → tại `buildExportMatrix`, field không qua formatCopyValue và `typeof raw==='number'` thì giữ number.
- Download trigger: tạo `<a>` + `URL.createObjectURL` + `revokeObjectURL` cho txt/csv; xlsx dùng `XLSX.writeFile` (tự download).
- Cân nhắc `dynamic import('xlsx')` trong `exportTable` để không nặng initial bundle — quyết theo kích thước; nếu lazy thì `exportTable` trả `Promise<void>`.

## Related Code Files
- Create: `packages/shared-ui/src/components/ui/table/composables/use-table-export.ts`
- Create: `packages/shared-ui/src/components/ui/table/composables/__tests__/use-table-export.spec.ts` (vị trí test theo convention repo — verify trước)
- Modify: `packages/shared-ui/package.json` (thêm `xlsx`)
- Reuse (đọc, không sửa): `packages/shared-ui/src/components/ui/table/composables/use-range-copy.ts` (`escapeTSVCell`)

## Implementation Steps
1. Verify test runner repo (vitest?) + vị trí test convention. Nếu chưa có test infra cho shared-ui → báo Sếp, cân nhắc bỏ test file (giữ build pass).
2. `pnpm --filter @mf2/shared-ui add xlsx`.
3. Viết `use-table-export.ts`: `buildExportMatrix` + `matrixToTSV` (nếu cần) + `exportTable`.
4. Viết unit test: `buildExportMatrix` (header đúng tên cột, thứ tự, formatCopyValue ưu tiên, số giữ number cho xlsx, null→''), `matrixToTSV` escape tab/newline.
5. `pnpm --filter @mf2/shared-ui build` + typecheck.

## Success Criteria
- [ ] `buildExportMatrix` test pass: header = column.name; thứ tự cột giữ nguyên; formatCopyValue ưu tin; number giữ nguyên (xlsx); null/undefined → ''.
- [ ] `exportTable` 3 nhánh không throw (smoke).
- [ ] `pnpm --filter @mf2/shared-ui build` pass.
- [ ] Không sửa public API của `use-range-copy.ts`.

## Risk Assessment
- **Test infra chưa có trong shared-ui** → verify bước 1; nếu thiếu, report Sếp thay vì tự dựng cả vitest config (ngoài scope). Mitigation: tách `buildExportMatrix` thuần để dù không test tự động vẫn dễ kiểm thủ công.
- **buildTSV không tái dùng trực tiếp** → fallback `matrixToTSV` + `escapeTSVCell`. Thấp.
- **Bundle tăng do xlsx** → cân nhắc dynamic import. Thấp.
