---
title: "Table Copy UI Revamp — selection color, range-actions, settings dropdown"
status: completed
source: plans/reports/brainstorm-260624-1622-table-copy-ui-revamp-report.md
scope: project
blockedBy: []
blocks: []
related: [260624-1403-table-ui-bugfix-range-actions-dropdown-shadow]
---

# Plan: Table Copy UI Revamp (shared-ui Table)

## Summary
3 UX changes to the Excel-like range-copy of the shared-ui data-grid `Table`:
1. Selection highlight color → solid `#E5F0EB` (flat, no primary tier).
2. Range-actions toolbar restyle to match the supplied mockup (white background, gray/dark icons).
3. Settings: replace the Dialog column-picker with a Dropdown holding a single
   "Copy cả tiêu đề cột" checkbox, persisted to localStorage (global). Drop the
   whole column-picker + preset system.

**Design source:** [brainstorm report](../reports/brainstorm-260624-1622-table-copy-ui-revamp-report.md)

**Related plan:** `260624-1403-table-ui-bugfix-range-actions-dropdown-shadow` touched
the same `range-actions` overlay (coordinate fixes, phases 1-3 done). This plan restyles
it and changes copy behavior — independent, no blocking. Re-read its phase-04 notes before
editing `range-actions` CSS to avoid undoing the coordinate fix.

## Decisions (locked with user)
- Selection cells: all `#E5F0EB`, no primary tier. Unselected cells stay transparent.
- Selected column header: lighter than body + **black text** (currently muted).
- Range-actions: white solid background, copy + gear icons in dark gray.
- Settings = Dropdown (NOT Dialog), single checkbox "Copy cả tiêu đề cột".
- localStorage **global** key (one for all tables).
- **Remove entirely:** `RangeCopyPicker.vue`, `range-copy-presets.ts`, preset tests.
- Old `range_copy_presets_*` localStorage keys: leave as-is (no cleanup code).

## Phases
| # | Phase | Status | Priority | File |
|---|-------|--------|----------|------|
| 1 | Range selection color + range-actions toolbar restyle | completed | P1 | [phase-01-selection-color-and-toolbar-restyle.md](phase-01-selection-color-and-toolbar-restyle.md) |
| 2 | Settings dropdown + copyHeader localStorage; simplify copy flow | completed | P1 | [phase-02-settings-dropdown-and-copy-flow.md](phase-02-settings-dropdown-and-copy-flow.md) |
| 3 | Remove picker/preset, clean tests, update feature doc | completed | P2 | [phase-03-cleanup-and-docs.md](phase-03-cleanup-and-docs.md) |

## Implementation notes
- Code-review found a real bug: the settings `DropdownMenuContent` portals to `<body>` (outside `.range-actions`), so clicking the checkbox hit the capture-phase `onDocumentMouseDown` click-outside handler → cleared the range selection → unmounted the overlay mid-interaction. Fixed in `use-table-range-selection.ts` by exempting `[data-slot="dropdown-menu-content"]` (also removed the dead `.range-copy-picker` exemption).
- Verified: `pnpm --filter @mf2/shared-ui test` (46 passed) + `typecheck` clean. shared-ui has no build script (source MF singleton).
- Not browser-verified yet: visual colors, dropdown interaction, localStorage persistence — pending a real browser pass.

Dependencies: Phase 3 depends on Phase 2 (flow must stop using picker/preset before deletion). Phase 1 independent (CSS only).

## Acceptance criteria
- [ ] Range cells render solid `#E5F0EB`; cells outside range transparent.
- [ ] Selected column header: lighter tint than body + black text.
- [ ] Range-actions toolbar: white background, copy + gear icons dark gray, hover light-gray.
- [ ] Click gear → opens Dropdown (not Dialog) with one checkbox "Copy cả tiêu đề cột".
- [ ] Toggling checkbox persists to a global localStorage key; reload restores it.
- [ ] Copy button copies the full selected range, header included iff checkbox on.
- [ ] `RangeCopyPicker.vue`, `range-copy-presets.ts`, `range-copy-presets.test.ts` deleted; no dangling imports.
- [ ] `pnpm --filter @mf2/shared-ui test` + typecheck + build green.
- [ ] `.claude/features/shared-ui-data-grid-table.md` updated (picker/preset removed, dropdown documented).

## Constraints
- Only `packages/shared-ui` — single shared PR. Self-contained table module; no other app imports picker/preset (verified at brainstorm).
- Vue 3 + reka-ui. Reuse existing `DropdownMenu` + `Checkbox`. Comments in English.
- Hex colors hardcoded per user request (fixed values, not tokens).

## Next step
After plan review → `/ck:cook` this plan, or `/ck:plan validate` for a critical-questions gate first.
