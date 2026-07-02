---
slug: adaccounts-basic-mode
remote: adaccounts
route: n/a
roles: []
feature_flag: n/a
status: superseded
---

## Purpose
Historical doc for the removed adaccounts-local `basic/advanced` presentation mode. The `/app/adaccounts` route is now owned by [[adaccounts-workspace-tabs]], and TKQC/BM/Page/Pixel are workspace tabs.

## Flow
1. Superseded: `/app/adaccounts` now renders [[adaccounts-workspace-tabs]].
2. Old `basic-mode`, `advanced-mode`, and `mode-store` source files were removed after TKQC/BM/Page/Pixel tabs were wired.
3. Do not add new logic to this feature; use [[adaccounts-tkqc-tab]], [[adaccounts-bm-tab]], [[adaccounts-page-tab]], or [[adaccounts-pixel-placeholder]].

## Entry points / Routes
- None. Superseded by [[adaccounts-workspace-tabs]] on `/app/adaccounts`.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/pages/AdAccountsPage.vue — route view; renders AdAccountsWorkspace because workspace tabs replaced basic/advanced mode routing

## APIs used
- none directly (composes account-list + tool-actions, which own the FB api/ calls).

## State
- none. The old adaccounts-local mode store was removed; workspace active tab state lives in [[adaccounts-workspace-tabs]].
- Selection/account/tool state is owned by the tab features, not by basic-mode.

## Permissions / Flags
- See frontmatter `roles` and `feature_flag`; no additional permission notes recorded yet.

## Verification
- Run `pnpm verify:all` plus `pnpm --filter @mf2/adaccounts typecheck` and `build` after changing this feature.

## Related
[[adaccounts-account-list]] [[adaccounts-account-selection]] [[adaccounts-tool-actions]] [[adaccounts-bm-data-loading]] [[remote-loading-recovery]]

## Decisions / Gotchas
- **Historical only:** this doc preserves why the old mode split existed. The actual route now uses [[adaccounts-workspace-tabs]].
- **Global mode boundary:** if project-wide mode switching is added later, do not recreate an adaccounts-local `mode-store` owner.
- **Single Toaster outlet:** vue-sonner `<Toaster>` is mounted once in AdAccountsPage; tool-actions fires toasts imperatively via `toast()`. Don't mount a second Toaster.
- **selectedAccounts moved to TKQC tab:** account-selection stores only ids; [[adaccounts-tkqc-tab]] resolves selected ids against account-list data before passing accounts to ToolPanel.
