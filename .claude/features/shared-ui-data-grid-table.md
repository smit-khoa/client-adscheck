---
slug: shared-ui-data-grid-table
remote: n/a (packages/shared-ui — MF singleton)
route: n/a (reusable component)
roles: []
feature_flag: n/a
status: done
---

## Purpose
Reusable data-grid `Table` in shared-ui: virtualized rows/columns, frozen columns, column
resize, **header drag-reorder**, custom-column drag (show/hide/reorder + row-grouping), sort, pagination, row-select,
pivot mode, **Excel-like range-select + copy** (opt-in), and **export to .txt/.csv/.xlsx** (`tools:['download']`).
Ported from an external project into the shadcn-vue/reka-ui design system.

## Flow
Caller passes `data` + `columns` (+ optional `tools`, `paging`, `pivotMode`, `showCheckbox`…)
-> Table virtualizes header/body/footer cells -> toolbar actions (refresh/zoom/custom-column)
emit events / open Dialog -> column header DropdownMenu does freeze + sort -> Pagination emits
`changePage(page, limit)` -> selection mutates `checkedConfig` (passed by ref).

## Entry points / Routes
- See frontmatter `route`; main entry is the documented route/action for this feature.

## Files (MANDATORY — real paths, verified to exist)
- packages/shared-ui/src/components/ui/table/Table.vue — data-grid core (virtualization, frozen, resize, header drag-reorder, sort, pivot, render); wires range-select + overlay + Cmd+C
- packages/shared-ui/src/components/ui/table/CustomColumn.vue — Dialog + vuedraggable to show/hide/reorder columns and define row-groups
- packages/shared-ui/src/components/ui/table/Pagination.vue — internal footer paging in the table style (`Hiển thị` Select options 15/25/50/100/200/500/max, pill prev/next with `page/totalPages`, selected/total summary); internal
- packages/shared-ui/src/components/ui/table/composables/use-range-copy.ts — pure copy core: getCopyEntries, escapeTSVCell, buildTSV, writeClipboard
- packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts — reactive selection state + mouse/keyboard pipeline + auto-scroll + cellRangeLevel/actionsAnchor
- packages/shared-ui/src/components/ui/table/composables/use-checkbox-row-range-selection.ts — pure checkbox row-range helpers for drag/Shift-click select/deselect by anchor state
- packages/shared-ui/src/components/ui/table/composables/range-coords.ts — pure geometry: colIndexFromX/rowIndexFromY (frozen+scroll, fixed/dynamic), cumulativeWidths, rangeToRect, clip fixed/scrollable
- packages/shared-ui/src/components/ui/table/composables/use-range-copy-flow.ts — Cmd+C / copy-button: always copies the full selected range as TSV; only option is includeHeader (settings dropdown), persisted to global localStorage key `range_copy_include_header` ("1"/"0")
- packages/shared-ui/src/components/ui/table/composables/use-table-export.ts — pure export core: buildExportMatrix (header=column.name, formatCopyValue→raw, numbers kept for xlsx), matrixToTSV (reuses escapeTSVCell), exportTable (.txt Blob / .csv BOM+sheet_to_csv / .xlsx writeFile; xlsx lazy-imported)
- packages/shared-ui/src/components/ui/table/ExportMenu.vue — toolbar Popover format picker (.xlsx default/.csv/.txt) + "Tải xuống" button; emits `export(format)`, closes after
- packages/shared-ui/src/components/ui/table/composables/__tests__/ — vitest: use-range-copy.test.ts (14) + range-coords.test.ts (11) + use-checkbox-row-range-selection.test.ts (10) + use-table-export.test.ts (11)
- packages/shared-ui/src/components/ui/table/style.css — data-grid layout/styling (`.data-grid-*`, `.range-cell`, `.range-col`, `.range-actions`, `.checkbox-range-cell`)
- packages/shared-ui/src/table.ts — narrow public entrypoint for `Table` (`@mf2/shared-ui/table`) so apps can avoid the root shared-ui barrel
- packages/shared-ui/src/components/ui/table/index.ts — exports only `Table`
- packages/shared-ui/vitest.config.ts — standalone vitest (jsdom) config for table composables
- packages/shared-ui/src/icons/sprite-symbols.ts — icon sprite (added restart/zoom/left/right/trash)

## APIs used
- none (presentational; consumer supplies data + handles emits)

## State
- See `## Flow` and `## Files` for the stores/composables involved; no additional state notes recorded yet.

## Permissions / Flags
- See frontmatter `roles` and `feature_flag`; no additional permission notes recorded yet.

## Verification
- Unit tests: `pnpm --filter @mf2/shared-ui test` — pure table composables (range coords, range copy, checkbox/row selection, export). No `.vue` render tests (brittle, low ROI in MFE).
- Run `pnpm verify:all` plus the relevant app/package typecheck/build after changing this feature.

## Related
[[adaccounts-tkqc-tab]] [[adaccounts-bm-tab]] [[adaccounts-page-tab]] — current adaccounts table consumers
- `apps/ads-manager/src/pages/ComponentShowcasePage.vue` — live demo (frozen/resize/custom-column/sort/select/total/paging, custom cell slots via `#<field>`)

## Decisions / Gotchas
- **Overwrote shadcn-table primitives**: `ui/table` previously exported Table/TableHeader/
  TableBody/TableRow/TableHead/TableCell/TableCaption (shadcn). Those were removed and replaced
  by this data-grid. Breaking change to the singleton, done intentionally; no live app imported
  the old primitives (only a commented showcase block in ads-manager ComponentShowcasePage).
- **Pagination not exported**: data-grid has its own `Pagination.vue` but index.ts withholds it
  to avoid clashing with `ui/pagination`'s `Pagination` export.
- **Import relative, never `@/`**: inside shared-ui the `@` alias collides with each app's MF
  rspack alias and breaks the build — use relative paths.
- **scss → plain CSS**: rspack has no scss loader; Pagination/CustomColumn style blocks were
  converted to plain CSS (`@extend` inlined).
- **Theming**: the source shipped hardcoded light colors (white bg, `#e0e0e0` borders, `#0969da`).
  All mapped to design-system CSS vars (`--background`, `--muted`, `--border`, `--foreground`,
  `--primary`, `--accent`, `--destructive`, `--muted-foreground`) so the grid follows the app's
  (dark) theme. The table surface now defaults to `transparent` for both the scrollable body and the pane surfaces so consumers can place the grid over workspace backgrounds without a black table block. Sticky overlap was rejected after screenshot validation: alpha-only masks still produced mismatched light/dark blocks. The accepted direction is now a full pane split: frozen header/body/footer render in a left pane, non-frozen columns render in a separate horizontally scrollable pane, and header/footer scrollable content mirrors the body `scrollLeft`. Because the panes are separate DOM areas rather than overlapping sticky cells, their backgrounds can stay transparent without scroll bleed-through. Pane-aware interaction geometry is required: body scroll container coordinates are body-only (`headerHeight: 0`), column hit-tests map frozen `clientX` against the root pane and non-frozen `clientX` against scroll body + `scrollLeft`, and resize preview/drag ghost/range action overlays render at `.table-pane-root` so they use visual viewport coordinates instead of the old single-scroll-container axis. Wheel events on the frozen header/body/footer and the non-frozen header are forwarded to the real scroll body so scrolling over header/frozen cells behaves like scrolling over the table body, including vertical `deltaY` and horizontal `deltaX` trackpad gestures. Base table text uses black (`#000`), while header text uses `#5E6360`; header separators and icons (6-dot drag + 3-dot menu + drag ghost icon) use `#A5ACA7`; icon hover background uses `#D8E9E1` only when hovering the icon itself. Header/dropdown menus use the shared `DropdownMenu*` components; the shared dropdown palette is soft green/gray (`#F3F7F5` surface, `#5E6360` text, `#D8E9E1` hover, `#BFD8CC` border), with 12px menu radius and 8px item radius. Row borders use white via `--table-border-color`; header has no horizontal border between header and first row. Body column separators use `showColumnBorders?: boolean` (default `false`) to switch `--table-column-border-color` between transparent and white. `getCellBackground` preserves intentional `cell_format` and color-rule highlights while default cell backgrounds remain transparent. The 8 `highlight-*` classes keep
  literal pastel colors on purpose (semantic colour-highlighting feature). Pagination prev/next use
  `<Icon name="left|right">` instead of the old mask-image arrows.
- **Dropped deps mapped to shared-ui**: Button icon-prop → `<Icon>` slot; Dropdown → DropdownMenu
  (tooltip-on-disabled dropped); Popup → Dialog; Checkbox `@change` → `@update:model-value`.
- **Known pre-existing issues carried over (NOT fixed — out of scope)**: grouping mode
  (`groupedData`) currently returns HARDCODED MOCK data instead of `props.data`; several emits
  (`row-select`/`row-select-all`/`column-toggle`) are declared but never emitted; `checkedConfig`
  prop is mutated directly; `JSON.parse(localStorage)` unguarded; ~22 `console.log`. Address
  before any app turns on grouping / relies on selection emits.
- **Runtime feature checklist (frozen/resize/drag/sort/pagination) not fully browser-verified** — only
  typecheck (6/6 pass) + rspack build (ads-manager + shell pass) were verified in the earlier table port.
  Sticky surface behavior is implemented as an alpha-only CSS/Vue default for header/frozen/footer zones;
  browser smoke status must be recorded by the current implementation report/final response.
- **Internal columns clone (do NOT mutate props.columns)**: `currentColumns` is a `ref<Column[]>`
  populated from a shallow clone of `props.columns` (each element spread, `frozen` re-derived from
  localStorage if previously saved). `toggleFreeze`/sort/drag mutate this internal ref so reactive
  re-eval is guaranteed even when the caller passes a non-reactive literal (typical case — see
  AdAccountTable.vue's `const columns = [...]`). Without this, mutating `column.frozen` on a literal
  prop object silently dropped the column out of both `frozenColumns` and `nonFrozenColumns` — see
  lesson `data-grid-mutate-props-columns`.

- **Public import path**: app consumers should import data-grid as `import { Table } from '@mf2/shared-ui/table'`, not from the root `@mf2/shared-ui` barrel. The root export remains for backward compatibility, but narrow subpath imports prevent icon-only/loading-only/form/toast consumers from pulling table/dialog/dropdown/select dependencies into initial chunks. Related narrow entrypoints now include `@mf2/shared-ui/sonner` for `Toaster`/`toast` and `@mf2/shared-ui/form-controls` for common form/control primitives; using those in `adaccounts` removed the Rspack native CSS order warning between table/dialog/vue-sonner CSS without needing `ignoreWarnings`.

- **Loading skeleton rows are data-shaped:** when `data.length === 0 && loading`, `Table` creates 10 placeholder rows with a stable row `id` and a `.data` object (`{ [key_id]: "__skeleton-N" }`) so the template enters the normal data-row branch and the existing `<Skeleton v-if="loading">` cells render. When loading is false and data is empty, it returns an empty array — no phantom group rows. Callers must bind `:loading` during fetches.

- **Toolbar buttons**: table toolbar actions render as icon-only shared-ui `Button`s with `variant="secondary" size="icon"`, reusable `.data-grid-toolbar-icon-button`, and `Tooltip` labels (`Làm mới`, `Bộ lọc`, `Tải xuống`, `Tùy chỉnh cột`). The `tools:['time']` action renders the shared `DateRangePicker` directly, replacing the old inert calendar placeholder; callers can bind optional `dateRange` and listen to `update:date-range`, `date-range-apply`, and `date-range-cancel`. Visual contract: 36px white circular/pill surface, no visible border, dark centered icon, subtle green shadow, accessible hover/focus ring. Keep this class scoped to toolbar triggers only; do not apply it to full-width/dialog actions such as export-popover "Tải xuống" or custom-column "Lưu". The export/download popover keeps the shared Popover primitive but overrides it locally from `ExportMenu.vue` with `.data-grid-export-menu` + utility classes so only this data-grid menu uses the header dropdown palette (`#F3F7F5` surface, `#BFD8CC` border, `#5E6360` helper text, 12px radius, soft shadow); its radio rows use 8px rounded row hover/selected green tints (`#D8E9E1`/`#E8F7EE`) and green checked radios, while the CTA remains the shared primary `Button`. Do not change global `PopoverContent` to fix this menu. By default they render in the table's own toolbar row (`flex justify-end gap-[12px] p-[10px]`). Callers can pass `toolbarTarget` (`string | HTMLElement`) to Teleport the actions into an external container, e.g. a workspace-frame toolbar; the Teleport branch uses a layout-neutral `contents` wrapper so actions participate directly in the caller toolbar's flex/gap/overflow rules instead of adding nested padding or a second flex row. The zoom toolbar button is intentionally commented/hidden by product request; fullscreen state/logic remains for future reuse.

## Checkbox row-range selection (all `showCheckbox` tables)
- **Activation**: every table with `showCheckbox` on plain non-pivot/non-grouped rows. Group/pivot rows are skipped because row identity can be summary/group-only.
- **Drag (Excel-like fill)**: mousedown in `.checkbox-cell` **toggles the row immediately** (no wait for mouseup), records it as anchor, and snapshots the selection. Dragging vertically then copies the **anchor's post-toggle state onto the whole range** (`getCheckboxDragAction`): just-checked anchor -> select range, just-unchecked -> deselect range. Each move re-applies from the snapshot so shrinking the range restores prior state. Mousedown `preventDefault` stops native text selection; the checkbox's own click (fired after mouseup) is suppressed via `suppressCheckboxClickUntilMouseUp` so it doesn't toggle back.
- **Shift-click**: Shift-clicking another checkbox toggles the row interval based on the **ending row's** state (`getCheckboxRangeAction`); its own click event is suppressed the same way. While Shift stays held the anchor does NOT move — consecutive shift-clicks keep ranging from the same start row; on Shift **keyup** the last clicked row is promoted to the new anchor (`onShiftReleasePromoteAnchor`).
- **Isolation from cell range-select**: existing cell range-select skips `.checkbox-cell`; checkbox range handlers run only from checkbox cells, so range-copy selection and row checkbox selection do not compete.
- **State compatibility**: still mutates `checkedConfig.selected` to match the existing Table selection contract; it does not rely on the currently-unused `row-select` emits.


## Header dropdown cursor
- The header option menu (3-dot `.header-option` trigger + its `DropdownMenuItem`s for freeze/sort)
  carries `cursor-pointer`. Items override the shadcn `DropdownMenuItem` default (`cursor-default`)
  locally in `Table.vue` only — the shared `DropdownMenuItem.vue` component is untouched so other
  menus across the repo keep the shadcn default.
- Freeze/unfreeze clears the local `colOpenOption` immediately in `toggleFreeze`. This avoids a stale
  active trigger background when the menu closes while the column moves between frozen/non-frozen panes.

## Pane split boundary and full-left fake scrollbar
- `.table-pane-root.is-scrolling-x` marks horizontal scroll (`scrollLeft > 0`) while frozen width exists.
  The frozen header/body/footer panes draw a subtle right border + shadow at their right edge so the
  frozen/scrollable boundary remains visible after pane split removed the old sticky-overlap shadow.
- Native horizontal scrolling remains owned by `.table-pane-scroll-body`, because virtualization,
  header/footer transforms, auto-scroll, and range geometry use that element as the real scroll source.
  Do not replace it with shadcn/reka `ScrollArea` as a quick fix.
- Product wants the horizontal scrollbar to visually start from the left edge of the whole table, not
  after the frozen pane. `Table.vue` therefore renders `.table-fake-scrollbar` as an absolute overlay
  under `.table-pane-root` (`left:0; right:0`; `bottom:0`, or `bottom:60px` when `showTotal` renders the
  footer so the fake bar does not steal footer hit area). The thumb width/left are derived from
  `scrollViewportWidth`, `nonFrozenWidth`, and `scrollLeft`; dragging or clicking the fake scrollbar
  writes to `dataGridMain.scrollLeft`, then the existing `handleMainScroll` path remains the source of
  truth for syncing header/footer transforms, virtual columns, and range geometry. The WebKit/Blink
  native horizontal scrollbar on `.table-pane-scroll-body` is hidden; the remaining native/custom
  scrollbar thumb style is 6px, `border-radius:999px`, `rgba(0, 0, 0, 0.10)`. Firefox `scrollbar-width:none` is
  intentionally not used in this pass to avoid hiding vertical scroll before browser verification.

## Freeze-disabled tooltip
- Item "Đóng băng cột này" có thể bị disable bởi 3 lý do gộp: `!showFrozenControls` (tắt tính năng),
  `pivotMode`, hoặc `!canShowFreezeButton` (tổng width frozen + cột này > `maxFrozenWidth` = 70% available).
- Computed `freezeDisabledReason(field) → string | null`: trả về message theo từng lý do, hoặc `null` khi
  hợp lệ (cột đã frozen luôn `null` vì luôn cho bỏ băng). Khi `null` → render `DropdownMenuItem` enable như cũ.
- Khi có reason → bọc item trong `Tooltip > TooltipTrigger(as-child) > span.block > DropdownMenuItem disabled`.
  Lý do bọc `<span>`: reka-ui set `pointer-events-none` lên item `disabled` nên không tự nhận hover — span
  ngoài vẫn nhận pointer-events để bật tooltip. Item vẫn không click được (giữ semantic disabled).
- `TooltipProvider :delay-duration="300"` mount 1 lần ở gốc template (renderless, không đổi layout). Áp dụng
  cho cả 2 nhánh header (frozen `column` + non-frozen `vCol`). Additive — không đổi props/events public.

## Column resize UX (desktop polish)
- **Architecture**: preview-line + apply-on-release (kéo chỉ di chuyển vạch preview, thả mới ghi width →
  tránh reflow body khi đang kéo). `startResize`/`handleResize`/`stopResize` + `getMaxColumnWidth` clamp.
  Min width 80px hardcode. Double-click `.column-resizer` = reset về default (`resetColumnWidth`).
- **Hit-area**: `.column-resizer` là grab zone 8px vô hình neo `right:0` BÊN TRONG header-cell (cell có
  `overflow:hidden` nên overhang sẽ bị clip — không dùng `right` âm). Vạch hiển thị mảnh 2px vẽ bằng
  `::before` ở mép phải, chỉ sáng `var(--primary)` khi hover/active (không đổi width → không giật).
  Zone kết thúc trước dropdown trigger (~8px padding) nên không cướp click nút more-vertical/drag-handle.
- **Live tooltip**: reactive `previewWidth` (set ở `startResize` = startWidth, `handleResize` = newWidth
  sau clamp). `.resize-tooltip` bám đỉnh `.resize-preview-line` hiện `<px>px` realtime. Header cột đang
  kéo thêm `.is-resizing-target` (tint nền nhẹ), bind ở cả nhánh frozen + non-frozen.
- **Frozen max-limit feedback**: reactive `maxLimitPosition`/`isAtMaxLimit`. `startResize` tính ghost-line từ
  `getMaxColumnWidth` (guard `Number.isFinite` → non-frozen/pivot trả Infinity nên KHÔNG có ghost). Vạch
  `.resize-max-line` (dashed, `--destructive`) hiện suốt drag tại vị trí max. `handleResize` so desiredWidth
  (trước clamp) vs maxWidth → `isAtMaxLimit`; chạm trần thì preview-line + tooltip chuyển `.is-at-max` (đỏ) +
  text "Tối đa". Giới hạn thực = `MAX_FROZEN_WIDTH_RATIO` (hằng số = 0.7, dùng cho `maxFrozenWidth` +
  `autoFreezeAndOrderColumns`): TỔNG các cột đóng băng chỉ được chiếm tối đa 70% available width. `stopResize`
  reset các ref. Trục `maxLimitPosition` dùng chung `columnStartPosition` (đã gồm scrollLeft) như `previewPosition`.
- **z-index**: grab zone 5 < ghost max-line 999 < preview-line 1000. Cursor `col-resize` ở `.column-resizer`
  (style.css) + `body.resizing-column` toàn cục; rule cursor trùng trong Table.vue đã gỡ.
- **Scope**: desktop-only (mouse events), additive (không thêm/đổi props/events public → MF-singleton safe).
  KHÔNG có: touch, live-resize, auto-fit nội dung.

## Header drag-reorder (direct column ordering)
- **Activation**: every visible non-checkbox header cell gets a 6-dot `grip-vertical` handle. Drag starts only from the handle, so header dropdown, resize, sort, and range-select header drag remain separate.
- **Zone rule**: columns reorder only inside their current zone. Frozen columns can move among frozen columns; non-frozen columns can move among non-frozen columns. Cross-zone drops are ignored and do not freeze/unfreeze columns.
- **Persistence**: successful drops update `columnsApply` / `frozenOrder` immediately and write the existing `config_column.config_<tableName>` localStorage shape for visible columns, matching the current custom-column save semantics.
- **UX**: while dragging, the target column moves with the pointer as a live preview, plus a floating ghost chip. CSS includes reduced-motion fallback. Implementation uses native mouse events, no new DnD dependency.
- **Props**: `enableRangeSelect?: boolean` (default false → zero regression), `formatCopyValue?: (key,row) => string|undefined`.
  Column gains optional `type?`/`copyable?`/`copyFields?` (additive). Toast already exported via `ui/sonner`.
- **Activation guard**: only on plain tables — `enableRangeSelect && !pivotMode && rowGroups.length===0`.
  Group/pivot use indented/summary rows the index-based coordinate model does not cover.
- **Coordinate model (differs from source mixin)**: scroll container is `dataGridMain` (native scroll,
  holds scrollTop+scrollLeft). checkbox width 60, header height 50 (source used 61/44).
  Row index ↔ `finalDataForRendering`; `rangeRows` unwraps `.data`.
- **Highlight = cell-background paint, NOT an overlay layer**: `cellRangeLevel(rowIndex,colIndex)` →
  `rangeCellClass(rowIndex,field)` applies `.range-cell` / `.range-cell--primary` to each in-range cell.
  `colRangeLevel(colIndex)` → `headerRangeClass(field)` tints selected column headers with the same
  solid `#D8E9E1` as body cells (`.header-cell.range-col` / `.range-col--primary`) and keeps header text
  at `#5E6360` for readability. The solid tint (no alpha) prevents frozen+scrollable cells from stacking
  transparency; frozen cells stay pinned on scroll (native sticky, no translateX lag). `.range-cell`/`.range-col`
  use `!important` to beat the inline `background` from getCellBackground (stripe/frozen) and the header's
  `--muted`. `rangeColIndexByField` maps field→index over the FULL visibleColumns so it is stable under
  horizontal virtualization.
- **Row hover background disabled** (all tables): `.grid-row:hover` colour rules removed so nothing fights
  the range tint; `.grid-row:hover { z-index:5 }` kept for cell-custom slide-up. Header columns are divided
  by `border-right: var(--border-table)` (matches row cells).
- **Floating copy/settings buttons** (`actionsAnchor`): live in `.table-pane-root` overlay space after the pane-split refactor, so `actionsAnchor` returns visual coordinates relative to that root instead of old scroll-content coordinates. Position = range bottom-right corner inset inward, then clamped to the visible table frame so the cluster pins to the table edge and never disappears when the range scrolls out of view. Frozen-only ranges (every column in the range has `frozen: true`) clamp inside the sticky-left band `[0, frozenWidth]`; non-frozen/mixed ranges clamp across `frozenWidth + scrollViewportWidth`. `Table.vue` binds `top/left` directly from the anchor — do not subtract `scrollTop`/`scrollLeft` again or the buttons become fixed at a stale position.
- **Copy flow** (use-range-copy-flow): always copies the FULL selected range — no column picker, no
  per-table presets. The only option is include-header, toggled in the range-actions settings dropdown
  ("Copy cả tiêu đề cột") and persisted to the global localStorage key `range_copy_include_header`
  ("1"/"0", shared by all tables). TSV via `buildTSV` (default `String(row[field] ?? "")`, `formatCopyValue`
  override). Clipboard: navigator.clipboard in secure context, textarea+execCommand fallback. Soft cap
  `COPY_CELL_CAP=10000`. The settings dropdown intentionally uses a real `Checkbox` inside a `Label` (not
  `DropdownMenuCheckboxItem`) so the empty checkbox remains visible and clicking the row toggles the value
  without closing the dropdown. (Old `range_copy_presets_*` keys from the removed preset system are left untouched.)
  On a successful clipboard write the flow fires `onCopied`, which Table.vue uses to play a copy-wave.
- **Copy-confirmation wave** (Table.vue `triggerCopyWave`/`copyWaveStyle` + CSS `range-copy-wave`): after a
  successful copy (Cmd/Ctrl+C or the copy button), a subtle left-to-right inset-glow shimmer ripples across
  the copied range. Per-column stagger via inline `--copy-wave-delay` (35ms/col, capped 12 steps); cell anim
  600ms. Animates `box-shadow` (inset), NOT `background` — the range tint is `!important` and would win over
  an animated background; inset shadow sits above the fill but below text so values stay readable. The
  `range-cell--copied` class is re-keyed (reset to 0 → nextTick → 1) so it replays on back-to-back copies;
  honors `prefers-reduced-motion`. Timer cleared on unmount.
- **Interactions**: drag cell range (delayed activation keeps native text-select until mouse leaves anchor),
  Ctrl/Cmd multi-range, Shift extend, header click/drag = column select, auto-scroll near edges (RAF),
  Cmd/Ctrl+C copy (skipped while editing input/textarea/contenteditable), ESC / click-outside clear.
- **Click-outside clear scope** (`onDocumentMouseDown`, capture phase): a plain click anywhere
  outside the selected range clears it — including clicks elsewhere *inside* the grid (toolbar,
  paging, empty space, headers). Two targets keep the selection: `.range-actions` (floating
  copy/settings buttons, so their handlers run) and `[data-slot="dropdown-menu-content"]` — the
  settings DropdownMenu portals its content to `<body>` outside `.range-actions`, so without this
  exemption clicking the "Copy cả tiêu đề cột" checkbox would clear the selection and unmount the
  overlay mid-interaction. Shift/Ctrl/Cmd clicks are exempted early so the body/header handlers can
  still extend or add ranges (the capture-phase listener would otherwise clear the selection before
  those handlers see it).
- **Not browser-verified**: pure logic has 46 vitest tests; selection/overlay/copy UI verified only by
  typecheck. Manual checklist (drag overlay alignment under frozen+scroll, multi-range, paste into
  Excel, include-header toggle persistence) still pending a real browser pass.

## Export / Tải xuống (`tools:['download']`)
- **Activation**: toolbar `ExportMenu` replaces the old download stub button — renders only when caller passes
  `tools` including `'download'`. Generic: any table that opts in exports without extra code (AdAccountTable
  unchanged).
- **UI**: `ExportMenu.vue` = reka-ui `Popover` (`v-model:open`) + `RadioGroup` of 3 formats `.xlsx` (default) /
  `.csv` / `.txt` + helper text + "Tải xuống" button. Picks format only; emits `export(format)` and closes.
  Table owns the actual export via `exportData(format)`.
- **Column set**: `visibleColumns` directly — already in display order, hidden columns dropped, checkbox column
  excluded. Header = `column.name`.
- **Row set**: all `props.data` when no selection; when `checkedConfig.selected` non-empty, only those rows
  (filtered by `String(row[table_info.key_id])`). Rows are unwrapped to flat objects via `r.data ?? r`,
  matching `rangeRows`.
- **Cell values**: reuse `props.formatCopyValue(field, row)` when defined (e.g. status `"active"` → `"Đang chạy"`),
  else raw `row[field]`. For `.xlsx`, raw numbers are kept as JS numbers so Excel stores them numeric; null/undefined → `""`.
- **File**: `smit-adscheck-<table_info.name>-<YYYY-MM-DD>.<ext>`. `.txt` = TSV via `matrixToTSV`/`escapeTSVCell`
  (same escaping as range-copy). `.csv` = `XLSX.utils.sheet_to_csv` + UTF-8 BOM (Excel reads Vietnamese). `.xlsx`
  = `aoa_to_sheet` + `writeFile`.
- **Bundle**: `xlsx` (SheetJS, `^0.18.5`) is `await import('xlsx')`-ed inside `exportTable` only for csv/xlsx,
  so it stays out of the initial chunk; `.txt` never loads it. `exportTable` is therefore async.
- **Tests**: `use-table-export.test.ts` (11) covers buildExportMatrix (header/order/formatCopyValue priority/
  number-kept-for-xlsx/null→"") + matrixToTSV escaping.
- **Not browser-verified**: matrix/TSV logic unit-tested; the Popover UI + actual file download verified only
  by typecheck. Manual pass (open 3 formats with/without selection, hide a column, check Vietnamese in Excel)
  pending — must be done from a consuming app in a separate PR (isolation layer 2: no `apps/*` change here).
