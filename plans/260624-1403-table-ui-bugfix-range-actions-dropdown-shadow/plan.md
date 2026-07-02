---
title: "Table UI Bugfix: Range Actions, Dropdown Active, Frozen Shadow"
status: in-progress
created: 260624-1403
source: plans/reports/table-ui-bugfix-brainstorm-260624-1403-range-actions-dropdown-shadow-scrollbar-report.md
mode: default
blockedBy: []
blocks: [260624-1132-table-sticky-surface-hybrid]
cli_scaffold: unavailable_ck_command_not_found
---

# Plan: Table UI Bugfix — Range Actions, Dropdown Active, Frozen Shadow

## Overview

Fix 3 pane-split regressions in `@mf2/shared-ui` `Table`: floating range actions position, header dropdown active state after freeze/unfreeze, and frozen-pane boundary shadow when horizontally scrolled.

Scrollbar work is intentionally **research-only** in this plan. Fake overlay scrollbar should be planned separately after these bugs are stable.

**Design source:** [brainstorm report](../reports/table-ui-bugfix-brainstorm-260624-1403-range-actions-dropdown-shadow-scrollbar-report.md)

> Note: `ck` CLI is not available in PATH (`command -v ck` returned exit code 1), so this plan was created manually using the ck-plan template.

## Scope

### In scope

- Correct `range-actions` coordinates for the current pane-split layout.
- Keep range actions anchored to bottom-right of selected range, clamped to the visible table area when the selected corner scrolls out of view.
- Clear header option active state after freeze/unfreeze.
- Restore visible frozen/scroll-pane boundary shadow while horizontally scrolled.
- Document the fake scrollbar follow-up direction.
- Update `.claude/features/shared-ui-data-grid-table.md` after implementation.
- Run focused tests and docs guards.

### Out of scope

- Do not implement fake scrollbar in this plan.
- Do not replace native table scroll with shadcn/reka ScrollArea.
- Do not change public `Table` props/events/import paths.
- Do not edit `apps/*` in the same implementation pass.
- Do not broadly refactor `Table.vue`, range copy flow, resize, drag reorder, export, or pagination.
- Do not address unrelated known issues: grouped-mode mock data, unused emits, pre-existing console logs.

## Phases

| # | Phase | Status | Priority | File |
|---|---|---|---|---|
| 1 | Correct range actions pane coordinates | completed | P1 | [phase-01-correct-range-actions-pane-coordinates.md](phase-01-correct-range-actions-pane-coordinates.md) |
| 2 | Reset dropdown active state on freeze actions | completed | P1 | [phase-02-reset-dropdown-active-state-on-freeze.md](phase-02-reset-dropdown-active-state-on-freeze.md) |
| 3 | Restore frozen pane boundary shadow | completed | P1 | [phase-03-restore-frozen-pane-boundary-shadow.md](phase-03-restore-frozen-pane-boundary-shadow.md) |
| 4 | Document scrollbar follow-up and verify guards | completed | P1 | [phase-04-document-scrollbar-follow-up-and-verify.md](phase-04-document-scrollbar-follow-up-and-verify.md) |

## Dependencies

- Phase 2 can run independently of Phase 1.
- Phase 3 can run independently after reading current pane CSS.
- Phase 4 depends on Phases 1-3 implementation results.
- This plan blocks final completion of `plans/260624-1132-table-sticky-surface-hybrid/plan.md` because that plan still has browser verification/doc follow-ups for pane-split interactions.

## Acceptance Criteria

- [ ] Range-select multiple cells in non-frozen pane: Copy/Settings buttons appear at bottom-right of selected range.
- [ ] Scroll until selected corner leaves visible area: buttons clamp to visible table edge instead of staying fixed at a stale position.
- [ ] Frozen-only range: buttons clamp inside the frozen band.
- [ ] Mixed frozen + non-frozen range: buttons stay usable and visually tied to the visible selected area/table viewport.
- [ ] Freeze a column from header dropdown: dropdown closes and 3-dot trigger is no longer active.
- [ ] Unfreeze a column from header dropdown: dropdown closes and 3-dot trigger is no longer active.
- [ ] Horizontal scroll with frozen columns: visible boundary/shadow appears at frozen pane right edge.
- [ ] No public `Table` prop/event/import path changes.
- [ ] Fake scrollbar decision documented as follow-up; not implemented here.
- [ ] `.claude/features/shared-ui-data-grid-table.md` updated.
- [ ] `pnpm --filter @mf2/shared-ui test` result recorded.
- [ ] `pnpm verify:all` result recorded or exact blocker reported.

## Implementation Guardrails

- `packages/shared-ui` is a Module Federation singleton: keep changes small and additive.
- Keep `.table-pane-scroll-body` as the real scroll source for virtualization, header/footer transforms, auto-scroll, and range geometry.
- Do not add dependencies.
- Do not mutate public app consumers.
- Preserve range selection click-outside behavior: `.range-actions` must remain exempt so button clicks work.
- Keep comments sparse and about invariants only.

## Verification Commands

```bash
pnpm --filter @mf2/shared-ui test
pnpm --filter @mf2/shared-ui typecheck
pnpm verify:features
pnpm verify:all
```

Manual browser smoke:

1. Open a consuming table in `/app/adaccounts`.
2. Range-select non-frozen cells, scroll vertical/horizontal, verify actions clamp.
3. Range-select frozen-only cells, scroll horizontal, verify actions stay in frozen band.
4. Range-select mixed frozen/non-frozen cells, scroll both axes, verify actions usable.
5. Freeze/unfreeze a column, verify menu active state clears.
6. Scroll horizontally with frozen columns, verify seam/shadow visible.
7. Confirm Copy and Settings buttons remain clickable and do not clear selection before the action.

## Risks

| Risk | Mitigation |
|---|---|
| Range action coordinate fix regresses mixed frozen/non-frozen selection | Test frozen-only, non-frozen-only, and mixed ranges manually. |
| Shadow looks too strong/weak on workspace background | Use a subtle local CSS rule and tune in browser. |
| Dropdown active state is affected by reka menu timing | Clear local `colOpenOption` explicitly in freeze action handler. |
| Shared-ui singleton affects all consumers | No API changes; run shared-ui test/typecheck and feature guards. |
| Scrollbar research expands into implementation | Keep Phase 4 documentation-only; new plan required for fake scrollbar. |

## Implementation Results — 2026-06-24

Completed implementation for all four phases:

- Phase 1: `range-actions` now uses visual coordinates relative to `.table-pane-root`; `Table.vue` no longer subtracts `scrollTop`/`scrollLeft` a second time.
- Phase 2: `toggleFreeze(field)` clears `colOpenOption` before moving a column between frozen/non-frozen panes.
- Phase 3: `.table-pane-root.is-scrolling-x` adds a right-edge border/shadow on frozen header/body/footer panes; `.table-pane-root` now declares `position: relative` directly for the absolute range-actions overlay.
- Phase 4: `.claude/features/shared-ui-data-grid-table.md` documents the coordinate model, dropdown active reset, frozen seam, and overlay-synced scrollbar follow-up.

Verification results:

- `pnpm --filter @mf2/shared-ui test` — passed, 67/67 tests.
- `pnpm --filter @mf2/shared-ui typecheck` — passed.
- `pnpm verify:features` — passed.
- `pnpm verify:all` — passed.
- Post-review rerun after CSS tweak:
  - `pnpm --filter @mf2/shared-ui typecheck` — passed.
  - `pnpm verify:features` — passed.

Code review:

- `code-reviewer` returned `DONE_WITH_CONCERNS`, no blockers.
- Addressed one low-risk concern by adding `position: relative` directly to `.table-pane-root`.
- Remaining concerns are not blockers and are either low-risk or pre-existing: browser smoke not recorded, pre-existing `ResizeObserver` disconnect follow-up.

Plan status remains `in-progress` until browser smoke validates the visual behavior in a running app.



```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-custom-table/plans/260624-1403-table-ui-bugfix-range-actions-dropdown-shadow/plan.md
```

Optional extra gate:

```bash
/ck:plan validate /Volumes/Workspace/smit/worktree/client/feat-custom-table/plans/260624-1403-table-ui-bugfix-range-actions-dropdown-shadow/plan.md
```

## Unresolved Questions

None for implementation planning. Exact frozen shadow strength should be tuned in browser.
