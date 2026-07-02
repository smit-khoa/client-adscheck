# Prototype File Map — Phase 1

## Baseline Results

Date: 2026-06-23

| Check | Result | Notes |
|---|---|---|
| `pnpm --filter @mf2/adaccounts typecheck` | PASS | `vue-tsc --noEmit` completed with no errors. |
| `pnpm --filter @mf2/adaccounts build` | PASS_WITH_WARNINGS | Rspack compiled in 4.25s. Existing warnings: shared-ui CSS order conflicts and two assets above recommended size. |

Warnings captured from build:

- CSS order conflict between `dialog/style.css` and `table/style.css`.
- CSS order conflict between `vue-sonner/lib/index.css` and `table/style.css`.
- Asset size warning for `497.8d5ad622.js` and `74.8aec427f.js`.

## Strategy Confirmation

No raw merge from `feat-dev-prototype`. Port only selected files/logic into the target tab-based architecture from `plan.md`.

## Current Branch Shape

Current `apps/adaccounts/src` already has:

- TKQC/account features:
  - `features/account-list/**`
  - `features/account-selection/**`
  - `features/tool-actions/**`
- BM loading feature:
  - `features/bm-data-loading/**`
- Presentation modes to be removed/replaced later:
  - `features/basic-mode/**`
  - `features/advanced-mode/**`
  - `stores/mode-store.ts`
- Shared FB infra:
  - `api/smit-connect.ts`
  - `api/fb-token.ts`
  - `api/fb-graph.ts`
  - `api/run-batch.ts`
  - `api/tools/**`

## Prototype Added or Changed Files

Source command: `git diff --name-status HEAD..feat-dev-prototype -- apps/adaccounts/src`.

### Workspace / presentation references

Prototype changes these current presentation files:

- `apps/adaccounts/src/pages/AdAccountsPage.vue`
- `apps/adaccounts/src/features/basic-mode/pages/BasicModeView.vue`

Use as reference only. Phase 2 should build the new remote-owned workspace under `features/workspace/**`, not keep adaccounts-local `basic/advanced` ownership.

### Shared FB API infra to port/adapt

Add from prototype:

- `apps/adaccounts/src/api/fb-bm-token.ts`
- `apps/adaccounts/src/api/fb-token-cache.ts`
- `apps/adaccounts/src/api/fb.ts`

Modify/adapt existing:

- `apps/adaccounts/src/api/fb-graph.ts`
- `apps/adaccounts/src/api/fb-token.ts`
- `apps/adaccounts/src/api/tools/index.ts`

Keep domain runner files under `apps/adaccounts/src/api/tools/**` per accepted decision.

### TKQC domain

Current TKQC source of truth:

- `apps/adaccounts/src/features/account-list/**`
- `apps/adaccounts/src/features/account-selection/**`
- `apps/adaccounts/src/features/tool-actions/**`
- `apps/adaccounts/src/api/tools/rename-account.ts`
- `apps/adaccounts/src/api/tools/open-close-account.ts`
- `apps/adaccounts/src/api/tools/remove-user.ts`
- `apps/adaccounts/src/api/tools/remove-user-helpers.ts`

Prototype adds/changes TKQC tool infrastructure:

- `apps/adaccounts/src/api/tools/share-partner.ts`
- `apps/adaccounts/src/features/tool-actions/components/ToolFunctionForm.vue`
- `apps/adaccounts/src/features/tool-actions/components/ToolList.vue`
- `apps/adaccounts/src/features/tool-actions/components/ToolPanel.vue`
- `apps/adaccounts/src/features/tool-actions/composables/create-tool-actions.ts`
- `apps/adaccounts/src/features/tool-actions/composables/tool-actions-context.ts`
- `apps/adaccounts/src/features/tool-actions/composables/use-tool-actions.ts`
- `apps/adaccounts/src/features/tool-actions/index.ts`
- `apps/adaccounts/src/features/tool-actions/types/tool-action.types.ts`

Phase 3 should migrate these into `features/tkqc/**` while preserving existing TKQC behavior and imports through public `index.ts` surfaces.

### BM domain

Prototype BM data/selection additions:

- `apps/adaccounts/src/features/bm-data-loading/components/BmTable.vue`
- `apps/adaccounts/src/features/bm-data-loading/composables/use-bm-selection.ts`
- `apps/adaccounts/src/features/bm-data-loading/index.ts`
- `apps/adaccounts/src/features/bm-data-loading/stores/bm-selection-store.ts`

Prototype BM actions/tool panel:

- `apps/adaccounts/src/features/bm-actions/components/BmActionForm.vue`
- `apps/adaccounts/src/features/bm-actions/components/BmActionList.vue`
- `apps/adaccounts/src/features/bm-actions/components/BmActionPanel.vue`
- `apps/adaccounts/src/features/bm-actions/components/BmAppealLinkDialog.vue`
- `apps/adaccounts/src/features/bm-actions/components/BmManagerDialog.vue`
- `apps/adaccounts/src/features/bm-actions/composables/use-bm-actions.ts`
- `apps/adaccounts/src/features/bm-actions/composables/use-bm-runner.ts`
- `apps/adaccounts/src/features/bm-actions/data/bm-tool-functions.ts`
- `apps/adaccounts/src/features/bm-actions/data/viewer-configs.ts`
- `apps/adaccounts/src/features/bm-actions/index.ts`
- `apps/adaccounts/src/features/bm-tool-types/index.ts`

Prototype BM API runners:

- `apps/adaccounts/src/api/tools/bm/add-bm-domain.ts`
- `apps/adaccounts/src/api/tools/bm/assign-assets-to-user.ts`
- `apps/adaccounts/src/api/tools/bm/bag-add-assets.ts`
- `apps/adaccounts/src/api/tools/bm/bag-create.ts`
- `apps/adaccounts/src/api/tools/bm/bag-list-delete.ts`
- `apps/adaccounts/src/api/tools/bm/bm-admins.ts`
- `apps/adaccounts/src/api/tools/bm/cancel-pending-invites.ts`
- `apps/adaccounts/src/api/tools/bm/claim-adaccount.ts`
- `apps/adaccounts/src/api/tools/bm/claim-page.ts`
- `apps/adaccounts/src/api/tools/bm/create-adaccount.ts`
- `apps/adaccounts/src/api/tools/bm/create-bm.ts`
- `apps/adaccounts/src/api/tools/bm/create-page-bm.ts`
- `apps/adaccounts/src/api/tools/bm/create-waba.ts`
- `apps/adaccounts/src/api/tools/bm/delete-bm.ts`
- `apps/adaccounts/src/api/tools/bm/enable-monthly-invoicing.ts`
- `apps/adaccounts/src/api/tools/bm/get-appeal-link.ts`
- `apps/adaccounts/src/api/tools/bm/leave-bm.ts`
- `apps/adaccounts/src/api/tools/bm/optout-bm-console.ts`
- `apps/adaccounts/src/api/tools/bm/reactivate-page.ts`
- `apps/adaccounts/src/api/tools/bm/remove-ig-account.ts`
- `apps/adaccounts/src/api/tools/bm/remove-page.ts`
- `apps/adaccounts/src/api/tools/bm/remove-partner.ts`
- `apps/adaccounts/src/api/tools/bm/remove-shared-adaccount.ts`
- `apps/adaccounts/src/api/tools/bm/rename-bm.ts`
- `apps/adaccounts/src/api/tools/bm/request-adaccount-access.ts`
- `apps/adaccounts/src/api/tools/bm/share-bm-users.ts`
- `apps/adaccounts/src/api/tools/bm/show-readonly-adaccount.ts`
- `apps/adaccounts/src/api/tools/bm/update-bm-legal.ts`

Phase 4 should adapt these into `features/bm/**` UI/composable/state while keeping runners in `src/api/tools/bm/**`.

### Page domain

Prototype Page feature files:

- `apps/adaccounts/src/features/page-manager/api/page-fetch.ts`
- `apps/adaccounts/src/features/page-manager/components/PageLoadConfigDialog.vue`
- `apps/adaccounts/src/features/page-manager/components/PageTable.vue`
- `apps/adaccounts/src/features/page-manager/composables/use-page-manager.ts`
- `apps/adaccounts/src/features/page-manager/index.ts`
- `apps/adaccounts/src/features/page-manager/pages/PageManagerView.vue`
- `apps/adaccounts/src/features/page-manager/types/page-manager.types.ts`
- `apps/adaccounts/src/features/page-selection/composables/use-page-selection.ts`
- `apps/adaccounts/src/features/page-selection/index.ts`
- `apps/adaccounts/src/features/page-selection/stores/page-selection-store.ts`
- `apps/adaccounts/src/features/page-tool-actions/components/PageToolPanel.vue`
- `apps/adaccounts/src/features/page-tool-actions/composables/use-page-tool-actions.ts`
- `apps/adaccounts/src/features/page-tool-actions/data/page-tool-catalog.ts`
- `apps/adaccounts/src/features/page-tool-actions/index.ts`

Phase 5 should adapt these into `features/page/**` with a tab table and function panel.

### Pixel domain

No prototype Pixel logic found in the diff. Phase 5 should create only the empty Pixel tab/table/panel placeholder required by the plan. No fake API/data.

## Obsolete Current Files After Migration

Likely obsolete after Phase 2-5 complete:

- `apps/adaccounts/src/features/basic-mode/**`
- `apps/adaccounts/src/features/advanced-mode/**`
- `apps/adaccounts/src/stores/mode-store.ts` as adaccounts-local mode owner
- Old TKQC wrapper locations once replaced by `features/tkqc/**` public surfaces:
  - `features/account-list/**`
  - `features/account-selection/**`
  - `features/tool-actions/**`

Do not delete until the replacement tab architecture compiles and imports are migrated.

## Follow-up Verification Commands

Focused after each code phase:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
```

Final phase:

```bash
pnpm verify:features
pnpm verify:all
```

## Unresolved Questions

- None for Phase 1.
