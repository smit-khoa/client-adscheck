---
slug: adaccounts-account-list
remote: adaccounts
route: n/a
roles: []
feature_flag: n/a
status: done
---

## Purpose
Owns the ad-account domain shape (`AdAccount`), the resilient BM/TKQC data source (real FB Graph API via the extension), and the multi-select account table. Reusable capability — consumed by [[adaccounts-tkqc-tab]] today, by bulk ops / history later. (Export to .txt/.csv/.xlsx now lives in the shared-ui Table via `tools:['download']` — see [shared-ui-data-grid-table](shared-ui-data-grid-table.md); enable it on AdAccountTable in a separate app PR.)

## Flow
1. use-account-list exposes `accounts` + `isLoading` + `error` + `ensureLoaded` + `refresh` + `loadWithConfig`. `ensureLoaded` first probes the live Facebook session through `checkFacebookSession()` before any `loadedOnce`/cache guard, so switching FB accounts or logging out clears stale in-memory rows and expires extension cache timestamps. It then hydrates from the extension's chrome.storage.local cache when still fresh (TTL 30m, no FB call) only when the cache belongs to the current Facebook `user_id`; `refresh` always re-fetches with default config and overwrites the cache.
2. User can open `LoadAdAccountsConfigDialog` from the table header to choose source (`all`/`tkqcIds`/`bmIds`), permission, account type, advanced data groups, and worker count; submit calls `loadWithConfig(config)` and overwrites the cache.
3. api/list-adaccounts delegates to the BM/TKQC flow: normalize config, load lightweight seeds, deduplicate by raw `account_id`, run detail/admin batch, payment batch, hidden-limit GraphQL queue, and check-hold GraphQL queue separately, then merge seed + detail + payment + hidden limit + check hold into `AdAccount` rows. Seed/detail Graph reads that opt into AUTO use endpoint-level fallback to `token_b` only; there is no global fallback chain.
4. Seed modes supported by the API layer: `source=all`, `source=tkqcIds`, `source=bmIds`. The `all` mode supports `permission=all|hasRole` and `accountType=all|personal|bm`.
5. Detail fields are built from `basic`, `finance`, `spendInsights`, and `admin` options. Admin fields include `users{id,is_active,name,permissions,role,roles}`; `userpermissions.user(<uid>){role}` is only added when current FB uid is available. `SL Admin` counts userpermissions roles `ADMIN`/`ADVERTISER`/`ANALYST`, with `users.data.length` fallback.
6. Payment fields are in a separate Graph batch queue. Payment batch failure records payment status/error for affected rows but does not drop seed/basic/finance/admin data.
7. Hidden limit uses the confirmed Adscheck GraphQL source `doc_id=6401661393282937` with `variables={ assetID: account_id }`; parsed from `data.billable_account_by_asset_id.formatted_dsl` in its own bounded queue when finance data is enabled, so failure does not drop other row data.
8. Check hold uses GraphQL `doc_id=6975887429148122` with `variables={ paymentAccountID }`; `paymentAccountID` uses hidden-limit `legacy_account_id` when available, otherwise falls back to `account_id`. The queue maps the response into simple `HOLD/NEED` text: `HOLD` for `prisk_restrictions` or hard restriction booleans, and `OK` otherwise. Billing flags and required wizard are retained on the row but do not change this visible value, matching the bmmanager result observed by Sếp.
9. AdAccountTable calls `ensureLoaded` onMounted, binds `:loading=isLoading` and `@refresh=refresh`. Renders through `@mf2/shared-ui/table` DataGrid `Table` with 26 TKQC columns. It enables `tools:['time']` so the shared DateRangePicker appears in the workspace toolbar; date-range events are currently UI-only until a TKQC date filter is wired. Status and payment status use display adapters for copy/paste.
10. The shared-ui Table owns the visible row/header checkbox UI and mutates `checkedConfig.selected`; AdAccountTable mirrors that array into account-selection `selectedIds` with equality guards so Pinia remains the source of truth for downstream tool panels.
11. If account-selection changes elsewhere, AdAccountTable mirrors `selectedIds` back into `checkedConfig.selected` so the grid checkboxes stay in sync.
12. Header shows "Đã chọn N/total" where N = account-selection.selectedCount.

## Entry points / Routes
- n/a — reusable feature, no own route. Mounted inside [[adaccounts-tkqc-tab]] through `TkqcTableView`.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/api/fb-session.ts — live Facebook session probe using the legacy Banzai endpoint; resets token/data cache timestamps when the browser FB user changes or logs out
- apps/adaccounts/src/features/adaccounts/components/AdAccountTable.vue — shared-ui DataGrid Table adapter for 26 TKQC columns/slots; loads on mount, binds loading + refresh; mirrors Table checkbox state with account-selection
- apps/adaccounts/src/features/adaccounts/components/LoadAdAccountsConfigDialog.vue — shared-ui Dialog form for selecting TKQC source, permissions, account type, data groups, and worker count before calling `loadWithConfig`.
- apps/adaccounts/src/features/adaccounts/composables/use-account-list.ts — owns accounts/isLoading/error refs + ensureLoaded/refresh/loadWithConfig + applyPatches. Extension cache read/write via api/smit-connect extStorageGet/Set.
- apps/adaccounts/src/features/adaccounts/api/list-adaccounts.ts — public `fetchAdAccounts(config?)` wrapper for the resilient BM/TKQC flow.
- apps/adaccounts/src/features/adaccounts/api/list-business-managers.ts — public `fetchBusinessManagers(config?)` for BM list/basic BM rows, including all-BM mode and explicit-id mode with role fallback.
- apps/adaccounts/src/features/adaccounts/api/load-adaccounts-flow.ts — orchestrates seed loading, dedupe, detail/payment batch queues, and final row merge.
- apps/adaccounts/src/features/adaccounts/api/adaccount-field-groups.ts — default config normalization and detail/payment field builders.
- apps/adaccounts/src/features/adaccounts/api/adaccount-batch.ts — Graph batch POST helper, batch size 50, bounded workers, retry/backoff, partial failure handling.
- apps/adaccounts/src/features/adaccounts/api/adaccount-hidden-limit.ts — confirmed Adscheck GraphQL hidden-limit queue (`doc_id=6401661393282937`), bounded workers, retry/backoff, failure isolated from detail/payment rows.
- apps/adaccounts/src/features/adaccounts/api/adaccount-check-hold.ts — GraphQL check-hold queue (`doc_id=6975887429148122`), bounded workers, retry/backoff, failure isolated from other rows.
- apps/adaccounts/src/features/adaccounts/api/adaccount-mappers.ts — ID parsing/normalization, accountType filters, seed/detail/payment/hidden-limit/check-hold -> `AdAccount` mapping.
- apps/adaccounts/src/features/adaccounts/types/account-list.types.ts — `AdAccount`, load config, payment status, owner business types (local; status = FB numeric account_status)
- apps/adaccounts/src/features/adaccounts/index.ts — public surface (AdAccountTable, useAccountList, AdAccount, LoadAdAccountsConfig)

## APIs used
- Facebook Graph `GET /me/adaccounts` or `GET /<uid>/adaccounts` (fields `name,account_id,account_status,owner_business`) via apps/adaccounts/src/api/fb-graph.
- Facebook Graph `GET /me/businesses` (fields `id,name`) for BM discovery.
- Facebook Graph `GET /me?fields=businesses.limit(...){id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,permitted_roles,agencies.limit(100){id,name}}` for BM list rows.
- Facebook Graph `GET /me/business_users?fields=role,business{id}` as role fallback for explicit BM id mode.
- Facebook Graph `GET /<bm_id>?fields=name,owned_ad_accounts.limit(5000){...},client_ad_accounts.limit(5000){...}` for BM-owned/client TKQC seeds.
- Facebook Graph batch `POST https://graph.facebook.com/v24.0` for `GET /act_<id>?fields=<detail/payment fields>`; calls go through SMIT Connect extension `extFetch`, use endpoint-level AUTO token policy with `token_b` fallback, and retry the chunk once after invalidating the used slot when a batch item returns an OAuth/session-stale error.
- Facebook GraphQL `POST https://www.facebook.com/api/graphql/` for hidden limit: `doc_id=6401661393282937`, `variables={ assetID: account_id }`, response path `data.billable_account_by_asset_id.formatted_dsl`; calls go through `api/fb-graph` `graphql()` and SMIT Connect extension.
- Facebook GraphQL `POST https://www.facebook.com/api/graphql/` for check hold: `doc_id=6975887429148122`, `variables={ paymentAccountID }` where `paymentAccountID` prefers hidden-limit `legacy_account_id`; response path `data.billable_account_by_payment_account` supplies `prisk_restrictions`, `billing_flags`, `required_wizard_name`, billing `account_status`, `is_reauth_restricted`, and `is_sdc_restricted`; calls go through `api/fb-graph` `graphql()`. The table displays simple `HOLD/NEED` text: `HOLD` for `prisk_restrictions` or hard restriction booleans, and `OK` otherwise; billing flags / required wizard remain available on the row for debugging only.
- Token/current uid from apps/adaccounts/src/api/fb-token (`getToken`).

## State
- accounts + isLoading + error: module-scoped refs in use-account-list (one instance per remote, persists across nav). loadedOnce guards the first fetch. No selection state here — that is account-selection.
- Extension cache (chrome.storage.local via SMIT Connect): key `v8_adaccount_cached` stores `{ user_id, saved_at, data }` and `v8_last_adaccount_cached` stores the timestamp. Survives panel reopen / page reload (in-memory refs do not). Hydrated only after `checkFacebookSession()` confirms a live Facebook `user_id`; if the user switches FB accounts or logs out, the session probe resets token memory, expires `v8_last_adaccount_cached`, clears visible rows, and shows a login error instead of stale rows. extStorageGet/Set live in api/smit-connect.ts.

## Permissions / Flags
- none in app routing.
- Facebook permissions depend on the currently logged-in FB user/session and the SMIT Connect extension. Graph calls may return partial/empty fields when FB denies specific ad account/BM permissions.

## Verification
- Run `pnpm verify:all` plus `pnpm --filter @mf2/adaccounts typecheck` and `pnpm --filter @mf2/adaccounts build` after changing this feature.
- Manual (needs extension + FB login): rows load from default `source=all`, refresh button reloads, loading shows skeletons, failed seed load shows the error banner; payment failures do not remove basic/detail rows; selecting a row updates the "Đã chọn N/total" header and tool-actions still receives `act_<id>`.

## Related
[[adaccounts-account-selection]] [[adaccounts-basic-mode]] [[shared-ui-data-grid-table]] [[adaccounts-tool-actions]]

## Decisions / Gotchas
- **Facebook session check before cache:** `ensureLoaded()` calls `checkFacebookSession()` before `loadedOnce` or extension-cache hydration. The Banzai probe detects logout/account switch, resets all token slots, expires TKQC/BM/Page cache timestamps, and prevents stale rows from rendering for the wrong FB user.
- **Token parity hardening:** `token_graphql` accepts legacy `accessToken` camelCase with the `EAAHULp` prefix plus current `access_token` shapes. `token_i` and `token_graphql` cache writes parse session metadata from bootloader responses and otherwise preserve existing stored session fields, so lazy token resolution does not erase `user_id`/`fb_dtsg`/`lsd`.
- **List request stays lightweight:** seed calls do not include `users` or payment fields. Admin/users moved into detail batch.
- **Payment is isolated:** payment fields run in a separate queue and failures map to `paymentStatus=error/unavailable` instead of failing the whole list.
- **Batch size is fixed at 50:** `pageLimit` means worker/concurrency count for detail/payment queues, not UI page size.
- **Hidden limit is isolated:** `Limit ẩn` uses Adscheck-confirmed GraphQL `doc_id=6401661393282937` and only runs when finance data is enabled. Queue concurrency is capped at 10 even if `pageLimit` is higher; failures leave `hiddenLimit` blank and do not affect seed/detail/payment data.
- **Check hold is isolated:** `Check Hold` uses GraphQL `doc_id=6975887429148122` and only runs when `checkHold` data is enabled in config. `HOLD/NEED` intentionally does not use the legacy numeric `999` status. It displays `HOLD` when `prisk_restrictions` or hard restriction booleans are present, and `OK` otherwise. Billing-only signals such as `required_wizard_name=ADD_PM_PUX_EP` or `billing_flags=MISSING_PAYMENT_METHOD` do not change the visible value because Sếp observed bmmanager showing `OK` for that response shape.
- **Owner/admin/agency mapping follows confirmed sources:** `owner` is mapped to `ownerId` + `ownerName` per MeoFB, `SL Admin` counts `userpermissions` roles `ADMIN`/`ADVERTISER`/`ANALYST` with `users` fallback, and `Dòng 2 BM` requests `agencies{id,name,access_status,permitted_roles}` but displays names/ids only.
- **Ghi chú intentionally skipped:** `note` remains in the row type/table for report parity, but there is no local note storage/editor in this task.
- **No fake `hiddenBm`:** config keeps the key for compatibility, but no API is wired because source/spec does not confirm the real fetch path.
- **No unconfirmed Billing Hub GraphQL:** do not add `doc_id=6747949808592904` until payload + response path are verified.
- **Uses shared-ui DataGrid Table:** AdAccountTable delegates rendering, header/row checkboxes, virtualization, and column behavior to `@mf2/shared-ui/table` `Table`; app-specific logic is limited to columns, slots, and selection-store sync.
- **Selection sync adapter is required:** shared-ui Table mutates `checkedConfig.selected` directly, so AdAccountTable mirrors it to account-selection `selectedIds` with member-equality guards. Do not add a second selection source in account-list.
- **No promotion to shared-types:** AdAccount stays local until a second remote needs it (repo convention).
- **status is the FB numeric code, not an enum:** AdAccount.status = FB account_status (1/2/3/7/9/101…); AdAccountTable maps it to a Vietnamese chip with a fallback for unknown codes.
- **Real data needs the extension + FB login:** no extension / not logged in → error banner, empty list (not a crash). id is `act_<account_id>` so it feeds the tools directly.
- **Tool runs patch the list locally (no re-fetch):** `applyPatches(Map<id, Partial<AdAccount>>)` mutates the in-memory `accounts` and rewrites the extension cache, so after a rename/open/close the table shows the new value without another FB list call.
- **26-column TKQC table:** UI follows the TKQC concepts (including `HOLD/NEED`). Some columns can be blank by design: `Ghi chú` has no local note storage yet, `Chủ sở hữu` depends on Graph returning `owner`, and `Limit ẩn` depends on the per-account GraphQL queue succeeding.
- **Load config dialog is local UI state:** The dialog does not persist config yet; submitting immediately calls `loadWithConfig(config)` and rewrites the shared account cache.
- **Cache remains shared per browser extension:** switching FB accounts can show stale rows until refresh or TTL expiry. This is existing behavior and not changed in this task.
