---
phase: 2
title: "Polish preview-line + tooltip px"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Polish preview-line + tooltip px

## Overview
Làm vạch preview rõ/đẹp hơn và hiện số px realtime bám đầu vạch khi kéo, để cảm giác kéo mượt và
chuyên nghiệp như Excel/Sheets. Tái dùng `previewPosition` đã có, chỉ thêm reactive `previewWidth`.

## Requirements
- Functional: khi kéo, tooltip hiện `<width>px` bám đầu vạch preview, cập nhật realtime; header cột đang kéo được highlight nhẹ.
- Non-functional: không reflow body khi kéo (giữ apply-on-release); chỉ thêm internal reactive, không đổi props/events.

## Architecture
- Thêm reactive `previewWidth` (số px hiện tại đang kéo) cập nhật trong `handleResize` cùng `previewPosition`.
- Template: thêm `<div class="resize-tooltip">` con của/bám theo `.resize-preview-line` (cùng `left = previewPosition`, đặt gần đỉnh), nội dung `{{ previewWidth }}px`. Chỉ render khi `isResizing`.
- Vạch preview: 2px + `box-shadow` nhẹ + bo nhẹ (CSS thuần).
- Highlight header cột đang kéo: bind class theo `resizingColumn.field` (vd `is-resizing-target`) vào header-cell tương ứng (frozen + non-frozen template).

## Related Code Files
- Modify: `Table.vue` state (~914-918) — thêm `const previewWidth = ref<number>(0)`.
- Modify: `Table.vue` `handleResize` (~2705-2719) — set `previewWidth.value = newWidth`.
- Modify: `Table.vue` `startResize` (~2678) — khởi tạo `previewWidth.value = startWidth`.
- Modify: `Table.vue` template preview block (~138-145) — thêm tooltip div.
- Modify: `Table.vue` header-cell (~57-87 frozen, ~93-122 non-frozen) — bind class highlight target.
- Modify: `Table.vue` CSS (`.resize-preview-line` ~4089) + `style.css` — style tooltip, preview, highlight.

## Implementation Steps
1. Thêm `previewWidth` ref; set trong `startResize` (= `startWidth`) và `handleResize` (= `newWidth` sau clamp).
2. Template: trong block `v-if="isResizing"`, thêm `<div class="resize-tooltip" :style="{ left: previewPosition + 'px' }">{{ Math.round(previewWidth) }}px</div>` (hoặc gộp vào wrapper cùng vạch).
3. CSS `.resize-tooltip`: nổi gần đỉnh vạch, nền tối, chữ trắng, `border-radius`, `pointer-events:none`, `z-index` trên preview; căn để "bám đầu vạch".
4. CSS `.resize-preview-line`: 2px, `box-shadow: 0 0 4px var(--primary)`, bo nhẹ.
5. Highlight: bind `:class="{ 'is-resizing-target': isResizing && resizingColumn?.field === column.field }"` ở cả 2 nhánh header; CSS đổi nền nhẹ.
6. Verify: kéo cột thường → số px chạy mượt theo chuột; thả → width đúng số tooltip cuối; không giật.

## Success Criteria
- [ ] Tooltip `<px>` bám đầu vạch preview, cập nhật realtime khi kéo.
- [ ] Vạch preview rõ hơn (2px + bóng), không gây reflow body.
- [ ] Header cột đang kéo được highlight nhẹ.
- [ ] Width sau khi thả khớp số px tooltip hiển thị cuối cùng.

## Risk Assessment
- Tooltip bám "đầu vạch" cần đặt theo `previewPosition` (đã tính theo scrollLeft) → dùng lại biến này, không tự tính lại.
- `previewWidth` phải set SAU clamp để hiển thị đúng số thực sẽ apply (đồng bộ Phase 3).
- Nhiều chỗ template lặp (frozen/non-frozen) → đảm bảo sửa cả 2 nhánh, tránh lệch.
