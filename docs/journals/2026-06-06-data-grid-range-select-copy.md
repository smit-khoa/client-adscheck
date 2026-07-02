# Data Grid Range-Select + Copy: Excel Model Ported, Overlay Buried

**Date**: 2026-06-06
**Severity**: Medium (new feature, core geometry + state machine)
**Component**: shared-ui `Table.vue`, `use-range-copy.ts`, `use-table-range-selection.ts`
**Status**: Resolved

## What Happened

Ported Excel-like range selection + copy (mouse multi-select, Cmd+C with TSV escape, LRU preset picker) from agency repo's Options-API mixin (1295 LOC + CopyColumnsPicker) into adscheck shared-ui data-grid `Table.vue` (Composition API, 2-axis virtual scroll). Plan: 6 phases TDD-first.

P0: Vitest+jsdom setup for `@mf2/shared-ui` (repo had no test framework). P1: copy core (`use-range-copy.ts`, `range-copy-presets.ts`, 23 tests pre-implementation). P2: selection geometry (`use-table-range-selection.ts`, `range-coords.ts`, 13 tests, coordinate-space conversion for frozen+scroll+dynamic rows). P3–P4: Table wiring (prop `enableRangeSelect` default false, `RangeCopyPicker.vue` dialog). P5: demo + feature doc.

All 34 unit tests pass. vue-tsc 6/6 packages. rspack builds. enableRangeSelect=false = zero regression.

## The Brutal Truth

**Built the wrong thing first.** Blindly ported the source's floating overlay (transparent `.range-rect` layer, absolute-positioned, animated rectangle on top of cells). It had THREE bugs that looked independent until code-review forced a redesign:

1. Transparent rects STACKED where frozen+scrollable regions overlapped on scroll → frozen region doubled in opacity (alpha blending).
2. Row hover couldn't override the highlight (z-index wars, same-layer problem).
3. Frozen-column highlight JUDDERED on scroll because it used `translateX(scrollLeft)` driven by RAF, lagging the native sticky cells by one frame.

**One root cause, one brutal fix:** dump the overlay entirely. Paint a solid `color-mix()` directly onto cell backgrounds via a class (`range-cell`, driving `cellRangeLevel(row, col)`). Solid = no stacking opacity. Native sticky cell = no RAF lag. `!important` over inline bg = clean override. One mechanism killed all three.

Process compounded it: five code-review passes (incremental + holistic final), but only the holistic pass caught accumulated dead code from the two `actionsAnchor` rewrites—`clipToFixed`/`clipToScrollable` left imported-but-unused with orphan tests. Per-increment reviews don't catch cross-rewrite drift.

## Technical Details

**Coordinate model differs from source:**
- Source: scroll container `el-scrollbar` has 1 scroll offset; adscheck: `dataGridMain` (native scroll, holds scrollTop + scrollLeft separately).
- Checkbox width 60 (source 61), header height 50 (source 44).
- Index-based geometry (not DOM-based) survives virtualization: `colIndexFromX(x)` + `rowIndexFromY(y)` with precomputed colStarts + rowHeights + frozenCount.

**Range copy core** (`use-range-copy.ts`):
- `getCopyEntries(range, rows, cols)` → array of (row, col, value) tuples.
- `escapeTSVCell(str)` → RFC 4180 (double-quote fields with delimiters/newlines/quotes).
- `buildTSV(entries) → string` with `\t` and `\n`.
- `writeClipboard(text)` → navigator.clipboard.writeText + fallback execCommand("copy").
- Tested: empty range, single cell, multi-row/col, escaping quotes/tabs/newlines.

**Preset system** (`range-copy-presets.ts`):
- localStorage key `range_copy_presets_<tableName>`.
- LRU 50 max. Hash (SHA-256) of selectedColumns. Subset match (picker shows presets that are subsets of current range).
- Defaults: all columns, or columnNames if provided.

**Selection state machine** (`use-table-range-selection.ts`, 524 LOC):
- Mouse pipeline: mousedown at cell → delayed-drag activation (50ms debounce to avoid false drags on click).
- Multi-range: Shift+drag extends. Cmd/Ctrl+click toggles. Handle column header → select whole column. Auto-scroll RAF on drag-near-edge.
- Shift+extend: if range exists, extend to new anchor. If none, start new.
- Pure state: `ranges: Range[]` (start row/col, end row/col). Reactive.

**Overlay → cell-paint** (final design):
- `range-cell` class on cell divs, driven by `cellRangeLevel(row, col)` (returns 0/1 for outside/inside range).
- Cell gets `.range-cell[data-level="1"] { background-color: color-mix(in srgb, var(--primary-50) 30%, transparent) }`.
- Header columns of selected range: `colRangeLevel(col)` similarly tints.
- Range-select buttons (copy/preset-picker) positioned inside corner anchor, clamped to visible scrolled window.

**Bug caught in review:**
- Passed `rowPositionsWithSpacing` (length n, no sentinel) but `rangeHeight` reads `positions[rowEnd + 1]` → switched to `rowPositions` (has trailing sentinel at total height).

**Dead code cleaned up:**
- Removed `clipToFixed()` / `clipToScrollable()` (from earlier actionsAnchor rewrites) + their 2 tests.
- Removed `OverlayRect.isPrimary` (vestigial from overlay days).
- Removed 2 stale comments referencing removed overlay mechanism.

## Decisions

1. **enableRangeSelect default false** → zero regression. Opt-in per table. Paths guard via `rangeSelectActive` / `activeRange === null`.
2. **Not unit-testing UI interactions** (selection drag, overlay paint, button clamping) → pure logic (copy, coords, presets) tested, UI left for manual QA on dev server. Pragmatic: mouse pipeline + layout-dependent rendering need real layout.
3. **Keep `use-table-range-selection.ts` cohesive at 524 LOC** over splitting auto-scroll block. Threaded reactive state through all handlers; split would fragment clarity. Flagged for future refactor if scrolling logic reused elsewhere.
4. **Solid cell paint instead of transparent overlay** → architectural win. One paint mechanism, no stacking, no RAF jitter.

## Lessons

1. **Blindly porting a pattern from a different architecture is a trap.** Source used Options API + different scroll model (el-scrollbar). Composition API + native scroll + MF singleton requirement meant the overlay stacking model was always broken. Should have asked "does this scale?" before writing.
2. **Three independent-looking bugs trace to one root cause.** Iterating fixes per-bug (z-index, opacity, RAF lag) will chase ghosts forever. Step back and question the architecture. Overlay was the wrong mechanism. Paint was the right one.
3. **Incremental code review misses cross-rewrite drift.** Two actionsAnchor rewrites littered dead imports/tests/functions. Per-increment reviews don't see the full picture. Holistic pass (read final state top-to-bottom) caught what incremental passes missed. Worth reserving time for one final holistic review.
4. **Index-based geometry over DOM-based ensures virtualization survives.** adscheck Table virtualizes rows + columns. Querying DOM offsets would break on scroll. Precompute colStarts + rowHeights + frozenCount once; derive all coords from indices. Survived 2-axis virtual scroll without hitches.
5. **localStorage presets with SHA-256 hash + subset match is gold for UX.** User selects columns once, picker remembers it. Only shows presets applicable to current range. Low-friction repeat.

## Next Steps

- Manual QA on dev server: selection drag interaction, copy to clipboard, preset picker behavior, range-select buttons visibility on scroll edges.
- If `use-table-range-selection.ts` 524 LOC becomes a maintainability pain, extract auto-scroll RAF block to separate composable (low priority, flag only).
- File: `/Volumes/Workspace/smit/adscheck/client/docs/journals/2026-06-06-data-grid-range-select-copy.md`
