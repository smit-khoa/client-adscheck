---
slug: shared-ui-date-range-picker
remote: n/a (packages/shared-ui)
route: n/a
roles: []
feature_flag: n/a
status: done
---

## Purpose
Reusable compact shared-ui date range picker for toolbar/filter usage, especially the data-grid `tools:['time']` action.

## Flow
1. Caller renders `DateRangePicker` through `@mf2/shared-ui/date-range-picker` and binds `v-model` to `{ start: Date | null, end: Date | null }`.
2. The trigger uses the shared `Button` and `Icon` components. In table toolbar usage it shares `.data-grid-toolbar-icon-button` so the calendar button matches other toolbar actions.
3. Opening is delegated to the shared `Popover` primitive. The component copies `modelValue` into local draft state so users can change a range without mutating caller state until `Apply`.
4. Selecting a preset updates the draft range. Selecting a day enters `Custom Range`; the first click sets `start`, the second click sets `end`, and reversed selections are normalized.
5. `Cancel` restores caller-owned value and emits `cancel`; `Apply` emits `update:modelValue` and `apply` with `{ value, preset }`, then closes the popover.

## Entry points / Routes
- n/a — reusable shared-ui component.

## Files (MANDATORY — real paths, verified to exist)
- packages/shared-ui/src/components/ui/date-range-picker/DateRangePicker.vue — trigger, compact green/mint popover panel, preset sidebar, two-month calendar grids, footer actions
- packages/shared-ui/src/components/ui/date-range-picker/date-range-picker.ts — public types plus local-date helpers, preset range math, calendar grid builder, display formatting
- packages/shared-ui/src/components/ui/date-range-picker/__tests__/date-range-picker.test.ts — pure helper coverage for range normalization, preset math, formatting, and month grid generation
- packages/shared-ui/src/components/ui/date-range-picker/index.ts — component group export
- packages/shared-ui/src/date-range-picker.ts — narrow public entrypoint for `@mf2/shared-ui/date-range-picker`
- packages/shared-ui/src/components/ui/table/Table.vue — renders `DateRangePicker` for `tools:['time']` in both local and teleported toolbar branches
- packages/shared-ui/src/index.ts — additive root export for backwards-compatible shared-ui barrel usage
- packages/shared-ui/package.json — package export map for `./date-range-picker`
- .claude/components-catalog.md — catalog entry documenting API, style tokens, and anti-patterns

## APIs used
- none

## State
- Caller-owned state: `modelValue` date range.
- Local draft state: popover open state, selected preset, visible two-month calendar anchor, draft range before apply.
- No Pinia/global state.

## Permissions / Flags
- none

## Verification
- `pnpm --filter @mf2/shared-ui typecheck`
- `pnpm --filter @mf2/shared-ui test`
- `pnpm verify:catalog`
- `pnpm verify:features`

## Related
[[shared-ui-data-grid-table]]

## Decisions / Gotchas
- Uses local `Date` construction and `dd/mm/yyyy` formatting instead of `toISOString()` so timezone conversion does not shift displayed days.
- Draft state is separate from `modelValue`; callers only receive a new value when users click `Apply`.
- Shared Popover owns overlay positioning/focus behavior. The component supplies only the product-specific compact green/mint layout.
- `Lifetime` defaults to `01/01/2010` through `lifetimeStart`, matching the supplied visual target while remaining configurable.
- Manual range selection normalizes reversed start/end clicks, so users can select end-before-start without producing invalid caller state.
- The first visual target was oversized for the current app. The accepted table-toolbar version is compact: trigger matches `.data-grid-toolbar-icon-button`, panel width is about 700px, font weights are light (`500/600`), and selected states use the existing green/mint palette instead of blue.
