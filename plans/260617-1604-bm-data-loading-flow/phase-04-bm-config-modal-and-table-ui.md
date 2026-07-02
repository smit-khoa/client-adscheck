---
phase: 4
title: "BM config modal + table UI"
status: pending
priority: P1
effort: "4h"
dependencies: [3]
---

# Phase 4: BM Config Modal + Table UI

## Overview
Build the user-facing BM data loading screen: config modal, source selector, advanced toggles, concurrency input, load button, and BM table bound to the loader composable.

## Requirements
- Functional: user can open config before loading BM.
- Functional: config supports `all` and `byId`; `byId` shows textarea, one BM ID per line.
- Functional: config supports `advEnabled`, advanced toggles, and `concurrency` default `50`.
- Functional: BM table shows base fields and advanced fields from contract mapping.
- Functional: show loading/error state per group without failing whole table.
- Non-functional: use shared-ui components; no hand-rolled modal/table/buttons/inputs.

## Architecture

```text
BmDataLoadingView
  -> BmLoadConfigDialog (local form state -> submit BmLoadConfig)
  -> BmTable (rows from useBmDataLoader)
```

Use `@mf2/shared-ui/table` for grid. Use slots/chips for status/group error display. Keep table column definitions local to `BmTable.vue` or a small `bm-table-columns.ts` only if the Vue file gets too large.

## Related Code Files
- Create: `apps/adaccounts/src/features/bm-data-loading/components/BmDataLoadingView.vue`
- Create: `apps/adaccounts/src/features/bm-data-loading/components/BmLoadConfigDialog.vue`
- Create: `apps/adaccounts/src/features/bm-data-loading/components/BmTable.vue`
- Optional create if needed: `apps/adaccounts/src/features/bm-data-loading/components/bm-table-columns.ts`
- Modify: `apps/adaccounts/src/features/bm-data-loading/index.ts`
- Modify: `apps/adaccounts/src/features/advanced-mode/pages/AdvancedModePlaceholder.vue` or renamed advanced view.

## Implementation Steps
1. Build `BmLoadConfigDialog.vue` with shared-ui:
   - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`.
   - `RadioGroup` for source.
   - `Textarea` for IDs when source=`byId`.
   - `Switch` for `advEnabled`.
   - `Checkbox` or `Switch` for advanced group toggles.
   - `Input` type number for concurrency; clamp to `>=1` before submit.
   - `Button` for submit/cancel.
2. Default form state exactly:
   - `source='all'`, `ids=[]`, `advEnabled=true`, all 9 toggles true, `concurrency=50`.
3. Build `BmDataLoadingView.vue`:
   - owns `useBmDataLoader()`.
   - shows primary “Tải dữ liệu BM” button opening config.
   - on submit, calls `load(config)`.
   - shows base loading and base error near header.
4. Build `BmTable.vue`:
   - columns at minimum: `bmId`, `name`, `status`, `disabled`, `type`, `tier`, `role`, `notify`, `partnerCount`, `createdDate` plus advanced mapped fields.
   - include `limit` and `createLimit` as distinct columns/labels.
   - display group errors compactly, e.g. a “Lỗi nhóm” badge/list column or tooltip-style text.
   - bind shared-ui Table loading to base loading for first load; group loading can show cell placeholders/text.
5. Advanced group columns must follow the submitted config:
   - Base columns are always visible.
   - Advanced columns for disabled toggles are hidden by default, not merely filled with `--`.
   - If a group was fetched earlier then disabled, keep the cached data in session but hide that group's columns.
   - If the group is enabled again, merge cached data immediately and do not call that group API again.
   - `createLimit` has no checkbox; display as its own column when advanced detail has run and data is available, with a distinct label from `limit`.
6. Ensure no direct API import in UI components; they import only composable/types.

## Success Criteria
- [ ] Config modal opens before BM load.
- [ ] `byId` IDs are passed deduped to loader.
- [ ] Default concurrency is `50`; invalid/empty input clamps to `1` or defaults safely.
- [ ] User can disable a toggle and that group stays unloaded/no API call.
- [ ] Table renders base rows before/while advanced groups finish.
- [ ] Group errors are visible but do not blank the whole table.
- [ ] UI imports shared-ui primitives instead of hand-rolled modal/table/input/buttons.

## Risk Assessment
- Risk: many BM columns make the table wide. Mitigation: rely on shared-ui DataGrid horizontal scroll/custom-column; avoid custom layout work.
- Risk: config modal component grows too large. Mitigation: keep group toggle list data-driven inside the same file; extract only if >150 LOC and readability suffers.
- Risk: per-cell loading indicators overcomplicate UI. Mitigation: show simple group loading/error chips first.
