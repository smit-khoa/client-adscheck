# Brainstorm Report — Export Bảng Dữ Liệu (Tải xuống .txt/.csv/.xlsx)

**Ngày:** 2026-06-20 14:17 · **Branch:** `smit-khoa/feat-export-data-table` · **Flags:** none

---

## 1. Problem statement & requirements

Thêm chức năng export bảng dữ liệu (ad accounts / TKQC) ra file. Button "Tải xuống" trên toolbar sổ ra panel chọn định dạng → tải dữ liệu đang hiển thị trong bảng.

**Yêu cầu cụ thể (đã chốt với Sếp):**

| # | Yêu cầu |
|---|---------|
| Expected output | Button "Tải xuống" mở Popover panel: 3 radio (.txt/.csv/.xlsx) + dòng mô tả + button "Tải xuống" xác nhận. Bấm → trình duyệt tải file. |
| Acceptance | (a) Không tích dòng nào → xuất **hết** bảng. (b) Có tích tkqc → chỉ xuất các dòng đã tích. (c) Cột xuất theo **cột đang hiển thị, đúng thứ tự bảng**. (d) Số giữ nguyên, dữ liệu custom (vd status) ra text đẹp. (e) Header = tên cột tiếng Việt. (f) Bỏ cột checkbox/STT. |
| Scope OUT | Không style màu/border trong xlsx. Không xuất cột đang ẩn. Không thêm cột STT. Không export server-side. |
| Constraints | Vue 3 + shared-ui. Thay đổi **additive** trong `packages/shared-ui` (isolation layer 1). Tái dùng component shared-ui, không hand-roll. |
| Touchpoints | `Table.vue` (button + handler), `use-range-copy.ts` (buildTSV), `AdAccountTable.vue` (đã bật `tools:['download']` + có `formatCopyValue`). |

---

## 2. Quyết định đã chốt (qua AskUserQuestion)

| Hạng mục | Lựa chọn | Lý do |
|----------|----------|-------|
| **Thư viện** | SheetJS (`xlsx`) — 1 dep | KISS: 1 lib làm cả .txt/.csv/.xlsx + tự trigger download. Không cần `file-saver`. |
| **Vị trí logic** | Trong `Table.vue` (shared-ui) | Generic: mọi bảng bật `tools:['download']` đều export được. Tái dùng selection + formatCopyValue. |
| **Phạm vi cột** | Cột hiển thị, đúng thứ tự (`columnsApply`/`visibleColumns`) | Tôn trọng ẩn/hiện & sắp xếp cột của user. Khớp "cột đã có trong bảng". |
| **Phạm vi dòng** | Tích → xuất dòng tích; không tích → xuất hết | Đúng mô tả Sếp. |
| **Cột phụ trợ** | Bỏ checkbox + STT, chỉ cột nghiệp vụ | File sạch. |
| **UX dropdown** | Radio chọn 1 định dạng + button xác nhận, mặc định `.xlsx` | Khớp mô tả Sếp. |
| **Kiểu .txt** | Tab-separated (TSV) | Tái dùng `buildTSV`, mở Excel/Notepad đều đẹp. |
| **Tên file** | `smit-adscheck-<table>-<YYYY-MM-DD>.<ext>` | VD `smit-adscheck-ad-accounts-2026-06-20.xlsx`. Generic + dễ phân biệt. |

---

## 3. Hiện trạng codebase (scout)

- **Button đã có sẵn nhưng stub** — `Table.vue:16`: render khi `tools.includes('download')`, **chưa có `@click`**. AdAccountTable đã bật sẵn.
- **Cột đúng thứ tự** — `visibleColumns` = frozen + nonFrozen; `columnsApply` đã lọc theo cài đặt user. Mỗi cột: `field`, `name`, `type`.
- **Selection** — `checkedConfig.selected: string[]` = mảng ID dòng đã tích (key = `table_info.key_id`, vd `id`). Đồng bộ Pinia.
- **Hàm convert đã tồn tại** — prop `formatCopyValue(key, row) => string | undefined`. AdAccountTable map `status→"Đang chạy"`, `paymentStatus→text`, `holdNeed`, `priskRestrictions`. Trả `undefined` → fallback giá trị gốc. **Chính là "hàm convert" Sếp nghĩ tới.**
- **Hạ tầng tái dùng** — `use-range-copy.ts`: `buildTSV()`, `escapeTSVCell()`. `buildTSV` đã nhận `formatCopyValue`.
- **Component sẵn có** — `Popover`, `RadioGroup`, `Button`, `Icon`. (Catalog: Popover = filter panel/picker → đúng use case.)
- **Chưa có** lib xlsx/csv nào trong repo.

---

## 4. Approaches đã cân nhắc

### Thư viện (đã chọn SheetJS)
- ✅ **SheetJS `xlsx`**: 1 dep, `XLSX.utils.aoa_to_sheet` + `XLSX.writeFile` ra cả 3 đuôi, tự download. Nhược: community build không tô màu xlsx (không cần).
- ❌ exceljs + file-saver: 2 deps, nặng hơn, code dài. Over-engineer.
- ❌ Tự viết CSV thuần (không lib) cho .txt/.csv + lib riêng cho xlsx: phải xử lý escape thủ công, mà xlsx vẫn cần lib → không tiết kiệm.

### Vị trí logic (đã chọn Table.vue)
- ✅ **Table.vue**: additive, generic, tái dùng state sẵn có.
- ❌ AdAccountTable: lặp lại mỗi bảng, không tái dùng.

---

## 5. Giải pháp đề xuất (final)

### 5.1 Kiến trúc

```
Table.vue (toolbar button "Tải xuống")
   └─ Popover panel (component mới: ExportMenu.vue trong table/)
        ├─ RadioGroup: .xlsx (default) / .csv / .txt
        ├─ <p> mô tả: "Khi tích chọn tkqc cụ thể thì sẽ tải những tkqc đó,
        │             mặc định không chọn sẽ tải hết trong bảng"
        └─ Button "Tải xuống" → emit('export', format)

Table.vue handler exportData(format)
   ├─ chọn rows: selected.length ? data.filter(in selected) : data
   ├─ chọn cols: columnsApply (đang hiển thị, đúng thứ tự, bỏ checkbox/STT)
   ├─ build matrix (AoA): [header tiếng Việt] + rows
   │     cell = formatCopyValue(field, row) ?? row[field]   // số giữ nguyên, custom ra text
   └─ composable mới use-table-export.ts:
        ├─ .txt → buildTSV(...) → Blob → download
        ├─ .csv → XLSX.utils.sheet_to_csv / aoa→csv → download
        └─ .xlsx → XLSX.utils.aoa_to_sheet → XLSX.writeFile
```

### 5.2 Files thay đổi

| File | Loại | Nội dung |
|------|------|----------|
| `packages/shared-ui/package.json` | sửa | thêm dep `xlsx` |
| `packages/shared-ui/src/components/ui/table/ExportMenu.vue` | **mới** | Popover + RadioGroup + button; emit `export(format)` |
| `packages/shared-ui/src/components/ui/table/composables/use-table-export.ts` | **mới** | hàm `exportTable(rows, columns, {format, fileName, formatCopyValue})`; build AoA + ghi file 3 định dạng |
| `packages/shared-ui/src/components/ui/table/Table.vue` | sửa | thay button stub (line 16) bằng `<ExportMenu @export="exportData" />`; thêm handler `exportData()` gom rows+cols |
| `.claude/features/shared-ui-data-grid-table.md` | sửa | thêm mục Export |
| `.claude/components-catalog.md` | sửa (nếu cần) | note ExportMenu thuộc Table |

> **Lưu ý isolation:** chỉ chạm `packages/shared-ui` + AI memory. **Không** mix với `apps/*` trong cùng commit (layer 2). AdAccountTable không cần sửa code (đã có `formatCopyValue` + `tools:['download']`).

### 5.3 Logic convert dữ liệu (chi tiết)

```
cell(field, row):
  v = formatCopyValue?.(field, row)   // custom → "Đang chạy", text tiếng Việt...
  if v !== undefined: return v
  return row[field]                    // số/chuỗi gốc giữ nguyên
```

- Với `.xlsx`: số (`row.balance`) đẩy **nguyên kiểu number** vào cell để Excel nhận đúng dạng số (không phải khi đã qua formatCopyValue thì là string). → **Quy tắc:** field không có trong formatCopyValue & `typeof === 'number'` → giữ number; còn lại → string.

---

## 6. Rủi ro & lưu ý

| Rủi ro | Mức | Xử lý |
|--------|-----|-------|
| `formatCopyValue` chỉ cover vài field → cột custom khác (render qua slot) ra giá trị thô | Trung bình | Đã thống nhất: số giữ nguyên, field nào muốn "đẹp" → bổ sung mapping vào `formatCopyValue`. Ngoài scope lần này. |
| Bảng rất lớn (vạn dòng) làm UI đơ khi build file | Thấp | Export client-side đồng bộ; dữ liệu bảng vốn đã giới hạn (extension fetch). Theo dõi, chưa cần web worker (YAGNI). |
| Bundle size tăng do `xlsx` (~xxx KB) | Thấp | Chấp nhận; lib cốt lõi cho feature. Có thể dynamic import lib khi bấm tải để không nặng initial load. |
| Tên cột trùng / field nested | Thấp | Header dùng `column.name`; cell theo `field` phẳng. Sub-fields (copyFields) — lần này **không** mở rộng, chỉ field chính. |
| Số dạng tiền có thể bị Excel tự đổi locale | Thấp | Đẩy raw number, để Excel format; không nhồi separator thủ công. |

---

## 7. Success metrics / validation

1. Không tích dòng → file chứa **toàn bộ** dòng bảng. ✅
2. Tích 3 tkqc → file chứa **đúng 3 dòng** đó. ✅
3. Thứ tự + tập cột trong file == cột đang hiển thị (sau ẩn/hiện, sắp xếp). ✅
4. Cột `status` ra "Đang chạy" (không phải `1`); cột `balance` ra số. ✅
5. 3 định dạng .txt/.csv/.xlsx đều mở được, tên file `smit-adscheck-ad-accounts-2026-06-20.<ext>`. ✅
6. Bảng khác bật `tools:['download']` cũng export được mà không sửa thêm. ✅

---

## 8. Next steps

- Chạy `/ck:plan` để chia phase triển khai (report này là input).
- Đề xuất phase: (1) add dep + composable `use-table-export` + unit test build AoA/CSV; (2) `ExportMenu.vue` + wire `Table.vue`; (3) cập nhật feature doc + catalog.

## Unresolved questions
- Có cần **dynamic import** `xlsx` (lazy load khi bấm tải) để giảm bundle initial không? → đề xuất: có, nhưng để phase implement quyết theo đo lường. Không chặn thiết kế.
