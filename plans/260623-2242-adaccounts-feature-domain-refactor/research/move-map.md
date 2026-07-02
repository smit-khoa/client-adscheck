# AdAccounts Feature Domain Refactor Move Map

## Summary

Phase 1 inventory for moving historical implementation-owner folders into explicit domain folders.

Target top-level folders after full refactor:

```text
apps/adaccounts/src/features/
  workspace/
  adaccounts/
  businesses/
  page/
  pixel/
```

## Baseline checks

| Check | Result | Notes |
|---|---|---|
| `pnpm --filter @mf2/adaccounts typecheck` | PASS | Exit code 0 |
| `pnpm --filter @mf2/adaccounts build` | PASS_WITH_WARNINGS | Exit code 0; existing CSS order warnings and asset-size warnings |

## Persisted keys and store ids

Preserve these by default during move. Folder/domain rename does not require persisted key rename.

| Kind | Current location | Key/id | Decision |
|---|---|---|---|
| Pinia store id | `features/workspace/stores/workspace-tab-store.ts` | `adaccounts-workspace-tabs` | Preserve |
| Pinia store id | `features/account-selection/stores/account-selection-store.ts` | `adaccounts-selection` | Preserve during move |
| Pinia store id | `features/bm-data-loading/stores/bm-selection-store.ts` | `bm-selection` | Preserve during move unless safe migration is explicit |
| Pinia store id | `features/page-selection/stores/page-selection-store.ts` | `adaccounts-page-selection` | Preserve |
| localStorage | `features/tool-actions/composables/use-tool-actions.ts` | `adaccounts.tool-order.v1` | Preserve |
| localStorage | `features/tool-actions/composables/use-tool-actions.ts` | `adaccounts.tool-enabled.v1` | Preserve |
| localStorage | `features/tool-actions/composables/use-tool-runner-settings.ts` | `adaccounts.tool-runner-settings.v1` | Preserve; shared by adaccounts/page runner settings |
| localStorage | `features/page-tool-actions/composables/use-page-tool-actions.ts` | `adaccounts.page-tool-order.v1` | Preserve |
| localStorage | `features/page-tool-actions/composables/use-page-tool-actions.ts` | `adaccounts.page-tool-enabled.v1` | Preserve |
| extension storage | `features/account-list/composables/use-account-list.ts` | account list cache keys in file | Preserve exact constants |
| extension storage | `api/fb-token-cache.ts` | token cache key in file | Preserve; app API infra stays in `src/api` |

## Domain mapping rules

- `features/workspace/**` remains in place.
- `features/pixel/**` remains in place, no API/data expansion.
- Adaccounts domain owns current TKQC/ad account table, selection, and TKQC tools.
- Businesses domain owns current BM data loading, selection, BM action panel, tool types, and BM utilities.
- Page domain owns current Page manager, selection, and Page tools.
- Low-level FB/extension/runners under `apps/adaccounts/src/api/**` stay outside feature domains unless a later phase explicitly chooses otherwise.

## Old folder to new folder mapping

| Old folder | Target folder | Notes |
|---|---|---|
| `features/tkqc` | `features/adaccounts` | Wrapper components become Adaccounts domain components; UI label may stay TKQC |
| `features/account-list` | `features/adaccounts` | Account table/list API/composable/types |
| `features/account-selection` | `features/adaccounts` | Selection composable/store/types |
| `features/tool-actions` | `features/adaccounts/tools` or app-local common | Adaccount tool catalog/actions; generic reusable pieces may move app-local only if Page still shares |
| `features/bm` | `features/businesses` | Wrapper components become Businesses domain components; UI label may stay BM |
| `features/bm-data-loading` | `features/businesses` | Business table/data loader/selection/utils/api/types |
| `features/bm-actions` | `features/businesses/tools` | Business action panel/catalog/runner dispatch UI |
| `features/bm-tool-types` | `features/businesses/tools/types` or `features/businesses/types` | Tool schema types used by business actions |
| `features/page-manager` | `features/page` | Page table/load UI/API/composable/types |
| `features/page-selection` | `features/page` | Page selection composable/store |
| `features/page-tool-actions` | `features/page/tools` | Page tool panel/catalog/actions |

## File-level move map: adaccounts domain

| Old path | New path |
|---|---|
| `features/tkqc/components/TkqcTableView.vue` | `features/adaccounts/components/AdaccountsTableView.vue` |
| `features/tkqc/components/TkqcFunctionPanel.vue` | `features/adaccounts/components/AdaccountsFunctionPanel.vue` |
| `features/tkqc/index.ts` | merge into `features/adaccounts/index.ts` |
| `features/account-list/api/adaccount-batch.ts` | `features/adaccounts/api/adaccount-batch.ts` |
| `features/account-list/api/adaccount-check-hold.ts` | `features/adaccounts/api/adaccount-check-hold.ts` |
| `features/account-list/api/adaccount-field-groups.ts` | `features/adaccounts/api/adaccount-field-groups.ts` |
| `features/account-list/api/adaccount-hidden-limit.ts` | `features/adaccounts/api/adaccount-hidden-limit.ts` |
| `features/account-list/api/adaccount-mappers.ts` | `features/adaccounts/api/adaccount-mappers.ts` |
| `features/account-list/api/list-adaccounts.ts` | `features/adaccounts/api/list-adaccounts.ts` |
| `features/account-list/api/list-business-managers.ts` | `features/adaccounts/api/list-business-managers.ts` |
| `features/account-list/api/load-adaccounts-flow.ts` | `features/adaccounts/api/load-adaccounts-flow.ts` |
| `features/account-list/components/AdAccountTable.vue` | `features/adaccounts/components/AdAccountTable.vue` |
| `features/account-list/components/LoadAdAccountsConfigDialog.vue` | `features/adaccounts/components/LoadAdAccountsConfigDialog.vue` |
| `features/account-list/composables/use-account-list.ts` | `features/adaccounts/composables/use-account-list.ts` |
| `features/account-list/index.ts` | merge into `features/adaccounts/index.ts` |
| `features/account-list/types/account-list.types.ts` | `features/adaccounts/types/adaccounts.types.ts` or `features/adaccounts/types/account-list.types.ts` |
| `features/account-selection/composables/use-account-selection.ts` | `features/adaccounts/composables/use-account-selection.ts` |
| `features/account-selection/stores/account-selection-store.ts` | `features/adaccounts/stores/account-selection-store.ts` |
| `features/account-selection/types/account-selection.types.ts` | `features/adaccounts/types/account-selection.types.ts` |
| `features/account-selection/index.ts` | merge into `features/adaccounts/index.ts` |
| `features/tool-actions/components/ToolFunctionForm.vue` | `features/adaccounts/tools/components/ToolFunctionForm.vue` or app-local common |
| `features/tool-actions/components/ToolList.vue` | `features/adaccounts/tools/components/ToolList.vue` or app-local common |
| `features/tool-actions/components/ToolPanel.vue` | `features/adaccounts/tools/components/ToolPanel.vue` |
| `features/tool-actions/components/ToolRunnerHeader.vue` | `features/adaccounts/tools/components/ToolRunnerHeader.vue` or app-local common |
| `features/tool-actions/composables/create-tool-actions.ts` | `features/adaccounts/tools/composables/create-tool-actions.ts` or app-local common |
| `features/tool-actions/composables/tool-actions-context.ts` | `features/adaccounts/tools/composables/tool-actions-context.ts` or app-local common |
| `features/tool-actions/composables/use-tool-actions.ts` | `features/adaccounts/tools/composables/use-tool-actions.ts` |
| `features/tool-actions/composables/use-tool-runner-settings.ts` | app-local common if Page still shares; otherwise `features/adaccounts/tools/composables/use-tool-runner-settings.ts` |
| `features/tool-actions/data/mock-tool-groups.ts` | `features/adaccounts/tools/data/adaccount-tool-catalog.ts` |
| `features/tool-actions/types/tool-action.types.ts` | `features/adaccounts/tools/types/tool-action.types.ts` or app-local common |
| `features/tool-actions/index.ts` | merge into `features/adaccounts/index.ts` or `features/adaccounts/tools/index.ts` |

## File-level move map: businesses domain

| Old path | New path |
|---|---|
| `features/bm/components/BmTableView.vue` | `features/businesses/components/BusinessTableView.vue` |
| `features/bm/components/BmFunctionPanel.vue` | `features/businesses/components/BusinessFunctionPanel.vue` |
| `features/bm/index.ts` | merge into `features/businesses/index.ts` |
| `features/bm-data-loading/api/fetch-bm-ad-accounts.ts` | `features/businesses/api/fetch-business-ad-accounts.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/api/fetch-bm-admins.ts` | `features/businesses/api/fetch-business-admins.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/api/fetch-bm-assets.ts` | `features/businesses/api/fetch-business-assets.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/api/fetch-bm-base.ts` | `features/businesses/api/fetch-business-base.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/api/fetch-bm-status.ts` | `features/businesses/api/fetch-business-status.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/components/BmDataLoadingView.vue` | `features/businesses/components/BusinessDataLoadingView.vue` |
| `features/bm-data-loading/components/BmLoadConfigDialog.vue` | `features/businesses/components/BusinessLoadConfigDialog.vue` |
| `features/bm-data-loading/components/BmTable.vue` | `features/businesses/components/BusinessTable.vue` |
| `features/bm-data-loading/composables/use-bm-data-loader.ts` | `features/businesses/composables/use-business-data-loader.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/composables/use-bm-selection.ts` | `features/businesses/composables/use-business-selection.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/stores/bm-selection-store.ts` | `features/businesses/stores/business-selection-store.ts` or preserve store file name if key stays `bm-selection` |
| `features/bm-data-loading/types/bm-data-loading.types.ts` | `features/businesses/types/businesses.types.ts` or preserve type filename if rename churn too high |
| `features/bm-data-loading/utils/bm-row-mappers.ts` | `features/businesses/utils/business-row-mappers.ts` or preserve filename if rename churn too high |
| `features/bm-data-loading/utils/concurrency.ts` | `features/businesses/utils/concurrency.ts` |
| `features/bm-data-loading/index.ts` | merge into `features/businesses/index.ts` |
| `features/bm-actions/components/BmActionForm.vue` | `features/businesses/tools/components/BusinessActionForm.vue` or preserve component name if churn too high |
| `features/bm-actions/components/BmActionList.vue` | `features/businesses/tools/components/BusinessActionList.vue` or preserve component name if churn too high |
| `features/bm-actions/components/BmActionPanel.vue` | `features/businesses/tools/components/BusinessActionPanel.vue` or preserve component name if churn too high |
| `features/bm-actions/components/BmAppealLinkDialog.vue` | `features/businesses/tools/components/BmAppealLinkDialog.vue` |
| `features/bm-actions/components/BmManagerDialog.vue` | `features/businesses/tools/components/BmManagerDialog.vue` |
| `features/bm-actions/composables/use-bm-actions.ts` | `features/businesses/tools/composables/use-business-actions.ts` or preserve filename if churn too high |
| `features/bm-actions/composables/use-bm-runner.ts` | `features/businesses/tools/composables/use-business-runner.ts` or preserve filename if churn too high |
| `features/bm-actions/data/bm-tool-functions.ts` | `features/businesses/tools/data/business-tool-functions.ts` or preserve filename if churn too high |
| `features/bm-actions/data/viewer-configs.ts` | `features/businesses/tools/data/viewer-configs.ts` |
| `features/bm-actions/index.ts` | merge into `features/businesses/index.ts` or `features/businesses/tools/index.ts` |
| `features/bm-tool-types/index.ts` | `features/businesses/tools/types/index.ts` |

## File-level move map: page domain

| Old path | New path |
|---|---|
| `features/page/components/PageTableView.vue` | keep `features/page/components/PageTableView.vue` |
| `features/page/components/PageFunctionPanel.vue` | keep `features/page/components/PageFunctionPanel.vue` |
| `features/page/index.ts` | extend `features/page/index.ts` |
| `features/page-manager/api/page-fetch.ts` | `features/page/api/page-fetch.ts` |
| `features/page-manager/components/PageLoadConfigDialog.vue` | `features/page/components/PageLoadConfigDialog.vue` |
| `features/page-manager/components/PageTable.vue` | `features/page/components/PageTable.vue` |
| `features/page-manager/composables/use-page-manager.ts` | `features/page/composables/use-page-manager.ts` |
| `features/page-manager/pages/PageManagerView.vue` | `features/page/components/PageManagerView.vue` or `features/page/pages/PageManagerView.vue` |
| `features/page-manager/types/page-manager.types.ts` | `features/page/types/page.types.ts` or preserve filename if churn too high |
| `features/page-manager/index.ts` | merge into `features/page/index.ts` |
| `features/page-selection/composables/use-page-selection.ts` | `features/page/composables/use-page-selection.ts` |
| `features/page-selection/stores/page-selection-store.ts` | `features/page/stores/page-selection-store.ts` |
| `features/page-selection/index.ts` | merge into `features/page/index.ts` |
| `features/page-tool-actions/components/PageToolPanel.vue` | `features/page/tools/components/PageToolPanel.vue` |
| `features/page-tool-actions/composables/use-page-tool-actions.ts` | `features/page/tools/composables/use-page-tool-actions.ts` |
| `features/page-tool-actions/data/page-tool-catalog.ts` | `features/page/tools/data/page-tool-catalog.ts` |
| `features/page-tool-actions/index.ts` | `features/page/tools/index.ts` or merge into `features/page/index.ts` |

## File-level move map: workspace and pixel

| Current path | Decision |
|---|---|
| `features/workspace/**` | Keep; update tab keys from `tkqc/bm` to `adaccounts/businesses` in Phase 2 |
| `features/pixel/**` | Keep; no API/data expansion |

## App-local common candidates

Only extract after domain moves prove 2+ real usages remain.

| Candidate | Current source | Possible target | Reason |
|---|---|---|---|
| Generic tool action factory/context/form/list | `features/tool-actions/**` | `apps/adaccounts/src/lib` or `apps/adaccounts/src/components` / `composables` | Used by adaccounts and page tool panels |
| Runner settings composable/header | `features/tool-actions/composables/use-tool-runner-settings.ts`, `ToolRunnerHeader.vue` | app-local common | Settings currently shared by TKQC and Page |

Avoid creating `features/common` or `features/shared`.

## Phase 1 notes

- No app source changes in Phase 1.
- `ck` CLI unavailable earlier, so plan files were created manually.
- Build output must be recorded after background build finishes.
