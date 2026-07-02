---
type: brainstorm-report
topic: shared-ui-table-transparent-css
date: 2026-06-24
status: approved-design
modes: []
---

# Brainstorm — Shared UI Table Transparent CSS

## Summary

Sếp muốn sửa `Table` trong `packages/shared-ui` để bảng mặc định trong suốt, thay vì còn thấy nền đen/tối hiện tại.

Quyết định đã chốt:
- Phạm vi: toàn `shared-ui` Table.
- Mức trong suốt: container, header, row, cell đều transparent.
- Stripe: bỏ nền xen kẽ row.

## Problem statement

Data-grid đang dùng token nền như `var(--background)` / `var(--muted)` và inline `background: getCellBackground(...)`. Trong dark theme, các token này tạo cảm giác bảng có mảng nền đen, không hòa vào workspace background.

## Requirements

| Item | Requirement |
|------|-------------|
| Expected output | `Table` mặc định trong suốt trong `packages/shared-ui` |
| Acceptance criteria | Không còn nền đen từ shared-ui Table; border/text/selection/range highlight vẫn nhìn được |
| Scope boundary | Không sửa data, selection, export, resize, drag, pagination, API props |
| Constraints | `shared-ui` là MF singleton, thay đổi ảnh hưởng mọi app dùng `@mf2/shared-ui/table` |
| Touchpoints | `packages/shared-ui/src/components/ui/table/style.css`, `packages/shared-ui/src/components/ui/table/Table.vue`, `.claude/features/shared-ui-data-grid-table.md` |

## Evaluated approaches

### 1. Đổi mặc định Table sang transparent toàn bộ — selected

Pros:
- Đúng yêu cầu nhất.
- Không cần app truyền prop mới.
- KISS: đổi style hiện có, không thêm API.

Cons:
- Ảnh hưởng toàn bộ app dùng shared Table.
- Header trong suốt có thể khó đọc trên nền phức tạp.
- Bỏ stripe làm bảng nhiều dòng kém phân biệt hơn.

### 2. Thêm prop/variant transparent

Pros:
- An toàn hơn cho MF singleton.
- Chỉ bật ở adaccounts/workspace.

Cons:
- Thêm API chưa cần thiết.
- Phải sửa consumer.
- Không đúng quyết định “toàn shared-ui”.

### 3. Chỉ bỏ nền body, giữ header mờ

Pros:
- Giữ readability header.
- Ít rủi ro hơn.

Cons:
- Không đạt “trong suốt hết”.
- Vẫn còn mảng màu header.

## Recommended implementation design

1. Update CSS backgrounds:
   - `.data-grid-container` → transparent.
   - `.header-row`, `.header-cell`, `.grid-header*` → transparent.
   - `.grid-row`, `.row-odd`, `.row-even`, `.group-row` default backgrounds → transparent.
   - `.filter-row`, `.filter-cell`, empty/footer backgrounds if present → transparent.

2. Update inline cell background source:
   - `getCellBackground(...)` should return `transparent` for normal/stripe/frozen/default cases.
   - Keep intentional overlays:
     - selected row/cell override.
     - range-select highlight.
     - explicit highlight classes if user applied color-highlighting.

3. Preserve public API:
   - No new prop.
   - No breaking type changes.
   - Keep `stripe` prop for API compatibility, but its visual background becomes transparent.

4. Docs:
   - Update `.claude/features/shared-ui-data-grid-table.md` Decisions/Gotchas with transparent default behavior.

## Risks

- Global visual change in any app using `Table`.
- Transparent header/cell readability depends on parent background.
- Some inline backgrounds may remain if not handled in `Table.vue`.

## Validation criteria

Run:
- `pnpm --filter @mf2/shared-ui typecheck`
- `pnpm verify:features`
- Prefer `pnpm verify:all` because shared-ui singleton behavior/documentation changed.

Manual smoke:
- Adaccounts TKQC/BM/Page tables no longer show black table background.
- Header and frozen columns transparent.
- Row selection/range-copy highlight still visible.
- Toolbar/buttons still readable.

## Next steps

Proceed to implementation with narrow shared-ui CSS/inline-background changes, then update feature doc and verify.

## Unresolved questions

None.
