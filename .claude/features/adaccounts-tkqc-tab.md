---
slug: adaccounts-tkqc-tab
remote: adaccounts
route: /adscheck-pro/adaccounts
roles: []
feature_flag: n/a
status: done
---

## Purpose
Render the real TKQC account table and TKQC tool panel inside the adaccounts remote-owned workspace `TKQC` tab.

## Flow
1. Shell loads `/adscheck-pro/adaccounts` and the remote renders [[adaccounts-workspace-tabs]].
2. Workspace default tab is `adaccounts`.
3. `AdAccountsWorkspace` renders `TkqcTableView` in the main slot when the active tab is `adaccounts`, and maps the TKQC tab count to the current account row count.
4. `TkqcTableView` delegates to the existing `AdAccountTable`, which loads real ad accounts via [[adaccounts-account-list]].
5. `AdAccountsWorkspace` renders the TKQC load config button as the first action inside `#adaccounts-workspace-table-toolbar`, before teleported data-grid table actions, and the dialog calls `loadWithConfig` from the account list composable.
6. `AdAccountsWorkspace` renders `TkqcFunctionPanel` in Function panel 1 when the active tab is `adaccounts`.
7. `TkqcFunctionPanel` resolves selected account ids from [[adaccounts-account-selection]] against account rows from [[adaccounts-account-list]], then passes resolved accounts to [[adaccounts-tool-actions]].
8. `ToolPanel` renders the grouped TKQC function catalog in Function panel 1; selecting tools appends them to the [[adaccounts-tool-actions]] workflow-step list in click order, and `TkqcDetailPanel` in Function panel 2 runs selected steps only when their id exists in the `TOOL_RUNNERS` registry (`rename`, `open-close-account`, `remove-user` currently wired). Tools without runners stay visible but warn truthfully instead of faking success. No adaccounts-local advanced-mode switch remains in the workspace tab.

## Entry points / Routes
- `/adscheck-pro/adaccounts` -> `AdAccountsWorkspace` -> TKQC tab.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/features/adaccounts/components/TkqcTableView.vue — TKQC tab main-slot wrapper around the existing `AdAccountTable`
- apps/adaccounts/src/features/adaccounts/components/LoadAdAccountsConfigDialog.vue — TKQC load config dialog rendered from the workspace frame toolbar
- apps/adaccounts/src/features/adaccounts/components/TkqcFunctionPanel.vue — TKQC Function panel 1 wrapper that resolves selected accounts and renders `ToolPanel`
- apps/adaccounts/src/features/adaccounts/components/TkqcDetailPanel.vue — TKQC Function panel 2 wrapper that resolves selected accounts and renders ordered workflow steps
- apps/adaccounts/src/features/adaccounts/index.ts — public TKQC tab surface for workspace imports
- apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue — wires TKQC tab slots to `TkqcTableView`, toolbar load config, `TkqcFunctionPanel`, and `TkqcDetailPanel`; maps TKQC tab count to current account rows
- apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue — exposes main, Function panel 1, and caller-overridable Function panel 2 slots while keeping placeholder fallbacks
- apps/adaccounts/src/features/adaccounts/tools/components/ToolPanel.vue — TKQC Function panel 1 grouped catalog; selecting functions appends/focuses workflow steps
- apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue — TKQC Function panel 2 ordered selected-step list/form/run UI

## APIs used
- Same as [[adaccounts-account-list]] for account loading.
- Same as [[adaccounts-tool-actions]] for TKQC tool runners.

## State
- Workspace active tab: `useWorkspaceTabStore` from [[adaccounts-workspace-tabs]].
- Account rows/cache: `useAccountList` from [[adaccounts-account-list]].
- Selected account ids: `useAccountSelection` from [[adaccounts-account-selection]].
- Tool state/localStorage: [[adaccounts-tool-actions]] (`selectedFunctionIds`, `expandedStepIds`, per-tool form values, `adaccounts.tool-order.v1`, `adaccounts.tool-runner-settings.v1`).

## Permissions / Flags
- none in app routing.
- Real FB data/tool execution still requires SMIT Connect extension and a logged-in Facebook session.

## Verification
- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`
- Manual UI smoke: TKQC tab renders table; row selection updates selected count; Function panel 1 shows the grouped TKQC catalog; selecting multiple functions adds ordered steps to Function panel 2; wired steps dispatch from Panel 2 via runner registry.

## Related
[[adaccounts-workspace-tabs]] [[adaccounts-account-list]] [[adaccounts-account-selection]] [[adaccounts-tool-actions]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- `features/adaccounts` now owns the TKQC/ad account table wrappers, account list, account selection, and TKQC tool panel. The old `account-list`, `account-selection`, `tkqc`, and `tool-actions` feature folders were consolidated during the domain refactor.
- `ToolPanel` no longer owns an adaccounts-local advanced-mode switch or runner footer; it is now the TKQC grouped catalog. Selected workflow-step configuration and execution live in `ToolDetailPanel` inside Function panel 2.
- The TKQC `Cấu hình tải` trigger uses the same icon-only shared-ui `Button` styling as data-grid toolbar actions (`variant="secondary" size="icon" class="data-grid-toolbar-icon-button"`) and must remain first in `#adaccounts-workspace-table-toolbar` so it visually/semantically aligns with teleported table buttons.
- Store ids and localStorage keys are preserved; do not rename them during wrapper migration.
- Runners stay in `apps/adaccounts/src/api/tools/**` for this port.
