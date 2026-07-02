---
type: journal
created_at: 2026-06-24 14:28 Asia/Saigon
scope: shared-ui-table-pane-bugfix
plan: ../../plans/260624-1403-table-ui-bugfix-range-actions-dropdown-shadow/plan.md
---

# Journal: Shared UI Table Pane Bugfix

## Context

Sửa các lỗi còn lại sau pane-split table:

- `range-actions` đứng sai vị trí sau khi bôi đen bảng.
- Freeze/unfreeze column đóng dropdown nhưng icon option còn active.
- Mất ranh giới shadow ở mép frozen pane khi scroll ngang.
- Fake scrollbar được nghiên cứu nhưng không implement trong vòng này.

## What Happened

- `use-table-range-selection.ts`: `actionsAnchor` chuyển sang trả visual coordinates relative to `.table-pane-root`.
- `Table.vue`: bỏ double-conversion `50 + top - scrollTop` / `left - scrollLeft`; bind trực tiếp `anchor.top/left`.
- `Table.vue`: `toggleFreeze` clear `colOpenOption` ngay khi freeze/unfreeze.
- `style.css`: thêm `.table-pane-root.is-scrolling-x` seam/shadow cho frozen header/body/footer; thêm `position: relative` trực tiếp vào `.table-pane-root` để offset parent rõ ràng.
- `.claude/features/shared-ui-data-grid-table.md`: cập nhật coordinate model, dropdown active reset, frozen seam, và hướng follow-up overlay synced scrollbar.
- Plan sync: 4 phase completed; plan giữ `in-progress` vì browser smoke chưa chạy.

## Verification

- `pnpm --filter @mf2/shared-ui test` — passed, 67/67.
- `pnpm --filter @mf2/shared-ui typecheck` — passed.
- `pnpm verify:features` — passed.
- `pnpm verify:all` — passed.
- Post-review rerun after CSS tweak:
  - `pnpm --filter @mf2/shared-ui typecheck` — passed.
  - `pnpm verify:features` — passed.

## Review

- `code-reviewer`: `DONE_WITH_CONCERNS`, no blockers.
- Fixed one low-risk concern: `.range-actions` offset parent now explicit via `.table-pane-root { position: relative; }`.
- `docs-manager`: Docs impact `none`; feature doc update sufficient, no `docs/` update needed.

## Decisions

- Keep native `.table-pane-scroll-body` as scroll source; do not replace with shadcn/reka `ScrollArea`.
- Fake scrollbar should be separate follow-up using overlay synced scrollbar if product still wants visual track starting at frozen/table edge.
- Do not mark plan fully completed until browser smoke verifies overlay alignment and frozen seam in running app.

## Next

- Run browser smoke on `/app/adaccounts`:
  - non-frozen range action clamp,
  - frozen-only range action clamp,
  - mixed range action behavior,
  - freeze/unfreeze active state,
  - frozen seam/shadow on horizontal scroll.
- If browser smoke passes, mark plan completed and unblock pane-split visual verification plan.
