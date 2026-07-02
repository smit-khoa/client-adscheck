---
title: "Shared UI Table Transparent CSS"
status: completed
created: 260624-0130
source: plans/reports/brainstorm-260624-0130-shared-ui-table-transparent-css-report.md
mode: default
blockedBy: []
blocks: []
cli_scaffold: unavailable_ck_command_not_found
---

# Plan: Shared UI Table Transparent CSS

## Overview

Sửa mặc định `packages/shared-ui` data-grid `Table` để nền bảng trong suốt toàn bộ thay vì hiện mảng đen/tối từ theme token. Giữ scope hẹp: CSS + inline background source liên quan, không đổi public API hoặc logic bảng.

**Design source:** `plans/reports/brainstorm-260624-0130-shared-ui-table-transparent-css-report.md`

> Note: `ck plan create` không chạy được vì `ck` CLI không có trong PATH (`command not found: ck`), nên plan này được tạo thủ công theo template của skill.

## Scope

### In scope

- Đổi nền mặc định của shared-ui `Table` sang `transparent`.
- Bỏ tác dụng nền stripe (`row-odd`/`row-even`) nhưng giữ prop `stripe` để không breaking API.
- Xử lý các inline `background: getCellBackground(...)` để nền thường/frozen/empty-space không còn đen.
- Giữ các trạng thái có chủ đích: selected, range highlight, explicit color highlight.
- Cập nhật feature doc `.claude/features/shared-ui-data-grid-table.md`.
- Verify shared-ui typecheck + feature docs.

### Out of scope

- Không thêm prop/variant mới cho `Table`.
- Không sửa selection, range-copy, export, resize, drag-reorder, pagination.
- Không refactor lớn `Table.vue`.
- Không sửa app consumers ngoài những gì typecheck bắt buộc.
- Không làm visual redesign toolbar/button/pagination.

## Phases

| # | Phase | Status | Priority | File |
|---|---|---|---|---|
| 1 | Make Table backgrounds transparent | completed | P1 | [phase-01-make-table-backgrounds-transparent.md](phase-01-make-table-backgrounds-transparent.md) |
| 2 | Document and verify shared-ui table change | completed | P1 | [phase-02-document-and-verify-shared-ui-table-change.md](phase-02-document-and-verify-shared-ui-table-change.md) |

## Key Dependencies

- Phase 2 depends on Phase 1 implementation.
- No cross-plan blocker detected. Existing shared-ui table plans are historical/feature-complete enough for this small visual update.

## Acceptance Criteria

- [x] `Table` container does not paint `var(--background)` by default.
- [x] Header row/cells do not paint `var(--muted)` by default.
- [x] Body rows/cells/empty-space/frozen cells render transparent for normal and striped rows.
- [x] `stripe` prop remains accepted but no longer creates opaque alternating row backgrounds.
- [x] Selected/range-highlight/color-highlight states still have visible intentional colors.
- [x] No public prop/event/type contract is removed or renamed.
- [x] `.claude/features/shared-ui-data-grid-table.md` documents the transparent default.
- [x] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [x] `pnpm verify:features` passes.
- [x] `pnpm verify:all` attempted; failed only at `verify-pr-split` because the working tree already mixes `packages/shared-*` and `apps/*` changes.

## Implementation Guardrails

- `packages/shared-ui` is a Module Federation singleton: keep the diff surgical.
- Do not mix `packages/shared-*` changes with `apps/*` changes in the same commit/PR.
- Avoid introducing new component API for this visual default.
- Keep comments sparse; only explain why if an inline background must remain.
- Preserve highlight classes and selection/range override behavior.

## Verification Commands

```bash
pnpm --filter @mf2/shared-ui typecheck
pnpm verify:features
pnpm verify:all
```

Manual smoke, when running app is available:
- `/app/adaccounts` TKQC/BM/Page tables show no black table background.
- Header/frozen columns/empty-space are transparent.
- Selection and range-copy highlights remain visible.
- Toolbar buttons and pagination remain readable.

## Risks

| Risk | Mitigation |
|---|---|
| Global visual change affects other Table consumers | Keep change limited to default backgrounds; no API/behavior change |
| Transparent header hurts readability on busy backgrounds | Preserve borders/text; manual smoke in adaccounts workspace |
| Inline cell backgrounds override CSS | Update `getCellBackground` default branches, not CSS only |
| Feature docs drift | Update `shared-ui-data-grid-table.md` and run `pnpm verify:features` |

## Next Steps

After Sếp approves this plan, execute with:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-rebase/plans/260624-0130-shared-ui-table-transparent-css/plan.md
```

## Unresolved Questions

None.
