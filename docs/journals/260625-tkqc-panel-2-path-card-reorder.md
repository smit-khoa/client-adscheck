---
date: 2026-06-25
branch: smit-khoa/feat-dev-features-2
tags: [adaccounts, tool-actions, tkqc, drag-and-drop]
---

# TKQC Panel 2 Path-Card Reorder Implementation

## Context

Panel 2 của TKQC Tool Detail view hiển thị workflow steps mà user đã chọn từ Panel 1. Yêu cầu là đổi giao diện step thành white path-card và cho kéo-thả thứ tự chạy, nhưng không được làm thay đổi thứ tự catalog/group ở Panel 1.

## What Changed

- `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts`: thêm `reorderSelectedFunctions(nextIds)` để reorder riêng `selectedFunctionIds`. Hàm filter id không hợp lệ và append id bị thiếu theo thứ tự cũ để tránh mất step nếu drag event thiếu dữ liệu.
- `apps/adaccounts/src/features/adaccounts/tools/components/ToolStepFrame.vue`: thêm app-local component cho selected-step path-card, gồm drag handle, icon/title, green `Bước N` pill, nút `X`, và slot cho form body.
- `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`: dùng `vuedraggable` với computed `v-model` (`selectedStepItems`) để reorder selected workflow; tiếp tục render `ToolFunctionForm variant="panel-two"` trong expanded slot.
- `.claude/features/adaccounts-tool-actions.md`: cập nhật flow/state/gotchas cho workflow-only reorder, remove giữ form values, và `ToolStepFrame`.
- Plan `plans/260625-1411-tkqc-panel-2-step-path-card-redesign/` được sync status completed.

## Verification

- `pnpm --filter @mf2/adaccounts typecheck` — passed.
- `pnpm --filter @mf2/adaccounts build` — passed với 3 warning không chặn: CSS order và asset size.
- `pnpm verify:features` — passed.
- Code review/test/docs impact checks — không có blocker; đã áp dụng fix phòng thủ `@click.stop` cho toggle buttons trong `ToolStepFrame`.

## Decisions

| Decision | Why |
|---|---|
| Không sửa `packages/shared-ui` | `ToolStepFrame` hiện chỉ phục vụ app-local TKQC Panel 2, chưa đủ lý do đưa lên shared API. |
| Panel 2 drag chỉ reorder selected workflow | Panel 1 catalog/group order là ngữ cảnh khác và vẫn do `ToolGroupList` + localStorage riêng sở hữu. |
| Remove `X` giữ form values | Remove nghĩa là bỏ khỏi workflow hiện tại, không phải xoá cấu hình user đã nhập trong session. |
| Runner dùng `selectedFunctions` | `selectedFunctions` derive từ `selectedFunctionIds`, nên runner tự chạy theo thứ tự mới sau drag. |

## Follow-up

- Manual browser smoke chưa chạy: cần kiểm tra trực tiếp `/app/adaccounts` để xác nhận drag handle, `X`, expand/collapse, reselect giữ values, và runner order trên UI thật.
- Build warnings CSS order/asset size là không chặn trong task này; theo dõi riêng nếu cần dọn warning sau.
