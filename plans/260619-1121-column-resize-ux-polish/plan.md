---
title: "Polish trải nghiệm resize cột (DataGrid Table)"
status: completed
created: 2026-06-19
branch: smit-khoa/feat-custom-component
scope: project
source: plans/reports/brainstorm-260619-1108-column-resize-ux-polish-report.md
blockedBy: []
blocks: []
---

# Polish trải nghiệm resize cột (DataGrid Table)

## Mục tiêu
Cải thiện UX kéo-thả chỉnh kích thước cột trong DataGrid dùng chung (`Table.vue`) — giữ kiến trúc
preview-line + apply-on-release hiện tại, chỉ desktop. KHÔNG refactor, KHÔNG touch, KHÔNG live-resize.

## Bối cảnh (verified)
- DataGrid: `packages/shared-ui/src/components/ui/table/Table.vue` (~4269 LOC).
- Resize handlers: `Table.vue:2678-2755` (`startResize`/`handleResize`/`stopResize`).
- Clamp max cột frozen: `getMaxColumnWidth` — `Table.vue:3471-3485`.
- CSS resizer: `style.css:493`; preview-line + body cursor: `Table.vue:4089-4108`.
- shared-ui = MF singleton → thay đổi PHẢI additive (chỉ thêm internal state + CSS, không đổi props/events public).

## Phases
| # | Phase | Status | Priority | Pain |
|---|-------|--------|----------|------|
| 1 | [Mở rộng hit-area resizer](phase-01-widen-hit-area.md) | completed | P1 | Khó trúng 4px |
| 2 | [Polish preview-line + tooltip px](phase-02-preview-polish-tooltip.md) | completed | P1 | Kéo chưa mượt |
| 3 | [Feedback giới hạn cột đóng băng](phase-03-frozen-limit-feedback.md) | completed | P1 | Thiếu báo giới hạn |

Phase độc lập, có thể verify riêng. Thứ tự đề xuất 1→2→3 (phase 3 tái dùng tooltip/preview của phase 2).

## Dependencies
- Phase 3 phụ thuộc reactive `previewWidth` + tooltip dựng ở Phase 2.
- Phase 1 độc lập hoàn toàn.

## Out of scope (YAGNI)
Touch/pointer events; live-resize; auto-fit nội dung; tách composable `use-column-resize`.

## Success criteria (toàn plan)
- [ ] Vùng kéo trúng dễ hơn (≥8px), không bấm nhầm nút sort/drag/dropdown kế bên.
- [ ] Khi kéo thấy số px realtime bám đầu vạch preview.
- [ ] Cột frozen: ghost line max hiện ngay khi bắt đầu kéo; chạm trần → vạch đỏ + tooltip "Tối đa Xpx".
- [ ] Giữ nguyên emit `column-resize`, `saveColumnState`, double-click reset, virtualization, typecheck/build pass.
