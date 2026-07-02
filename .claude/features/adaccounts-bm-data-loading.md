---
slug: adaccounts-bm-data-loading
remote: adaccounts
route: /adscheck-pro/businesses
roles: []
feature_flag: n/a
status: done
---

## Purpose
Loads Business Manager rows in the workspace BM tab: base BM list first, then selected advanced API groups with per-group loading/error state and session cache.

## Flow
1. User switches to the BM workspace tab on `/adscheck-pro/businesses`.
2. BM surface always renders `BmTable`, even before rows exist; the load config dialog trigger lives as the first action in `#adaccounts-workspace-table-toolbar`, before teleported data-grid table actions, like TKQC/Page. Before cache hydration, `use-bm-data-loader` probes the live Facebook session through `checkFacebookSession()` so account switches/logouts clear visible rows, clear the per-session group patch cache, expire extension cache timestamps, and show a login error instead of stale BM rows.
3. User chooses source `all` or `byId`, toggles advanced groups, and sets concurrency (default `50`, clamped to at least `1`).
4. `use-bm-data-loader` loads base BM rows through `fetch-bm-base`; base rows remain visible even when group calls fail.
5. If advanced loading is enabled, selected groups run only when toggled on; page/instagram/whatsapp share one asset request, bmAccount/share/limit share ad-account requests, admin/status use their own wrappers, and optional legacyType/legacyQuality groups run through isolated legacy GraphQL calls. Legacy type uses the old `businessID` + `overridePrimaryBusinessLocationEligibility:false` variables and maps `ad_account_creation_limit` to `BM <limit>`; legacy quality uses `entity_id` + `action:null` and maps `isRestricted` to `Restricted`/`Live` plus Vietnamese quality labels.
6. Patches merge by `bmId`; errors are stored in `errorGroups[group]`; session cache keys use `bm:{bmId}:{group}` so a group fetched once is not called again in the same session.
7. `BmTable` renders only business-facing columns from the BM comparison source; JSON/detail/debug fields are not stored in row state and not shown as columns.

## Entry points / Routes
- `/adscheck-pro/businesses` -> workspace BM tab -> `BmDataLoadingView`.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/api/fb-session.ts — live Facebook session probe shared with TKQC/Page cache hydration; expires cache timestamps and resets token slots when the browser FB user changes or logs out
- apps/adaccounts/src/features/businesses/components/BmDataLoadingView.vue — BM workspace tab table shell; always renders the DataGrid and hydrates cached rows on mount
- apps/adaccounts/src/features/businesses/components/BmLoadConfigDialog.vue — shared-ui config modal for source, BM IDs, advanced groups, concurrency
- apps/adaccounts/src/features/businesses/components/BmTable.vue — shared-ui DataGrid adapter for BM rows/columns/group errors and BM row selection sync
- apps/adaccounts/src/features/businesses/composables/use-bm-data-loader.ts — base-first orchestration, group runners, per-session cache, per-group loading/error state
- apps/adaccounts/src/features/businesses/api/fetch-bm-base.ts — base BM list/by-id wrapper
- apps/adaccounts/src/features/businesses/api/fetch-bm-assets.ts — page/Instagram/WhatsApp group wrapper
- apps/adaccounts/src/features/businesses/api/fetch-bm-ad-accounts.ts — owned/client ad-account, limit, currency wrapper
- apps/adaccounts/src/features/businesses/api/fetch-bm-admins.ts — admin summary wrapper using people GraphQL plus system users
- apps/adaccounts/src/features/businesses/api/fetch-bm-status.ts — restriction overview plus enforcement detail wrapper
- apps/adaccounts/src/features/businesses/types/bm-data-loading.types.ts — BM config, groups, row and patch types
- apps/adaccounts/src/features/businesses/utils/bm-row-mappers.ts — response-to-row patch mappers and error normalization
- apps/adaccounts/src/features/businesses/utils/concurrency.ts — per-BM concurrency runner
- apps/adaccounts/src/features/businesses/composables/use-bm-selection.ts — BM selection composable used by the BM action panel
- apps/adaccounts/src/features/businesses/stores/bm-selection-store.ts — remote-local selected BM id store
- apps/adaccounts/src/features/businesses/components/BmTableView.vue — BM workspace wrapper around this loading feature
- apps/adaccounts/src/features/businesses/components/BmFunctionPanel.vue — BM workspace Function panel wrapper around prototype BM actions
- apps/adaccounts/src/features/businesses/index.ts — public BM tab surface

## APIs used
- Facebook Graph `GET /me` with `businesses.limit(...){...}` or fallback `GET /me/businesses` via `apps/adaccounts/src/api/fb-graph.ts`.
- Facebook Graph `GET /{bm_id}` for base-by-id and asset group fields.
- Facebook Graph `GET /{bm_id}/owned_ad_accounts` and `GET /{bm_id}/client_ad_accounts` for account/limit/share groups.
- Facebook GraphQL `BizKitSettingsPeopleTableListPaginationQuery` via Graph API GraphQL first, business GraphQL fallback, plus `GET /{bm_id}?fields=system_users` for admin summary.
- Business GraphQL restriction overview `doc_id=4941582179260904` plus enforcement detail `doc_id=25166016149718566` for current status details.
- Facebook GraphQL legacy BM type `doc_id=32061067960207573` and legacy status/quality `doc_id=3920367411328805` when the optional legacy groups are enabled. These calls use the `legacyGraphql` token policy and failures stay in per-group errors. The legacy parser accepts the old response paths for `ad_account_creation_limit` and `isRestricted` without overwriting current BM status fields.

## State
- Module-scoped refs in `use-bm-data-loader`: `rows`, `isLoadingBase`, `isLoadingAdvanced`, `isLoading`, `baseError`, `activeConfig`.
- Persisted 30-minute extension-storage cache: `v8_bm_rows_cached` stores `{ user_id, saved_at, data: { rows, activeConfig } }`, `v8_bm_active_config_cached` keeps backward-compatible config, and `v8_last_bm_rows_cached` stores the timestamp. `ensureLoaded()` runs `checkFacebookSession()` before `loadedOnce`/row guards; when the live FB user changes or logs out, it clears visible rows, clears `bm:{bmId}:{group}` session patches, expires the timestamp, and avoids hydrating stale rows. Legacy raw row cache is accepted only when current `user_id` cannot be resolved.
- Module-scoped `Map` session cache keyed as `bm:{bmId}:{group}`; no persisted storage and no reload survival.
- Per-row `loadingGroups` and `errorGroups` for group-level UI feedback.

## Permissions / Flags
- No app-level role/feature flag yet. Real data requires SMIT Connect extension plus an active Facebook session/token with sufficient BM permissions.

## Verification
- Run `pnpm verify:features`.
- Run `pnpm --filter @mf2/adaccounts typecheck`.
- Run `pnpm --filter @mf2/adaccounts build`.
- Run `pnpm verify:all` because `.claude/features` AI memory changed.
- Manual check requires SMIT Connect extension + FB login: load all BM, load by IDs, toggle groups off/on, verify disabled groups do not call API and group failures leave base rows visible.

## Related
[[adaccounts-basic-mode]] [[adaccounts-account-list]] [[adaccounts-tool-actions]] [[shared-ui-data-grid-table]]

## Decisions / Gotchas
- Facebook session checks run before cache hydration: `ensureLoaded()` calls `checkFacebookSession()` before the `loadedOnce`/row guards. Account switch/logout resets token slots, expires TKQC/BM/Page cache timestamps, clears visible BM rows and per-session group patches, then shows a login error instead of stale rows.
- Token/session hardening lives in the shared adaccounts FB API layer: legacy GraphQL token parsing accepts old `accessToken` + `EAAHULp`, and `token_i`/`token_graphql` writes merge session metadata instead of clearing existing fields.
- The loader blocks refresh/new submit while either base or advanced loading is active. `isLoadingAdvanced` stays true until status/detail group patching finishes, so an older advanced pass cannot patch rows from a newer load.
- Session patch cache intentionally survives repeated loads in the same browser session; persisted row snapshot cache survives reload/revisit for 30 minutes. Do not confuse the two: session patch cache prevents repeated advanced group calls, persisted snapshot cache restores the last visible table rows/config.
- Advanced toggles are API groups, not just visual column switches: disabled groups must not call API.
- Legacy BM enrichment is separate from current status: `legacyType`, `legacyQuality`, and `legacyStatus` are optional columns/groups and never overwrite `status`, `appealLabel`, or `appealDaysLeft`.
- `Trạng thái` is restriction/enforcement status from the status group; base rows start as `Chưa tải`. The separate `Hoạt động` column was removed because it duplicated the user-facing status meaning.
- `partner` is included in base fetch when advanced is off, or only when the partner group is on when advanced is enabled.
- `BmTable` renders 21 source-facing BM columns: the 24 BM concepts from the comparison source excluding `BM (tên hiển thị phụ)`, `Ghi chú`, and `Hoạt động` per product decision.
- The BM `Cấu hình tải` trigger uses the shared data-grid toolbar icon button contract (`variant="secondary" size="icon" class="data-grid-toolbar-icon-button"`) and stays in the same `#adaccounts-workspace-table-toolbar` container as teleported table buttons; keep it before table actions when adding toolbar items.
- Internal detail/debug payloads such as `pageDetail`, `instagramDetail`, `accountShareDetail`, `adminDetail`, and `adminViewerId` are intentionally not stored or displayed; the table keeps only source-facing summary/count fields.
