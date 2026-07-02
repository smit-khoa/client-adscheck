---
slug: adaccounts-bm-tab
remote: adaccounts
route: /adscheck-pro/businesses
roles: []
feature_flag: n/a
status: done
---

## Purpose
Render BM data loading, BM selection, and BM action workflow inside the adaccounts remote-owned workspace `BM` tab.

## Flow
1. Shell loads `/adscheck-pro/businesses` and the remote renders [[adaccounts-workspace-tabs]].
2. User switches to the `BM` tab (`businesses` internal workspace key).
3. `AdAccountsWorkspace` renders `BmTableView` in the main slot and maps the BM tab count to loaded BM rows.
4. `BmTableView` delegates to the BM data loading view from [[adaccounts-bm-data-loading]].
5. User loads BM rows through the BM config dialog in the workspace toolbar; base rows render first, advanced groups load only when enabled, and group errors stay isolated.
6. `BmTable` mirrors shared-ui table checkbox selection into the BM selection store and enables `tools:['time']` so the shared DateRangePicker appears in the workspace toolbar. Date-range events are UI-only for now; BM data filtering still belongs to the BM load config/data loader.
7. `AdAccountsWorkspace` renders `BmFunctionPanel` in Function panel 1 for the BM tab.
8. `BmFunctionPanel` renders the BM function catalog in Panel 1 as two temporary groups (`Group 1`, `Group 2`) with search, drag reorder inside a group, row-level pin affordance, and selected-row check state; selecting functions appends/focuses ordered BM workflow steps.
9. `AdAccountsWorkspace` renders `BmDetailPanel` in Function panel 2 for the BM tab.
10. `BmDetailPanel` renders selected BM workflow steps and dispatches runnable steps through `useBmRunner().getRunner()/run()`. Viewer and appeal tools keep their existing dialog paths, session-level tools such as create/opt-out can still run without row selection, and tools without a registry entry report the missing-runner error instead of faking success. Optional per-connector `Giây Delay` chips between steps wait before the next step.

## Entry points / Routes
- `/adscheck-pro/businesses` -> `AdAccountsWorkspace` -> BM tab.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/features/businesses/components/BmTableView.vue — BM tab main-slot wrapper around BM data loading UI
- apps/adaccounts/src/features/businesses/components/BmFunctionPanel.vue — BM Function panel 1 wrapper around BM action catalog
- apps/adaccounts/src/features/businesses/components/BmDetailPanel.vue — BM Function panel 2 wrapper around selected BM workflow steps
- apps/adaccounts/src/features/businesses/index.ts — public BM tab surface for workspace imports
- apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue — wires BM tab slots to `BmTableView`, `BmFunctionPanel`, and `BmDetailPanel`; maps BM tab count to loaded BM rows
- apps/adaccounts/src/features/businesses/components/BmDataLoadingView.vue — BM load/refresh screen shell
- apps/adaccounts/src/features/businesses/components/BmTable.vue — shared-ui DataGrid adapter with BM row selection sync
- apps/adaccounts/src/features/businesses/composables/use-bm-selection.ts — BM selection composable
- apps/adaccounts/src/features/businesses/stores/bm-selection-store.ts — BM selected id Pinia store
- apps/adaccounts/src/features/businesses/tools/components/BmActionPanel.vue — BM Panel 1 action catalog; selecting functions appends/focuses workflow steps
- apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue — BM Panel 2 selected workflow steps, schema-driven forms, run controls, and runner dispatch; viewer/appeal kinds bypass the runner registry and open their respective dialogs
- apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue — BM Panel 2 selected workflow steps, forms, run controls, and runner dispatch
- apps/adaccounts/src/features/businesses/tools/components/BmActionList.vue — legacy BM inline action list; currently unreferenced (dead file, safe to delete)
- apps/adaccounts/src/features/businesses/tools/components/BmActionForm.vue — schema-driven BM tool form
- apps/adaccounts/src/features/businesses/tools/components/BmManagerDialog.vue — interactive BM viewer/action dialog
- apps/adaccounts/src/features/businesses/tools/components/BmAppealLinkDialog.vue — appeal-link output dialog
- apps/adaccounts/src/features/businesses/tools/composables/use-bm-actions.ts — expanded function and form state
- apps/adaccounts/src/features/businesses/tools/composables/use-bm-runner.ts — BM runner registry and concurrency settings
- apps/adaccounts/src/features/businesses/tools/data/bm-tool-functions.ts — BM tool catalog
- apps/adaccounts/src/features/businesses/tools/data/viewer-configs.ts — viewer dialog configs for read-then-act tools
- apps/adaccounts/src/features/businesses/tools/index.ts — public prototype BM actions surface
- apps/adaccounts/src/api/fb.ts — local FB API barrel used by ported BM runners
- apps/adaccounts/src/api/fb-bm-token.ts — BM token resolver/cache integration
- apps/adaccounts/src/api/fb-token-cache.ts — extension-storage token cache used by BM token helper
- apps/adaccounts/src/api/tools/bm/share-bm-users.ts — example BM runner; other runners live in the same `api/tools/bm/` folder

## APIs used
- Same BM data APIs as [[adaccounts-bm-data-loading]].
- Prototype BM actions call Facebook Graph/GraphQL through `apps/adaccounts/src/api/fb.ts`, `fb-graph.ts`, `fb-bm-token.ts`, `fb-token-policy.ts`, and SMIT Connect extension fetch. Token policy keeps read AUTO fallback endpoint-owned rather than global, and legacy GraphQL token cache preserves session metadata when available.

## State
- Workspace active tab: `useWorkspaceTabStore` from [[adaccounts-workspace-tabs]].
- BM rows/cache/loading: `useBmDataLoader` from [[adaccounts-bm-data-loading]].
- BM selected ids: `useBmSelection` / `bm-selection-store` under `features/businesses`.
- BM action state: `useBmActions` owns selected workflow ids, expanded step ids, active function, and per-function form values; `useBmRunner` still owns runner registry and concurrency settings.

## Permissions / Flags
- none in app routing.
- Real BM data/actions require SMIT Connect extension and a Facebook session with enough BM permissions.

## Verification
- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`
- Manual UI smoke: BM tab renders load config/table; selecting rows updates BM selected count; Function panel 1 shows two temporary groups (`Group 1`, `Group 2`), search, drag reorder, pin affordance, and selected check without step-number badges; selecting multiple functions adds ordered steps to Function panel 2; delay chips appear between steps; runnable steps dispatch through the BM runner registry; session-level tools can run without selected rows; runner registry compiles and shows errors per action when FB/session/permissions are missing.

## Related
[[adaccounts-workspace-tabs]] [[adaccounts-bm-data-loading]] [[adaccounts-tkqc-tab]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- BM Panel 1 groups are temporary placeholders named `Group 1` and `Group 2`; product classification will happen later. Do not encode business meaning into those labels yet.
- **BM Panel 1 row markup:** function rows render as `div role="button"` instead of outer `<button>` so the inner pin action can remain a real `<button>` without invalid nested-button HTML. Keep Enter/Space handlers when changing this row shell.
- BM runners stay in `apps/adaccounts/src/api/tools/bm/**`; the UI feature only selects rows, gathers form values, and dispatches through the runner registry.
- **BM Panel 2 reuses TKQC `ToolStepFrame`:** `BmActionDetailPanel` imports `ToolStepFrame` from `@/features/adaccounts/tools/components/ToolStepFrame.vue`. Changes to that component affect both TKQC and BM step cards.
- The prototype token cache used AES obfuscation; this port stores JSON directly in SMIT Connect extension storage to avoid adding a new dependency during migration. The cache is still outside page localStorage and tokens retain the same TTL behavior.
- BM admin promote/demote reuses the same `ADMIN_TASKS`/`EMPLOYEE_TASKS` task ids as the share-BM-user flow, so the viewer dialog does not send an empty role array while reporting success.
- The `businessID` used by `fb-bm-token.ts` is carried over from the prototype and still needs live confirmation that it is universal rather than account-specific.
