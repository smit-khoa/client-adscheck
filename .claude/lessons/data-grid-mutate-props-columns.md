---
slug: data-grid-mutate-props-columns
scope: ui
status: active
---

## Symptom
Trên `@mf2/shared-ui` `Table`, click "Đóng băng cột này" trên 1 cột khi `totalTableWidth ≤ viewportWidth` → cột vừa freeze BIẾN MẤT khỏi DOM (cả header lẫn body), chỉ còn checkbox sticky + các cột non-frozen. State Pinia (selectedIds...) không đổi, không có lỗi console.

## Root cause
`currentColumns` từng là `computed` đọc `props.columns` rồi `filter().sort()` — trả mảng MỚI nhưng chứa CÙNG reference object với `props.columns[i]`. `toggleFreeze` mutate `column.frozen = !column.frozen` thực ra mutate vào object thuộc `props.columns`. Caller (vd `AdAccountTable.vue`) khai báo columns dạng plain literal:
```ts
const columns = [{ field: 'name', name: 'Tên...', width: 280 }, ...]
```
→ object KHÔNG reactive. Mutate `col.frozen` không trigger bất kỳ tracker nào của Vue → các computed downstream (`frozenColumns`/`nonFrozenColumns`) không re-eval ĐÚNG: cột bị loại khỏi `nonFrozenColumns` (do `!col.frozen` lọc bằng giá trị raw đã đổi) nhưng cũng không xuất hiện trong `frozenColumns` (cache cũ). Kết quả: cột "lọt khe" giữa 2 nhánh render và biến mất.

## How to avoid
- Component shared-ui KHÔNG được mutate props (one-way data flow). Clone props.columns sang internal `ref<Column[]>` rồi mutate clone đó — mọi computed bind vào internal sẽ re-eval đúng.
- Khi xây computed trả lại mảng object từ props, nhớ: spread `{...col}` (shallow clone) nếu downstream sẽ mutate field con, để cô lập state.
- Caller có thể truyền plain literal — đừng giả định props reactive ở mức field con.

## Related
[[shared-ui-data-grid-table]] [[adaccounts-account-list]]
