---
phase: 2
title: "Settings dropdown + copyHeader localStorage; simplify copy flow"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Settings dropdown + simplified copy flow

## Overview
Replace the settings Dialog-picker with a Dropdown holding one "Copy cả tiêu đề cột"
checkbox persisted to a global localStorage key. Simplify `handleCopyShortcut` to always
copy the full selected range, header included iff the checkbox is on.

## Requirements
- Functional:
  - Gear button → `DropdownMenu` with one checkbox "Copy cả tiêu đề cột".
  - Checkbox state read/written to global localStorage key `range_copy_include_header` ("1"/"0").
  - Copy button copies the whole range; `includeHeader = copyHeader`.
- Non-functional: reuse existing `DropdownMenu` + `Checkbox`; UI-library-agnostic flow preserved.

## Architecture
- `use-range-copy-flow.ts`: drop preset/picker logic. New shape:
  - reactive `copyHeader` initialized from localStorage helper.
  - `setCopyHeader(v)` writes localStorage + updates reactive value.
  - `handleCopyShortcut()`: getActiveRange → getCopyEntries → cap check → `copyEntries(range, entries, copyHeader)`.
  - Remove `picker` state, `handleSettings`, `onPickerConfirm/Cancel/Reset`, preset imports.
- localStorage helper: small get/set in `use-range-copy-flow.ts` (KISS, no new file unless it grows). Key `range_copy_include_header`, value "1"/"0", try/catch.
- `Table.vue`: replace the settings `<button>` (lines ~124-126) with `DropdownMenu` >
  `DropdownMenuTrigger` (gear icon, keep `.range-actions__btn` styling) >
  `DropdownMenuContent` containing a `Checkbox` + label bound to `rangeCopyFlow.copyHeader`
  via `setCopyHeader`. Keep `@mousedown.stop`/`@click.stop` so selection isn't cleared.

## Related Code Files
- Modify: `packages/shared-ui/src/components/ui/table/composables/use-range-copy-flow.ts`
- Modify: `packages/shared-ui/src/components/ui/table/Table.vue` (range-actions block ~117-127; dropdown imports already present ~563-567)

## Implementation Steps
1. In `use-range-copy-flow.ts`, add localStorage helpers `readCopyHeader()` / `writeCopyHeader(v)` (key `range_copy_include_header`).
2. Replace preset/picker logic: keep `buildOptions`, `copyEntries`; rewrite `handleCopyShortcut` to copy full range with `copyHeader`.
3. Expose `copyHeader` (reactive) + `setCopyHeader` from the composable; drop picker-related returns.
4. In `Table.vue`, wrap gear in `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent` with one `Checkbox` "Copy cả tiêu đề cột".
5. Ensure dropdown open/click does not clear range selection (stop propagation; verify `.range-actions` exemption from click-outside still holds — see related plan phase-01).

## Success Criteria
- [ ] Gear opens a dropdown (not a dialog) with a single working checkbox.
- [ ] Toggling persists to `range_copy_include_header`; reload restores state.
- [ ] Copy includes header row iff checkbox on; otherwise data only.
- [ ] Copy still respects `COPY_CELL_CAP` warning and "no columns" warning.
- [ ] Range selection stays active while interacting with the dropdown.

## Risk Assessment
- Risk: dropdown inside an absolutely-positioned overlay may clip → reka-ui Portal handles this; verify content renders above table.
- Risk: click-outside clearing selection when dropdown opens → reuse existing `.range-actions` exemption; add stop-propagation on trigger.
