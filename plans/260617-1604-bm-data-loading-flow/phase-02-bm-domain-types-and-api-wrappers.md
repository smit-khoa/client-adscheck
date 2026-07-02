---
phase: 2
title: "BM domain types + API wrappers"
status: pending
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: BM Domain Types + API Wrappers

## Overview
Create the BM data-loading feature module with strict TypeScript types and API wrappers around the existing FB-over-extension helpers. Components must not call Graph/GraphQL directly.

## Requirements
- Functional: provide typed functions for base BM list and all advanced groups.
- Functional: support source `all` and `byId`.
- Functional: only API wrappers know Graph fields/doc_ids and response parsing.
- Non-functional: no mock/fake data, no hard-coded responses, no direct `fetch`.
- Functional: use existing `graph()`/`graphql()` helpers where they fit; use raw `extFetch` from `smit-connect.ts` only inside the BM API layer for bmmanager-style endpoints not covered by those helpers.

## Architecture
New feature-local API layer:

```text
features/bm-data-loading/api/* -> apps/adaccounts/src/api/fb-graph.ts -> SMIT Connect extension -> Facebook
```

Core files:
- types define config, groups, row shape, API response fragments.
- mappers normalize FB responses into `Partial<BmRow>` patches.
- API files return patches or throw normalized `Error` for caller to record per group.

## Related Code Files
- Create: `apps/adaccounts/src/features/bm-data-loading/types/bm-data-loading.types.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/utils/bm-row-mappers.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/api/fetch-bm-base.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/api/fetch-bm-assets.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/api/fetch-bm-ad-accounts.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/api/fetch-bm-admins.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/api/fetch-bm-status.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/api/fetch-bm-create-limit.ts`
- Create: `apps/adaccounts/src/features/bm-data-loading/index.ts`
- Read/Reuse: `apps/adaccounts/src/api/fb-graph.ts`, `apps/adaccounts/src/api/types.ts`

## Implementation Steps
1. Define types:
   - `BmLoadSource = 'all' | 'byId'`
   - `BmAdvancedGroup = 'status' | 'page' | 'limit' | 'bmAccount' | 'partner' | 'admin' | 'instagram' | 'whatsapp' | 'share'`
   - `BmAdvancedOptions = Record<BmAdvancedGroup, boolean>`
   - `BmLoadConfig` with `source`, `ids`, `advEnabled`, `adv`, `concurrency`.
   - `BmRow` fields locked to bmmanager/contract UI names: `bmId`, `name`, `status`, `disabled`, `type`, `tier`, `role`, `notify`, `partnerCount`, `partnerDetail`, `createdDate`, `appealStatus`, `appealLabel`, `appealDaysLeft`, `pageCount`, `pageDetail`, `limit`, `currency`, `accountBm`, `accountBmDetail`, `accountShare`, `accountShareDetail`, `admin`, `adminDetail`, `adminViewerId`, `instagramCount`, `instagramDetail`, `whatsappCount`, `whatsappDetail`, `createLimit`, `loadingGroups`, `errorGroups`.
   - Do not introduce alternate app field names like `adminLabel` or `viewerBusinessUserId`; if external docs mention them, map to `admin` and `adminViewerId` at the boundary.
2. Implement `fetchBmBaseRows(config)`:
   - `all`: Graph `/me` with `businesses.limit(concurrency){...}` or `/me/businesses`; include `agencies` only per contract (`advEnabled=false` includes partner; `advEnabled=true` includes only if `adv.partner`).
   - `byId`: parse/dedup happens in composable; API fetches each `/{bm_id}` base with optional `agencies`.
   - Follow pagination where `paging.next` exists.
3. Implement asset wrapper for `page`, `instagram`, `whatsapp` following bmmanager `V_()`:
   - Build one `/{bm_id}?fields=...` request containing only enabled fields.
   - Page fields: `owned_pages.limit(100){id,name,picture,fan_count,verification_status}`, `client_pages.limit(100){id,name,picture,fan_count,verification_status}`.
   - Instagram fields: `owned_instagram_assets.limit(200){id,ig_username}`, `client_instagram_assets.limit(200){id,ig_username}`, `owned_instagram_accounts.limit(200){id,username,name,profile_pic,followed_by_count,follow_count,media_count}`; enrich asset rows by username from owned Instagram account map.
   - WhatsApp field: `whatsapp_business_accounts.limit(100){id,name,verified_name,phone_numbers,status}`.
   - Return JSON-string detail fields like bmmanager currently does, or typed arrays only if the table/composable consistently type them; do not mix shapes.
4. Implement ad-account wrapper for `bmAccount`, `share`, `limit` following bmmanager `Ax()`:
   - call `owned_ad_accounts` only when `bmAccount || limit`.
   - call `client_ad_accounts` only when `share`.
   - use list paging helper matching `Ho()` behavior: follow `paging.next` up to a safe cap; retry once after short delay when both owned/client arrays are empty and either endpoint was requested.
   - map `accountBm` / `accountShare` as `Total: X - Live: Y - Die: Z` where live=`account_status===1`, die=`account_status===2`.
   - map `limit` from max numeric `owned_ad_accounts[].adtrust_dsl`; if no owned accounts then empty string; if owned exists but no max then `No Limit`; map `currency` from the max row.
5. Implement `fetchBmCreateLimit` following bmmanager `Ox()` fallback order:
   - if `hasBUser` true: try `Fx()` first (`POST https://graph.facebook.com/v24.0/graphql`, `doc_id=32061067960207573`, parse `ad_account_creation_limit` from streamed/multiple JSON objects), then `Z_()`.
   - if `hasBUser` false: try `ew()` first (`business/adaccount/limits` HTML/text parser), then `Z_()`, then `Fx()`.
   - Return `null` on unavailable data; caller records group error only if needed. Never fail base rows.
6. Implement `fetchBmAdmins` following bmmanager `Fr()`:
   - Try `Dx()` with Graph API GraphQL `doc_id=9371006629693295` and access token.
   - Fallback to `Px()` business GraphQL `doc_id=24411698895145972` with `fb_dtsg`/`lsd`.
   - Parse with `Q_()` rules: `business_user_for_viewer.id`, `business_users_and_invitations.edges`, pending detection, `FACEBOOK`/`INSTAGRAM`/`PENDING`, role from `primary_access_details` (`basic` => `Basic`, otherwise `Admin`), active from `last_active_time` length.
   - Merge `X_()` `system_users` from `/{bm_id}?fields=system_users`, dedupe by id, append `{ type:'SYSTEM', role, active:'Active' }`, and update label `Admin total - FB: fb - IG: ig - Sys: sys`.
7. Implement `fetchBmStatus` following bmmanager `q_()` and `G_()`:
   - Restriction overview uses business GraphQL `doc_id=4941582179260904` with `fb_dtsg`, returns `viewer.ad_businesses.nodes[].advertising_restriction_info`.
   - Map status with `z_()` rules: `NOT_RESTRICTED` or not restricted => `live/Live`; `APPEAL_TIMEOUT` => `die_permanent/Die vĩnh viễn`; `VANILLA_RESTRICTED` => `die_3strike/Die 3 dòng`; `APPEAL_PENDING`/`UNDER_REVIEW` => `days_left/Đang xem xét`; else `unknown/raw`.
   - Apply overview patch to matching loaded BM rows first.
   - Enforcement detail runs only for loaded BM ids whose overview status is neither `live` nor `unknown`, concurrency fixed at `3`, using `BSHEnforcedEntityGAMEDetailsRootQuery` `doc_id=25166016149718566` and parser equivalent to `H_()` for appeal status/meta days left.
8. Export only public API/types from feature index.

## Success Criteria
- [ ] API wrappers compile in strict TS.
- [ ] No component/page calls `graph()` or `graphql()` directly for BM.
- [ ] Disabled groups have a code path that produces no API call.
- [ ] `limit` and `createLimit` are separate fields with separate source comments in code.
- [ ] API errors are represented as thrown/normalized errors, not fake successful values.

## Risk Assessment
- Risk: FB GraphQL response shapes drift. Mitigation: parse defensively and let group caller set error.
- Risk: `createLimit` requires tokens/session values not always available. Mitigation: best-effort with group error/unknown; never fail base rows.
- Risk: API field strings get huge. Mitigation: use small field builder functions per group, no abstraction beyond that.
