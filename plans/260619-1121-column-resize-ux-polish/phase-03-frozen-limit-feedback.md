---
phase: 3
title: "Feedback giới hạn cột đóng băng"
status: pending
priority: P1
effort: "2h"
dependencies: [2]
---

# Phase 3: Feedback giới hạn cột đóng băng

## Overview
Cột đóng băng đã bị clamp max width (`handleResize` 2712-2715) nhưng vạch preview đứng im khi chạm trần
→ user tưởng lag/lỗi. Thêm: (a) ghost line báo trước vị trí max khi bắt đầu kéo, (b) đổi màu cảnh báo +
tooltip "Tối đa Xpx" khi chạm trần.

## Requirements
- Functional:
  - Khi bắt đầu kéo cột frozen (non-pivot) có giới hạn hữu hạn → render vạch mờ (ghost) tại vị trí maxWidth.
  - Khi `newWidth` bị clamp = max → vạch preview đổi màu `--destructive`, tooltip đổi text "Tối đa Xpx".
- Non-functional: KHÔNG đổi logic clamp (đã đúng); chỉ thêm reactive + render; chỉ áp dụng frozen non-pivot.

## Architecture
- Reactive mới:
  - `isAtMaxLimit = ref(false)` — true khi chuột muốn kéo rộng hơn max (đã clamp).
  - `maxLimitPosition = ref<number | null>(null)` — vị trí px (theo trục như `previewPosition`) của trần, null nếu không giới hạn.
- `startResize`: nếu cột frozen non-pivot và `getMaxColumnWidth(field)` hữu hạn → tính `maxLimitPosition = columnStartPosition + (maxWidth - startWidth)`; ngược lại null.
- `handleResize`: so sánh `newWidth` mong muốn (trước clamp) với maxWidth → set `isAtMaxLimit`. `previewWidth` (Phase 2) vẫn = giá trị sau clamp.
- `stopResize`: reset `isAtMaxLimit=false`, `maxLimitPosition=null`.
- Template:
  - Ghost line: `<div v-if="isResizing && maxLimitPosition !== null" class="resize-max-line" :style="{ left: maxLimitPosition + 'px', height: ... }" />`.
  - Preview line + tooltip: bind class `{ 'is-at-max': isAtMaxLimit }`; tooltip text đổi sang `Tối đa {{ maxWidthPx }}px` khi `isAtMaxLimit`.

## Related Code Files
- Modify: `Table.vue` state (~914-918) — thêm `isAtMaxLimit`, `maxLimitPosition`.
- Modify: `Table.vue` `startResize` (~2678) — tính `maxLimitPosition` cho frozen non-pivot.
- Modify: `Table.vue` `handleResize` (~2705) — set `isAtMaxLimit` (so sánh trước clamp).
- Modify: `Table.vue` `stopResize` (~2721) — reset 2 reactive mới.
- Modify: `Table.vue` template preview block (~138) — thêm ghost line + class `is-at-max` + đổi text tooltip.
- Modify: `Table.vue` CSS (~4089) / `style.css` — `.resize-max-line`, `.is-at-max`.

## Implementation Steps
1. Thêm `isAtMaxLimit`, `maxLimitPosition` refs.
2. `startResize`: lấy `maxWidth = getMaxColumnWidth.value(field)`; nếu `Number.isFinite(maxWidth)` và cột frozen non-pivot → `maxLimitPosition.value = columnStartPosition.value + (maxWidth - startWidth.value)`, else null.
3. `handleResize`: tính `desiredWidth = Math.max(80, startWidth + diff)` (trước clamp); `isAtMaxLimit.value = !pivotMode && resizingColumn.frozen && desiredWidth > maxWidth`. Giữ clamp như cũ để `previewWidth`/`previewPosition` đúng.
4. `stopResize`: reset `isAtMaxLimit=false`, `maxLimitPosition=null` (cùng chỗ reset isResizing).
5. Template: thêm `.resize-max-line` (vạch mờ, đứt nét) tại `maxLimitPosition`; thêm class `is-at-max` cho preview-line + tooltip; tooltip hiện "Tối đa {Math.round(maxWidth)}px" khi `isAtMaxLimit`.
6. CSS: `.resize-max-line` mờ + dashed; `.resize-preview-line.is-at-max` + `.resize-tooltip.is-at-max` → màu `var(--destructive)`.
7. Verify: kéo cột frozen → thấy ghost line ngay; kéo quá trần → vạch + tooltip đỏ "Tối đa Xpx"; cột non-frozen/pivot không có ghost line.

## Success Criteria
- [ ] Kéo cột frozen non-pivot: ghost line max hiện ngay khi bắt đầu.
- [ ] Chạm trần: preview-line + tooltip chuyển đỏ, text "Tối đa Xpx".
- [ ] Cột non-frozen hoặc pivot mode: KHÔNG có ghost line, không cảnh báo.
- [ ] Logic clamp/emit/save không đổi; width apply vẫn ≤ max.

## Risk Assessment
- `maxLimitPosition` phải tính cùng hệ trục với `previewPosition` (đã gồm scrollLeft) → tái dùng `columnStartPosition`.
- `getMaxColumnWidth` trả `Infinity` cho non-frozen/pivot → guard `Number.isFinite` tránh ghost line sai.
- maxWidth phụ thuộc `frozenWidth` hiện tại; tính 1 lần ở `startResize` là đủ (width cột khác không đổi khi đang kéo).
