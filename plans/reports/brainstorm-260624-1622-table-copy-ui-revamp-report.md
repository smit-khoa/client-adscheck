# Brainstorm — Chỉnh sửa chức năng copy bảng (shared-ui Table)

- Date: 2026-06-24
- Branch: smit-khoa/feat-custom-table
- Scope: `packages/shared-ui` (Table range-copy)
- Mode: brainstorm (no impl yet)

## Problem statement
3 thay đổi UX cho Excel-like range-copy của data-grid Table:
1. Đổi màu bôi đen vùng chọn → `#E5F0EB`.
2. Range-actions toolbar đổi giao diện theo ảnh mẫu (nền trắng, icon xám/đen).
3. Settings: bỏ Dialog picker → Dropdown chỉ 1 checkbox "Copy cả tiêu đề cột", lưu localStorage cho lần sau.

## Requirements (chốt với Sếp)
- **Expected output:** Table range-copy có màu chọn mới + toolbar mới + settings dropdown 1 checkbox; trạng thái copyHeader persist global.
- **Acceptance:**
  - Cell trong range = solid `#E5F0EB`; cell ngoài range trong suốt.
  - Header cột được chọn: nền nhạt hơn body + **text màu đen**.
  - Toolbar range-actions: nền trắng solid, icon copy + gear màu xám đậm/đen, hover nền xám nhạt.
  - Click gear → mở Dropdown (KHÔNG phải Dialog) chứa 1 `Checkbox` "Copy cả tiêu đề cột".
  - Toggle checkbox lưu localStorage key global; reload vẫn nhớ.
  - Nút copy: copy TOÀN BỘ range hiện chọn, kèm header nếu checkbox bật.
- **Out of scope:** tính năng chọn cột con (multi-field picker) + hệ thống preset → **bỏ hoàn toàn**.
- **Constraints:** chỉ sửa `packages/shared-ui` (1 PR shared, additive-ish nhưng đây là module nội bộ table, không app nào import trực tiếp picker/preset). Vue 3 + reka-ui design system. Comment tiếng Anh.
- **Touchpoints:**
  - `packages/shared-ui/src/components/ui/table/Table.vue` (template + CSS import)
  - `packages/shared-ui/src/components/ui/table/style.css` (range colors + toolbar)
  - `packages/shared-ui/src/components/ui/table/composables/use-range-copy-flow.ts` (gỡ picker/preset)
  - `packages/shared-ui/src/components/ui/table/RangeCopyPicker.vue` → **xóa**
  - `packages/shared-ui/src/components/ui/table/composables/range-copy-presets.ts` → **xóa**
  - `.../composables/__tests__/range-copy-presets.test.ts` → **xóa**
  - `.../composables/__tests__/use-range-copy.test.ts` → giữ phần copy-core
  - DropdownMenu / Checkbox shared-ui → tái dùng (đã có sẵn)

## Chosen approach (Hướng A — đơn giản hóa)
Bỏ toàn bộ logic preset/picker. `handleCopyShortcut()` luôn copy full range với `includeHeader = copyHeader` đọc từ localStorage global. Settings chỉ toggle copyHeader qua dropdown.

### Pros
- KISS — khớp đúng mô tả, xóa ~250 dòng logic preset + 1 component Dialog.
- Tái dùng `DropdownMenu`/`DropdownMenuContent` + `Checkbox` shared-ui, không hand-roll.
- Self-contained trong table module → không phá vỡ app khác.

### Cons
- Mất tính năng chọn cột con (multi-field) — Sếp đã chấp nhận.

### Rejected: Hướng B (giữ picker khi copy)
Mâu thuẫn với "settings chỉ 1 checkbox", phức tạp hơn, giữ code preset không cần thiết.

## Design decisions (chốt)

### 1. Range colors (`style.css`)
- `.row-cell.range-cell` → `background: #E5F0EB !important` (phẳng, bỏ phân cấp primary).
- `.row-cell.range-cell.range-cell--primary` → cùng `#E5F0EB` (không đậm hơn).
- `.header-cell.range-col` → nền nhạt hơn body (đề xuất `#F0F7F3`) + `color: #000`.
- `.header-cell.range-col.range-col--primary` → cùng vậy, text đen.

### 2. Range-actions toolbar
- `.range-actions`: `background: #fff`, bỏ/làm mờ border, giữ bo góc + shadow nhẹ.
- `.range-actions__btn`: `color: #374151` (xám đậm) thay `--primary`; hover nền xám nhạt (vd `#f3f4f6`).

### 3. Settings dropdown (`Table.vue` + `use-range-copy-flow.ts`)
- Thay `<button settings>` bằng `DropdownMenu` → `DropdownMenuTrigger`(gear) → `DropdownMenuContent` chứa label + `Checkbox` "Copy cả tiêu đề cột".
- localStorage global: key `range_copy_include_header` ("1"/"0"). Helper get/set nhỏ (đặt trong `use-range-copy-flow.ts` hoặc file mới `range-copy-settings.ts` — quyết định khi plan).
- `handleSettings()` cũ bị bỏ; `handleCopyShortcut()` rút gọn còn: lấy range → getCopyEntries → cap check → copy full với copyHeader.

### 4. Cleanup
- Xóa `RangeCopyPicker.vue`, `range-copy-presets.ts`, `range-copy-presets.test.ts`.
- Gỡ import + `<RangeCopyPicker>` block + picker state khỏi `Table.vue` & flow.
- Key localStorage cũ `range_copy_presets_*`: **để kệ** (không viết code dọn).

## Risks
- `use-range-copy.test.ts` có thể import từ presets → kiểm tra, gỡ phần liên quan.
- Đảm bảo gỡ hết reference picker trong Table.vue (template dòng ~534, import ~570, state).
- Màu hardcode hex (không qua token) — chấp nhận theo yêu cầu Sếp (giá trị cố định).

## Verification
- `pnpm --filter @mf2/shared-ui test`
- `pnpm --filter @mf2/shared-ui typecheck` + build
- Manual: chọn range → màu #E5F0EB; toolbar trắng; gear → dropdown; toggle header → copy có/không header; reload nhớ trạng thái.

## Docs to update (sau impl)
- `.claude/features/shared-ui-data-grid-table.md`: gỡ mục RangeCopyPicker + preset, mô tả settings dropdown mới.
- (tùy chọn) lesson nếu gặp footgun khi gỡ.

## Next step
→ `/ck:plan` (default) để tách phase: (1) màu + toolbar CSS, (2) settings dropdown + localStorage, (3) cleanup picker/preset + docs.

## Unresolved questions
- Mã hex chính xác cho header nền (`#F0F7F3`?) và hover toolbar (`#f3f4f6`?) — em đề xuất, Sếp chỉnh khi review impl nếu cần.
