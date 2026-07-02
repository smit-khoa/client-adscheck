---
slug: adaccounts-page-tab
remote: adaccounts
route: /adscheck-pro/page
roles: []
feature_flag: n/a
status: done
---

## Purpose
Render prototype Page loading/table UI and Page catalog/detail workflow inside the adaccounts remote-owned workspace `Page` tab.

## Flow
1. Shell loads `/adscheck-pro/page` and the remote renders [[adaccounts-workspace-tabs]].
2. User switches to the `Page` tab.
3. `AdAccountsWorkspace` renders `PageTableView` in the main slot and maps Page tab count to loaded Page rows.
4. `PageTableView` delegates to prototype `PageManagerView`.
5. User opens the Page load config dialog from the first action inside `#adaccounts-workspace-table-toolbar`, before teleported data-grid table actions; Page manager resolves Page IDs first, then loads details/status/monetization based on options. `PageManagerView` probes the live Facebook session before cache hydration, then hydrates rows/config/progress from 30-minute extension-storage cache only for the same Facebook `user_id`. Account switches/logouts clear visible rows, expire cache timestamps, and show a login error instead of stale Page rows.
6. `PageTable` mirrors checkbox selection into the Page selection store and enables `tools:['time']` so the shared DateRangePicker appears in the workspace toolbar. Date-range events are UI-only for now; Page row loading/filtering is unchanged.
7. `AdAccountsWorkspace` renders `PageFunctionPanel` in Function panel 1.
8. `PageFunctionPanel` renders the Page function catalog in Panel 1 as two temporary groups (`Group 1`, `Group 2`) with search, drag reorder inside a group, row-level pin affordance, and selected-row check state; selecting functions appends/focuses ordered Page workflow steps.
9. `AdAccountsWorkspace` renders `PageDetailPanel` in Function panel 2.
10. `PageDetailPanel` renders selected Page workflow steps and schema-driven forms; Page loading/list APIs are real in `page-fetch.ts`, but Page action runners do not exist yet, so running a workflow warns that no real Page action runner is wired in the current code and does not call an action API. Optional per-connector `Giây Delay` chips between steps wait before the next warning step.

## Entry points / Routes
- `/adscheck-pro/page` -> `AdAccountsWorkspace` -> Page tab.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/api/fb-session.ts — live Facebook session probe shared by TKQC/BM/Page cache hydration; expires cache timestamps and resets token slots when the browser FB user changes or logs out
- apps/adaccounts/src/features/page/components/PageTableView.vue — Page tab main-slot wrapper around prototype Page manager view
- apps/adaccounts/src/features/page/components/PageFunctionPanel.vue — Page Function panel 1 wrapper around Page action catalog
- apps/adaccounts/src/features/page/components/PageDetailPanel.vue — Page Function panel 2 wrapper around selected Page workflow steps
- apps/adaccounts/src/features/page/index.ts — public Page tab surface for workspace imports
- apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue — wires Page tab slots and toolbar load config to `PageTableView`, `PageFunctionPanel`, and `PageDetailPanel`; maps Page count to loaded Page rows
- apps/adaccounts/src/features/page/components/PageManagerView.vue — prototype Page table/loading screen shell
- apps/adaccounts/src/features/page/components/PageLoadConfigDialog.vue — Page load config dialog
- apps/adaccounts/src/features/page/components/PageTable.vue — shared-ui DataGrid adapter for Page rows and selection sync
- apps/adaccounts/src/features/page/composables/use-page-manager.ts — Page loading state and orchestration
- apps/adaccounts/src/features/page/api/page-fetch.ts — Page fetch/resolve/detail helpers
- apps/adaccounts/src/features/page/types/page-manager.types.ts — Page row/config/progress types
- apps/adaccounts/src/features/page/index.ts — prototype Page manager public surface
- apps/adaccounts/src/features/page/composables/use-page-selection.ts — Page selection composable
- apps/adaccounts/src/features/page/stores/page-selection-store.ts — Page selected id Pinia store
- apps/adaccounts/src/features/page/index.ts — prototype Page selection public surface
- apps/adaccounts/src/features/page/tools/components/PageToolPanel.vue — Page Panel 1 action catalog; selecting functions appends/focuses workflow steps
- apps/adaccounts/src/features/page/tools/components/PageToolDetailPanel.vue — Page Panel 2 selected workflow steps, schema-driven forms, and UI-only run warning
- apps/adaccounts/src/features/page/tools/composables/use-page-tool-actions.ts — Page tool-action state instance
- apps/adaccounts/src/features/page/tools/data/page-tool-catalog.ts — Page tool catalog
- apps/adaccounts/src/features/page/tools/index.ts — prototype Page tool public surface
- apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts — generic tool-actions factory used by Page tools
- apps/adaccounts/src/composables/tool-actions/tool-actions-context.ts — provider/context used by Page tool list/form

## APIs used
- Facebook Page loading/list APIs through SMIT Connect extension and shared FB helpers in `page-fetch.ts`.
- Page tool actions: no runner registry exists yet; action workflows warn and do not call Page action APIs.

## State
- Workspace active tab: `useWorkspaceTabStore` from [[adaccounts-workspace-tabs]].
- Page rows/config/progress cache: `usePageManager` persists `v8_page_rows_cached`, `v8_page_config_cached`, `v8_page_progress_cached`, `v8_last_page_rows_cached` in extension storage for 30 minutes. The row cache is wrapped with `{ user_id, saved_at, data }`; `ensureLoaded()` calls `checkFacebookSession()` before `loadedOnce`/row guards, so logout/account switch clears visible rows and avoids hydrating data from another FB user.
- Page selected ids: `usePageSelection` / `page-selection-store`.
- Page tool state: `usePageToolActions`, backed by generic `createToolActions` with Page-specific localStorage keys; selected functions render as ordered workflow steps in Function panel 2 while Page runners remain unwired.

## Permissions / Flags
- none in app routing.
- Real Page loading requires SMIT Connect extension and a Facebook session with enough Page permissions.

## Verification
- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`
- Manual UI smoke: Page tab renders load config/table; row selection updates selected count; Function panel 1 shows two temporary groups (`Group 1`, `Group 2`), search, drag reorder, pin affordance, and selected check without step-number badges; selecting multiple functions adds ordered steps/forms to Function panel 2; delay chips appear between steps; running selected Page steps warns that tools are not wired to API yet.

## Related
[[adaccounts-workspace-tabs]] [[adaccounts-pixel-placeholder]] [[adaccounts-tkqc-tab]] [[adaccounts-bm-tab]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- Facebook session checks run before Page cache hydration: logout/account switch resets token slots, expires TKQC/BM/Page cache timestamps, and clears visible Page rows so stale rows from another FB user are not shown.
- Page Panel 1 groups are temporary placeholders named `Group 1` and `Group 2`; product classification will happen later. Do not encode business meaning into those labels yet.
- Page Panel 1 function rows render as `div role="button"` instead of an outer `<button>` so the inner pin action can remain a real `<button>` without invalid nested-button HTML. Keep Enter/Space handlers when changing this row shell.
- Page tools are intentionally UI-only in this port. Page loading/list APIs are real, but action runners are absent; do not treat `page-fetch.ts` as a Page action runner.
- The Page `Cấu hình tải` trigger uses the same icon-only shared-ui `Button` styling as data-grid toolbar actions (`variant="secondary" size="icon" class="data-grid-toolbar-icon-button"`) and must remain first in `#adaccounts-workspace-table-toolbar` so it visually/semantically aligns with teleported table buttons.
- Page tool panel reuses the generic tool-actions list/form factory, so TKQC `ToolPanel` was updated to provide its own tool-actions instance too.
- Luồng/Delay settings are intentionally shared with TKQC through `useToolRunnerSettings` and `adaccounts.tool-runner-settings.v1`; changing them in one panel changes the other.
- No Page logic is promoted to shared packages; this remains app-local.
