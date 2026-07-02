---
title: "Data-grid Column Drag Reorder"
status: pending
created: 260618-1717
source: ck-plan
brainstorm_report: ../reports/brainstorm-260618-1717-data-grid-column-drag-reorder-report.md
blockedBy: []
blocks: []
cli_scaffold: unavailable_ck_command_not_found
---

# Data-grid Column Drag Reorder

## Overview

Thêm UX kéo-thả trực tiếp trên header của shared-ui `Table` để user đổi vị trí cột bằng icon 6 chấm. Giữ scope hẹp: native pointer events, không thêm dependency, chỉ reorder trong cùng vùng frozen/non-frozen, lưu ngay vào localStorage hiện có.

**Design source:** [brainstorm report](../reports/brainstorm-260618-1717-data-grid-column-drag-reorder-report.md)

> Note: `ck plan create` không chạy được vì `ck` CLI không có trong PATH (`command not found: ck`), nên plan này được tạo thủ công theo template của skill.

## Scope

### In scope
- Add 6-dot drag handle to each reorderable table header cell.
- Reorder non-frozen columns among non-frozen columns.
- Reorder frozen columns among frozen columns.
- Block cross-zone reorder; no auto freeze/unfreeze.
- Persist successful reorder to `localStorage.config_column[config_<table_info.name>]`.
- Keep resize, dropdown, sort, range-select header drag, frozen sticky layout working.
- Update shared table feature doc after implementation.

### Out of scope
- No new DnD package.
- No server/app-level column preference API.
- No broad `Table.vue` refactor.
- No group/pivot data logic fix.
- No mobile/touch polish beyond pointer-event compatibility.
- No app consumer changes unless required for verification/demo.

## Phases

| # | Phase | Status | Priority | File |
|---|---|---|---|---|
| 1 | Understand existing ordering and persistence | pending | P1 | [phase-01-understand-existing-ordering-and-persistence.md](phase-01-understand-existing-ordering-and-persistence.md) |
| 2 | Design reorder state and helper boundaries | pending | P1 | [phase-02-design-reorder-state-and-helper-boundaries.md](phase-02-design-reorder-state-and-helper-boundaries.md) |
| 3 | Implement header drag UX | pending | P1 | [phase-03-implement-header-drag-ux.md](phase-03-implement-header-drag-ux.md) |
| 4 | Verify behavior and update docs | pending | P1 | [phase-04-verify-behavior-and-update-docs.md](phase-04-verify-behavior-and-update-docs.md) |

## Key Dependencies

- Phase 2 depends on Phase 1's verified ordering pipeline.
- Phase 3 depends on Phase 2's helper/API decisions.
- Phase 4 depends on final implementation and touched files.

## Success Criteria

- [ ] Header cells show a discoverable 6-dot drag handle.
- [ ] Drag starts only from the handle; header dropdown, resize, sort, and range-select keep working.
- [ ] Non-frozen reorder updates UI immediately and persists after reload.
- [ ] Frozen reorder updates UI immediately and persists after reload.
- [ ] Cross-zone drag does not change freeze state or column order.
- [ ] Malformed `config_column` localStorage does not crash the table path touched by reorder.
- [ ] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [ ] `pnpm verify:all` passes after feature docs update.

## Implementation Guardrails

- Shared-ui is a Module Federation singleton: keep change additive and low-regression.
- Do not mutate `props.columns`; continue using internal `currentColumns`/order state.
- Do not add dependency to shared-ui for this feature.
- Do not change existing `CustomColumn.vue` behavior unless needed to stay consistent with persisted order.
- Prefer small helpers near existing table ordering logic; extract composable only if the implementation becomes hard to read.

## Verification Commands

```bash
pnpm --filter @mf2/shared-ui typecheck
pnpm verify:all
```

Manual browser checklist:
- Drag non-frozen column before/after another non-frozen column.
- Drag frozen column before/after another frozen column.
- Attempt frozen ↔ non-frozen drag; verify no order/frozen-state change.
- Resize after reorder.
- Open dropdown after reorder.
- Use range-select header drag after reorder.
- Reload page; verify order persists.

## Next Steps

After Sếp approves this plan, execute with:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-custom-component/plans/260618-1717-data-grid-column-drag-reorder/plan.md
```

## Unresolved Questions

None.
