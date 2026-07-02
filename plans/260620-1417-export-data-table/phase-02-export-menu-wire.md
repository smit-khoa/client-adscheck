---
phase: 2
title: "ExportMenu.vue + wire Table.vue"
status: done
priority: P1
dependencies: [1]
---

# Phase 2: ExportMenu.vue + wire Table.vue

## Overview
Tạo `ExportMenu.vue` (Popover chọn định dạng + button "Tải xuống"), thay button stub `Table.vue:16` bằng nó, thêm handler `exportData()` gom rows + columns rồi gọi `exportTable`.

## Requirements
- Functional: click "Tải xuống" → Popover: 3 radio `.xlsx`(default)/`.csv`/`.txt`, dòng mô tả, button "Tải xuống". Bấm → emit `export(format)` → Table gọi composable → tải file. Đóng popover sau khi tải.
- Non-functional: dùng component shared-ui sẵn có (Popover, RadioGroup, Button, Icon). Không hand-roll.

## Architecture

**File mới:** `packages/shared-ui/src/components/ui/table/ExportMenu.vue`
```
Popover
  PopoverTrigger → Button "Tải xuống" (giữ nguyên style stub cũ: variant secondary, Icon download)
  PopoverContent
    RadioGroup v-model=format (mặc định 'xlsx')
      RadioGroupItem xlsx / csv / txt  (label: ".xlsx", ".csv", ".txt")
    <p class="text-muted ...">Khi tích chọn tkqc cụ thể thì sẽ tải những tkqc đó,
        mặc định không chọn sẽ tải hết trong bảng</p>
    Button @click="onDownload" "Tải xuống"
emit: (e:'export', format: ExportFormat)
onDownload → emit('export', format); đóng popover (v-model open = false)
```

**Sửa `Table.vue`:**
1. Thay dòng 16 (button stub) bằng:
   `<ExportMenu v-if="tools.includes('download')" @export="exportData" />`
2. Import `ExportMenu` + `exportTable`, `ExportFormat` từ composable.
3. Thêm handler:
```ts
function exportData(format: ExportFormat) {
  const cols = visibleColumns.value.map(c => ({ field: c.field, name: c.name, type: c.type }))
  const selected = props.checkedConfig.selected
  const allRows = props.data.map(r => r.data ?? r)         // object phẳng
  const rows = selected.length
    ? allRows.filter(r => selected.includes(String(r[props.table_info.key_id])))
    : allRows
  const today = new Date().toISOString().slice(0, 10)       // YYYY-MM-DD
  const fileName = `smit-adscheck-${props.table_info.name}-${today}`
  exportTable({ rows, columns: cols, format, fileName, formatCopyValue: props.formatCopyValue })
}
```

**Lưu ý:**
- `visibleColumns` đã đúng thứ tự + loại cột ẩn + không gồm checkbox → dùng trực tiếp.
- `props.data` phần tử là `RowData` (`{ data: {...} }`) → map `.data`. Khớp cách `rangeRows` làm (`Table.vue:2241`).
- Edge: `props.data` rỗng → vẫn xuất file chỉ có header (không chặn; hoặc toast "Không có dữ liệu" — quyết khi làm, ưu tiên KISS: cho xuất header).
- Toast thành công: dùng `vue-sonner` nếu Table đã import sẵn (verify); nếu chưa, bỏ qua (YAGNI).

## Related Code Files
- Create: `packages/shared-ui/src/components/ui/table/ExportMenu.vue`
- Modify: `packages/shared-ui/src/components/ui/table/Table.vue` (dòng 16 + script: import + handler)
- Reuse: composable Phase 1, `Popover`/`RadioGroup`/`Button`/`Icon` từ shared-ui

## Implementation Steps
1. Verify import path Popover/RadioGroup trong shared-ui (xem component khác dùng thế nào, vd CustomColumn.vue).
2. Viết `ExportMenu.vue`.
3. Sửa `Table.vue`: import + thay dòng 16 + thêm `exportData`.
4. Build shared-ui + chạy app adaccounts, click thử 3 định dạng (có/không tích dòng).

## Success Criteria
- [ ] Click "Tải xuống" mở Popover đúng UI (3 radio + mô tả + button), mặc định `.xlsx`.
- [ ] Không tích → tải hết; tích N dòng → tải đúng N dòng.
- [ ] Cột + thứ tự file khớp bảng đang hiển thị; ẩn 1 cột → file không có cột đó.
- [ ] `status` ra text tiếng Việt, `balance` ra số.
- [ ] Tên file `smit-adscheck-ad-accounts-<YYYY-MM-DD>.<ext>`.
- [ ] AdAccountTable không sửa dòng code nào.

## Risk Assessment
- **Import path component sai** → verify bước 1 theo CustomColumn.vue. Thấp.
- **Popover trong toolbar bị overflow/clip** → kiểm tra z-index/portal (reka-ui Popover render teleport, thường ổn). Thấp.
- **`row.data ?? r` lệch shape** → đã khớp `rangeRows`. Thấp.
