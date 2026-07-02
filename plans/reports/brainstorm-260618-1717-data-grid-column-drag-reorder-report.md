---
type: report
created: 2026-06-18
status: approved
feature: shared-ui-data-grid-table
---

# Brainstorm — Data-grid Header Column Drag Reorder

## Summary

Add direct column reorder on the shared-ui `Table` header.

Approved direction:
- User drags a 6-dot handle in each header cell.
- Reorder only inside the same column zone: frozen with frozen, non-frozen with non-frozen.
- Persist order immediately to `localStorage.config_column[config_<table_info.name>]`.
- Use smooth professional feedback: drag ghost, drop indicator, and lightweight column movement preview.

## Codebase Findings

- Project is Vue 3 + TypeScript + Tailwind CSS v4 + Rspack Module Federation monorepo.
- Table feature lives in `packages/shared-ui/src/components/ui/table/Table.vue` and `style.css`.
- Existing Table already supports virtual columns, frozen columns, resize, custom-column modal, range-select/copy, sorting, paging.
- `currentColumns`, `columnsApply`, `frozenColumns`, `nonFrozenColumns`, and `visibleColumns` already form the ordering pipeline.
- Existing icon sprite already includes `grip-horizontal` and `grip-vertical`; no new icon dependency needed.
- Feature doc to update after implementation: `.claude/features/shared-ui-data-grid-table.md`.

## Requirements

### Expected Output

A user can reorder columns directly in the table header by dragging a 6-dot handle.

### Acceptance Criteria

- 6-dot drag handle appears in every reorderable header cell.
- Dragging the handle starts column reorder; clicking header text/menu/resize still behaves normally.
- Non-frozen columns can be reordered among non-frozen columns.
- Frozen columns can be reordered among frozen columns.
- Dragging across frozen/non-frozen boundary is blocked or snaps back; it must not auto-freeze/unfreeze.
- On drop, new order updates the visible table immediately.
- New order is persisted to localStorage under existing `config_column` table config.
- Existing column resize, dropdown menu, sorting, frozen columns, range-select, and virtual horizontal scroll must still work.
- `pnpm --filter @mf2/shared-ui typecheck` or closest available verification passes.
- `pnpm verify:all` passes because shared-ui feature docs/catalog boundaries are touched.

### Out of Scope

- No new drag-and-drop dependency.
- No app-level persistence API or server sync.
- No touch/mobile drag polish unless it falls out naturally from pointer events.
- No group/pivot data logic refactor.
- No changes to app consumers unless needed for verification/demo.

## Evaluated Approaches

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Native pointer events in `Table.vue` | No new dependency; full control with virtualization/frozen zones; smallest bundle impact | More manual math; must avoid conflicts with resize/range-select | Recommended |
| Add DnD library | Faster high-level drag behavior; possible smoother defaults | Adds dependency to shared-ui singleton; may fight virtual columns/sticky frozen; heavier PR | Not recommended now |
| Only improve `CustomColumn.vue` modal drag | Lowest table risk; existing modal already uses vuedraggable | Does not meet direct header UX request | Not enough |

## Recommended Design

### Interaction Model

- Add a small 6-dot handle using existing `<Icon name="grip-vertical" />` inside header cells.
- Only handle has `cursor: grab`; header cell itself keeps normal behavior.
- `pointerdown` on handle captures:
  - dragged field
  - zone: `frozen` or `non-frozen`
  - pointer start position
  - column widths and visible order snapshot
- During drag:
  - show a ghost chip with column name near pointer
  - show a vertical insertion indicator between candidate columns
  - optionally apply lightweight transform to nearby header cells for polish
- On pointerup:
  - if valid target in same zone, reorder array
  - if invalid/cancel, restore preview only

### Reorder Logic

- For non-frozen columns: reorder `columnsApply` order for non-frozen fields only; keep frozen fields unaffected.
- For frozen columns: reorder `frozenOrder`; keep frozen status unchanged.
- Keep `currentColumns` as the internal canonical columns list, but avoid mutating `props.columns`.
- Persist using the same localStorage shape already read by `computeOrderedColumns()`.

### Zone Boundary Rule

Chosen rule: same-zone only.

Why:
- Frozen columns use sticky positioning and `frozenOrder`.
- Non-frozen columns use virtual offsets and horizontal scroll.
- Auto freeze/unfreeze while dragging is powerful but risky and can surprise users.

### Persistence

On successful drop:
- Read existing `config_column` object.
- Update `config_<table_info.name>` with ordered visible/configured fields plus current frozen flags.
- Preserve unrelated table configs.
- Save immediately.

Need care:
- Preserve hidden columns too, likely after visible ordered fields, so custom-column modal does not lose them.
- Guard `JSON.parse(localStorage)` to avoid broken config crashing drag; this can be a small helper, not broad refactor.

## UX Details

- Handle hidden/low opacity until hover, but always accessible enough to discover.
- While dragging:
  - body gets `user-select: none`.
  - handle becomes `grabbing`.
  - dragged header has elevated shadow/scale.
  - insertion line uses `--primary`.
- Invalid cross-zone target:
  - indicator uses muted/destructive tone or no indicator.
  - drop does nothing.
- Respect reduced motion with CSS `@media (prefers-reduced-motion: reduce)`.

## Risks

| Risk | Mitigation |
|---|---|
| Conflict with resize handle | Start drag only from grip handle; resize remains on `.column-resizer`. |
| Conflict with range-select header drag | Grip mousedown stops propagation; range-select header drag remains outside handle. |
| Virtualized non-frozen columns miss offscreen targets | First iteration supports visible targets only; horizontal auto-scroll optional if simple. |
| Frozen sticky positions drift after reorder | Recompute through existing `frozenColumns`/`frozenWidth` computed values. |
| localStorage malformed | Add small safe parse/write helper scoped to table config. |

## Implementation Considerations

Likely touchpoints:
- `packages/shared-ui/src/components/ui/table/Table.vue`
- `packages/shared-ui/src/components/ui/table/style.css`
- `.claude/features/shared-ui-data-grid-table.md`

Optional if code size becomes too high:
- Extract `use-table-column-reorder.ts` composable.

Recommendation: extract only if `Table.vue` grows meaningfully or logic becomes hard to follow. Current file is already large, but surgical implementation may still be clearer if kept near existing column ordering state.

## Validation Criteria

- Typecheck shared-ui or affected repo.
- `pnpm verify:all`.
- Manual browser checklist:
  - drag non-frozen A before B.
  - drag frozen A before B.
  - attempt frozen → non-frozen, verify no change.
  - resize column after reorder.
  - open dropdown after reorder.
  - range-select header after reorder.
  - reload page, verify order persists.

## Final Decision

Proceed with native pointer-events implementation in shared-ui Table header.

## Unresolved Questions

None.
