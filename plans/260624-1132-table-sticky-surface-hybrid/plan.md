---
title: "Table Full Pane Split"
status: pending
created: 260624-1132
source: plans/reports/table-sticky-transparency-260624-1132-hybrid-sticky-surface-report.md
mode: default
blockedBy: [260624-1403-table-ui-bugfix-range-actions-dropdown-shadow]
blocks: []
cli_scaffold: unavailable_ck_command_not_found
---

# Plan: Table Full Pane Split

## Overview

Replace the failed Hybrid C alpha-mask approach with a full pane-split architecture for `@mf2/shared-ui` `Table`. The screenshot validation showed the translucent sticky surface is visually unacceptable: frozen columns/header still form a mismatched light/dark block and do not solve the bleed-through cleanly.

New direction from Sếp on 2026-06-24:

- Use **full pane split**, not alpha sticky mask.
- Update this existing plan instead of creating a follow-up plan.
- Prioritize visual correctness first. If secondary interactions regress, report them clearly as follow-up instead of expanding scope indefinitely.

## Scope

### In scope

- Replace one-scroll-container + native sticky overlap with separated panes/layers for sticky regions.
- Remove or neutralize the alpha sticky-surface workaround introduced by the previous Hybrid C attempt.
- Keep the visual result clean: frozen columns and sticky header must not show scrolled content behind them.
- Preserve normal workspace gradient feel outside the fixed panes.
- Keep public `Table` props/events/import path stable.
- Keep implementation inside `packages/shared-ui` unless a blocker proves app code is required and Sếp approves.
- Update `.claude/features/shared-ui-data-grid-table.md` after implementation.
- Run static checks and report browser smoke status honestly.

### Out of scope

- No public API redesign for `Table`.
- No new dependency.
- No app-level redesign under `apps/*`.
- No attempt to perfect every secondary interaction if it conflicts with visual correctness in this round.
- No unrelated cleanup such as old grouped-mode mock data, unused emits, or pre-existing console logs.

## Phases

| # | Phase | Status | Priority | File |
|---|---|---|---|---|
| 1 | Reset hybrid mask and define pane contract | completed | P1 | [phase-01-reset-hybrid-mask-and-pane-contract.md](phase-01-reset-hybrid-mask-and-pane-contract.md) |
| 2 | Implement full pane split layout | completed | P1 | [phase-02-implement-full-pane-split-layout.md](phase-02-implement-full-pane-split-layout.md) |
| 3 | Browser verify visual priority | in-progress | P1 | [phase-03-browser-verify-visual-priority.md](phase-03-browser-verify-visual-priority.md) |
| 4 | Documentation and guard verification | in-progress | P1 | [phase-04-documentation-and-guard-verification.md](phase-04-documentation-and-guard-verification.md) |

## Progress Update — 2026-06-24 Pane Split Pass

- Completed Phase 1/2 implementation pass: `Table.vue` now renders separated frozen/scrollable panes for header/body/footer instead of relying on overlapping sticky cells.
- Removed the failed alpha-mask behavior from `getCellBackground`; default cell background is transparent again unless `cell_format`/color rules apply.
- Pane backgrounds use `--table-pane-surface: var(--background)` instead of hardcoded `#071016` or alpha-mask tokens.
- Split viewport measurement: `scrollViewportWidth` drives non-frozen virtualization; `viewportWidth` remains full table viewport (`frozenWidth + scroll body width`) for freeze-cap logic.
- Static checks passed after final blocker fixes:
  - `pnpm --filter @mf2/shared-ui typecheck` — passed.
  - `pnpm --filter @mf2/shared-ui test` — passed, 67/67 tests.
  - `pnpm verify:features` — passed.
  - `pnpm verify:all` — passed before final viewport-scroll fix; `verify:features` rerun passed after final fix.
- Code-reviewer blockers addressed: hardcoded pane color removed; viewport measurement fixed including scroll-handler path.
- Browser smoke on `/app/adaccounts` is still pending, so the plan remains `pending` overall and Phase 3 stays `in-progress`.
- Known visual-priority follow-ups to verify/document after browser smoke: range-select from frozen cells, resize preview line under split panes, header drag/resize/footer alignment.


- Phase 3 depends on Phase 2 implementation.
- Phase 4 depends on Phase 3 final status.
- Existing feature doc: `.claude/features/shared-ui-data-grid-table.md`.
- Related lesson: `.claude/lessons/data-grid-mutate-props-columns.md`.

## Acceptance Criteria

- [ ] Screenshot issue is fixed: frozen pane/header no longer creates mismatched translucent blocks.
- [ ] Vertical scroll: body rows do not visibly bleed through the header.
- [ ] Horizontal scroll: non-frozen cells do not visibly bleed through frozen columns.
- [ ] Frozen pane and scrollable pane row heights remain aligned for standard rows.
- [ ] Header columns remain aligned with body columns after horizontal scroll.
- [ ] Table still renders with checkbox column, frozen data columns, and non-frozen virtual columns.
- [ ] Last frozen boundary/shadow or equivalent visual divider is present when horizontally scrolled.
- [ ] No public `Table` prop/event/import path changes.
- [ ] If range-select, header drag-reorder, resize, or footer sum cannot be preserved in this pass, the exact regression is documented as follow-up.
- [ ] `.claude/features/shared-ui-data-grid-table.md` reflects the pane-split decision and any known interaction follow-ups.
- [ ] Relevant typecheck/test/doc guard commands are run and results recorded.

## Implementation Guardrails

- `packages/shared-ui` is a Module Federation singleton: keep diff as contained as possible.
- Do not mix `packages/shared-*` and `apps/*` changes in one commit/PR.
- Prefer reusing existing computed data (`frozenColumns`, `virtualNonFrozenColumns`, `visibleRows`, `rowPositionsWithSpacing`, `getColumnWidth`) instead of rebuilding table state.
- Keep public contracts stable.
- Keep comments sparse and about invariants, not plan IDs.
- Visual correctness is the priority for this round per Sếp.

## Verification Commands

```bash
pnpm --filter @mf2/shared-ui test
pnpm --filter @mf2/shared-ui typecheck
pnpm verify:features
pnpm verify:all
```

Manual browser smoke:

- Open `/app/adaccounts` workspace.
- Check TKQC/BM/Page tables where data exists.
- Scroll vertically and horizontally.
- Confirm header and frozen panes do not show scrolled content underneath.
- Check standard row alignment between frozen and scrollable panes.
- Spot-check checkbox column, frozen shadow/divider, resize, header dropdown, and footer sum if available.
- Report any unverified or regressed secondary interaction.

## Risks

| Risk | Mitigation |
|---|---|
| Pane split touches complex table layout | Keep public API stable; reuse existing computed state; change rendering/layout only where needed |
| Vertical row alignment drifts between panes | Render both panes from the same `visibleRows` and row height/position calculations |
| Range-select/header drag/footer regress | Prioritize visual result; report precise follow-up if preserving them exceeds this pass |
| Static tests cannot prove visual behavior | Browser smoke required before claiming visual completion |
| Shared-ui singleton breaks consumers | No apps/* changes; run shared-ui typecheck/tests and verify guards |

## Validation Log

### Session 1 — 2026-06-24
Initial Hybrid C alpha-mask plan validated and implemented. Browser screenshot showed result is visually unacceptable.

### Session 2 — 2026-06-24
Sếp changed direction:

- Architecture: full pane split.
- Planning: edit this existing plan instead of creating a follow-up plan.
- Priority: visual correctness first; secondary interaction regressions may be documented as follow-up.

## Unresolved Questions

None for planning. Browser verification may reveal interaction follow-ups.
