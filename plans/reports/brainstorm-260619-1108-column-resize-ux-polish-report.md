# Brainstorm — Polish trải nghiệm resize cột (DataGrid Table)

> Date: 2026-06-19 11:08 | Branch: smit-khoa/feat-custom-component | Scope: Polish (giữ kiến trúc)

## Problem statement
Trải nghiệm kéo-thả chỉnh kích thước cột trong DataGrid (`Table.vue`) còn 3 điểm khó chịu:
1. Vùng bắt chuột resizer chỉ 4px → khó trúng, dễ bấm nhầm nút sort/drag/dropdown kế bên.
2. Cảm giác kéo chưa mượt/chuyên nghiệp (vạch preview 1px mảnh, hover nhảy width 4→6px, không có số px).
3. Cột đóng băng có giới hạn max width (đã clamp ở code) nhưng **không có feedback** → user tưởng lag/lỗi khi vạch đứng im.

## Codebase context (verified)
- DataGrid dùng chung: `packages/shared-ui/src/components/ui/table/Table.vue` (~4269 LOC).
- Resize handlers: `startResize`/`handleResize`/`stopResize` — `Table.vue:2678-2755`.
- Cơ chế hiện tại: **preview-line + apply-on-release** (kéo chỉ di chuyển vạch xanh 1px, thả mới resize thật → tránh reflow). Min width hardcode 80px.
- Clamp max cột frozen: `getMaxColumnWidth` — `Table.vue:3471-3485` (non-pivot, dựa `maxFrozenWidth - otherFrozenWidth`). Đã clamp trong `handleResize` (2712-2715) nhưng thiếu feedback.
- CSS: `.column-resizer` (`style.css:493`, 4px, hover→6px đổi màu primary), `.resize-preview-line` + `body.resizing-column` (`Table.vue:4089`, 4105). Tooltip cũ đang bị comment (`style.css:515`).
- Double-click resizer = reset về default width (`resetColumnWidth`, 2757), GIỮ NGUYÊN.

## Requirements chốt với user
- **Pain chính:** hit-area 4px khó trúng + cảm giác chưa mượt + **thêm feedback giới hạn kéo cột đóng băng**.
- **Phạm vi:** Polish — giữ kiến trúc preview-line, không refactor.
- **Thiết bị:** chỉ desktop (chuột/trackpad), KHÔNG touch.
- **Ghost line:** CÓ — hiện vạch trần mờ tại maxWidth ngay khi bắt đầu kéo cột frozen.
- **Tooltip px:** bám đầu vạch preview, di chuyển theo chuột.

## Solution (approved)

### A. Hit-area dễ trúng (Pain 1)
- Mở rộng vùng bắt chuột `.column-resizer` lên ~8-10px, vạch hiển thị vẫn mảnh (pseudo `::before`).
- Dịch resizer hơi ra mép phải (`right: -4px`) + z-index cao để tách cụm nút bên trái.
- Vạch màu chỉ sáng khi hover đúng vùng resizer (không sáng khi hover cả header).

### B. Mượt & chuyên nghiệp (Pain 2)
- Vạch preview: 2px + box-shadow nhẹ + bo nhẹ.
- Tooltip số px bám đầu vạch preview (vd `240px`), dùng `previewPosition` sẵn có + thêm reactive `previewWidth`.
- Khi `isResizing`: highlight nền header cột đang kéo.
- Bỏ nhảy width hover (4→6px) → giữ vạch mảnh cố định, chỉ đổi màu/đậm.

### C. Feedback giới hạn cột đóng băng (Pain 3 — quan trọng nhất)
- Reactive `isAtMaxLimit` set trong `handleResize` khi `newWidth` bị clamp.
- Khi chạm trần: vạch preview đổi màu `--destructive`, tooltip đổi `Tối đa Xpx`.
- **Ghost line:** khi bắt đầu kéo cột frozen non-pivot, render vạch mờ tại vị trí `maxWidth` (báo trước "kéo được tới đây").
- KHÔNG đổi logic clamp (đã đúng).

## Touchpoints
| File | Thay đổi |
|------|----------|
| `Table.vue` template (~138) | Tooltip px theo vạch preview + ghost max-line |
| `Table.vue` `handleResize` (~2705) | Set `isAtMaxLimit`, `previewWidth`; tính vị trí ghost từ `getMaxColumnWidth` |
| `Table.vue` state (~914) | + reactive: `previewWidth`, `isAtMaxLimit`, `maxLimitPosition` |
| `style.css` (~493) + `Table.vue` CSS (~4089) | Hit-area, vạch preview đẹp hơn, màu cảnh báo, tooltip, ghost line |

## Out of scope (YAGNI)
- Touch/pointer events, tablet.
- Live-resize (resize thật khi kéo).
- Auto-fit theo nội dung (đổi nghĩa double-click).
- Tách composable `use-column-resize`.

## Success criteria
- Vùng kéo trúng dễ hơn (≥8px), không bấm nhầm nút kế bên.
- Khi kéo thấy số px realtime bám vạch preview.
- Cột frozen: thấy ghost line max ngay khi bắt đầu kéo; chạm trần → vạch đỏ + tooltip "Tối đa Xpx".
- Giữ nguyên emit `column-resize`, `saveColumnState`, double-click reset, virtualization.

## Risks
- Vùng hit-area chồng drag-handle cột kế bên → cần test mép cột.
- Ghost line phải tính đúng theo scrollLeft (giống `columnStartPosition`).
- Đây là shared-ui (MF singleton) → thay đổi additive, không phá API. Chỉ thêm CSS/internal state, không đổi props/events public.

## Unresolved questions
- Không có. Tất cả đã chốt.
