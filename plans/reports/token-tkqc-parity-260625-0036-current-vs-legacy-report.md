---
type: brainstorm-report
slug: token-tkqc-parity-current-vs-legacy
date: 2026-06-25
repo: smit-adscheck-client
legacy_path: /Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-shared-dependency
status: analysis-only
---

# Token / TKQC / BM Parity — Current vs Legacy

## Summary

Current repo đã port đúng lõi quan trọng: 4 token active (`token_b`, `token_i`, `token_g`, `token_graphql`), extension storage `adscheck_data`, TTL token 6h, TKQC/BM data cache 30m, Graph/GraphQL qua SMIT Connect, batch 50, và legacy BM GraphQL doc_id cho type/quality.

Nhưng chưa parity 100%. Có vài điểm current tốt hơn legacy, và vài điểm cần cẩn thận:

- **Tốt hơn:** token policy rõ, inflight dedupe, retry auth 1 lần, queue tách lỗi, cache user-scoped hơn, BM advanced groups tách theo toggle.
- **Thiếu/sai tiềm ẩn:** `token_g` hiện lấy qua GraphQL `doc_id=6805088329501573` với `businessID` hardcoded; BM seed trong TKQC dùng `token_b` thay vì AUTO; không còn bước login-check `/me` để nuke toàn bộ `adscheck_data`; token cache JSON không AES như legacy; vài lỗi token GraphQL bị nuốt thành blank/per-group error.
- **Kết luận thẳng:** current sạch hơn legacy, nhưng rủi ro production lớn nhất là `token_g` và auth/cache invalidation. Nếu `token_g` chưa live verify nhiều account thì chưa nên xem là parity chắc.

## Codebase context found

- Current: Vue 3 + TypeScript + Rspack Module Federation monorepo, remote `apps/adaccounts`.
- Legacy: Vue 2 / single-spa shared dependency, JavaScript mixin `LoadInsightData.js`, class `Facebook.js` + `Adscheck.js`.
- Cả hai đều phụ thuộc SMIT Connect extension để proxy fetch Facebook; không gọi trực tiếp từ app browser.
- Relevant current docs: `.claude/features/adaccounts-account-list.md`, `.claude/features/adaccounts-bm-data-loading.md`, `.claude/features/adaccounts-bm-tab.md`.
- Scope: phân tích, không sửa code.

## Token model comparison

| Area | Legacy | Current | Verdict |
|---|---|---|---|
| Active token slots | `token_i`, `token_b`, `token_g`, `token_graphql` | Same 4 slots | Parity |
| `token_e` | Commented only, inactive | Not implemented | OK, không thiếu |
| Storage key | `adscheck_data` in extension storage | Same | Parity |
| Storage encoding | AES-obfuscated string | Plain JSON string | Behavior ok, security/compat khác |
| Token TTL | 6h per token | 6h per token | Parity |
| User scoping | cache valid if `user_id` match | supports expected user; some token reads omit expected user | Mostly parity, slight gaps |
| In-memory cache | instance props on `Facebook` | module-level cache + inflight Promise | Better |
| Fetch dedupe | none | inflight dedupe per token module | Better |
| Auth retry | weak / busy-wait in `graph()` | reset stale slot + retry once | Better |
| Login verification | Banzai + `/me`; nuke `adscheck_data` on mismatch | no equivalent full-cache nuke found | Missing parity |

## Token sources

### `token_b` / Power Editor

Legacy:
- `Facebook.js` maps `token_b` to type `B` / `power_editor_token`.
- Fetches `https://adsmanager.facebook.com/adsmanager/`.
- Regex `__accessToken = ...`.
- Follows `window.location.replace(...)` redirect.

Current:
- `apps/adaccounts/src/api/fb-token.ts` uses same URL and regex.
- Parses `fb_dtsg`, `fb_dtsg_ag`, `lsd`, `user_id` too.
- Follows one redirect and writes `token_b` through `writeCachedToken()`.

Verdict: **good parity, current better**.

### `token_i` / AUTO

Legacy:
- Fetches `AdsCanvasComposerDialog.react` bootloader URL.
- Regex `access_token`.
- Stores into `ads_manager_token`.

Current:
- `apps/adaccounts/src/api/fb-token-auto.ts` uses same bootloader URL.
- Preserves existing session metadata if bootloader response lacks it.
- Cached in `token_i` slot.

Verdict: **good parity, current better** because it avoids clearing `user_id/fb_dtsg/lsd` on lazy token write.

### `token_graphql` / legacy GraphQL token

Legacy:
- Fetches `ReactComposerStatusEagerAttachment.react` bootloader URL.
- Looks for `accessToken` with `EAAHULp` prefix.
- Used for BM type/status/quality legacy doc_ids.

Current:
- `apps/adaccounts/src/api/fb-token-graphql.ts` uses same URL.
- Parser accepts old `accessToken`, snake `access_token`, and generic fallback.
- Used by `fetch-bm-legacy.ts` with `tokenPurpose: 'legacyGraphql'`.

Verdict: **mostly better**, but generic fallback can catch wrong `access_token`. Recommend validate prefix/length instead of accepting any token.

### `token_g` / Business Manager token

Legacy active path:
- `onHandleGetParams(token_g)` calls `getTokenBm()` in the current legacy code path per scout, not the HTML type `G` branch, although `getFacebookToken({ type: 'G' })` still exists.
- `getFacebookToken({ type: 'G' })` can scrape `business.facebook.com/content_management` and detect 2FA, but active path uses GraphQL `doc_id=6805088329501573`.

Current:
- `apps/adaccounts/src/api/fb-bm-token.ts` calls GraphQL `doc_id=6805088329501573`.
- Variables include hardcoded `businessID: '1347771445924940'`.
- Stores `token_g` with 6h TTL via `updateStorageData()`.

Verdict: **behavior likely matches the active legacy code**, but still the biggest risk. The hardcoded businessID may be a Facebook internal constant, or may be account/session-specific. Needs live test across multiple FB accounts before trusting.

## Token policy in current

Current introduced `apps/adaccounts/src/api/fb-token-policy.ts`:

- `readGraph` default: `token_b`.
- `readGraph` with `readPreference: 'auto'`: try `token_i`, then endpoint-owned fallback to `token_g`/`token_b` if explicitly allowed.
- `powerEditorAction`: `token_b`.
- `businessManagerAction`: `token_g`.
- `legacyGraphql`: `token_graphql`.
- `sessionGraphql`: `token_b` session metadata (`fb_dtsg`, `lsd`).

This is a real improvement over legacy stringly-typed `token: 'AUTO'`, because each endpoint declares fallback. Trade-off: if a call forgets `AUTO_READ_POLICY`, it silently uses `token_b`.

## TKQC loading comparison

### Legacy flow

- `created()` loads `['AUTO', 'TOKEN_GRAPHQL']` first.
- `loadRoleAndId()` gets `/me/adaccounts` with `token: 'AUTO'` and fields `name,account_id,account_status,users`.
- For explicit ids, batch `GET /act_<id>?fields=...` with `token: 'AUTO'`.
- `loadAdaccountData()` batch enriches detail fields, chunk size 50.
- Cache uses feature-provided keys in extension storage and configurable `setting_cached_in` minutes.

### Current flow

- `use-account-list.ensureLoaded()` hydrates `v8_adaccount_cached` for same `user_id`, TTL 30m.
- `loadAdAccountsFlow()` gets uid via `getToken()` (`token_b`).
- Seed calls:
  - `/me/adaccounts` or `/<uid>/adaccounts` use `AUTO_READ_POLICY` (`token_i` then `token_b`).
  - `/me/businesses` discovery uses `AUTO_READ_POLICY`.
  - `/<bm_id>` owned/client account seed uses default `token_b`.
- Detail/payment batches use `AUTO_READ_POLICY`, batch 50, worker concurrency, auth-stale retry once.
- Hidden limit uses GraphQL `doc_id=6401661393282937` through session GraphQL.
- Check hold uses GraphQL `doc_id=6975887429148122`, depends on hidden-limit legacy account id when available.

### TKQC verdict

Current is **architecturally better** than legacy:

- Better isolation: seed/detail/payment/hidden-limit/check-hold fail separately.
- Better config: field groups are explicit.
- Better retry: stale batch token invalidates and retries once.
- Better cache: user-scoped persisted snapshot.

But parity gap:

- BM-owned seed fetch uses `token_b`, not AUTO. Legacy used `AUTO` broadly for `/me/businesses`/BM flows. This may be fine, but if FB rate/permission differs by token slot, current can miss accounts that legacy found.
- Current default cache TTL is fixed 30m; legacy data cache TTL depended on `localStorage.setting_cached_in`. If users expect configurable cache, this changed behavior.

## BM loading comparison

### Legacy flow

- `onLoadBmData()` loads `/me/businesses` with `token: 'AUTO'`.
- Runs `onGetBmType()`, `onGetBmQuality()`, `onGetBmStatus()` in parallel.
- Type uses GraphQL `doc_id=32061067960207573` with `TOKEN_GRAPHQL`.
- Quality/status uses GraphQL `doc_id=3920367411328805` with `TOKEN_GRAPHQL`.
- Cache saved to extension storage using consumer-provided keys.

### Current flow

- `use-bm-data-loader.ensureLoaded()` hydrates `v8_bm_rows_cached`, same user, TTL 30m.
- Base BM rows via `fetch-bm-base.ts`, default `token_b`.
- Advanced groups selected by toggles.
- Legacy type uses `doc_id=32061067960207573` with `legacyGraphql`.
- Legacy quality uses `doc_id=3920367411328805` with `legacyGraphql`.
- Current status uses newer restriction overview/enforcement doc_ids via session GraphQL.
- Group errors stay per group; base rows remain visible.

### BM verdict

Current is **more maintainable and UX-safer** than legacy because base rows are not dropped when advanced groups fail.

Parity gaps / behavior changes:

- Legacy BM base used `AUTO`; current base uses `token_b` by default.
- Legacy always ran type/quality/status after base. Current runs advanced groups only if toggled. Good UX, but parity depends on default config.
- Legacy quality/status doc_id `3920367411328805` is now only in optional legacy groups. Current status fields may differ from old visible status if legacy group is off.

## Cache comparison

| Cache | Legacy | Current | Notes |
|---|---|---|---|
| Token cache | `adscheck_data`, AES, 6h | `adscheck_data`, JSON, 6h | functional parity; encryption differs |
| TKQC data | consumer keys, TTL from `setting_cached_in` | `v8_adaccount_cached`, 30m | current more explicit/user-scoped, less configurable |
| BM data | consumer keys, TTL from `setting_cached_in` | `v8_bm_rows_cached`, 30m | same |
| Advanced BM session cache | none clear | `Map bm:{bmId}:{group}` | current better |
| Cache invalidation on login mismatch | nuke `adscheck_data` | not found | current missing parity |

## Improvements over legacy

1. **Token policy is explicit.** Endpoint owns fallback. Less accidental global behavior.
2. **No busy-wait recursion.** Legacy `graph()` can loop while token null; current resolves before call and retries once on auth error.
3. **Concurrent token calls deduped.** Avoids many extension fetches during batch/group fanout.
4. **Partial failure handling is better.** Payment/hidden/check-hold/BM advanced can fail without deleting base rows.
5. **Cache is more predictable.** Named v8 keys, user scoped, clear TTL.
6. **BM advanced groups are modular.** Easier to toggle, debug, and avoid unnecessary calls.
7. **Legacy GraphQL parser is more tolerant.** Handles old/current token response shapes.

## Risks / missing pieces

### High

1. **`token_g` hardcoded `businessID` needs live verification**
   - File: `apps/adaccounts/src/api/fb-bm-token.ts`.
   - Risk: works for dev account but fails for others.
   - Recommendation: test with 3-5 FB users/BMs. If fails, add fallback to scrape `business.facebook.com/content_management` like legacy `getFacebookToken({ type: 'G' })`.

2. **No current equivalent of legacy full login verification / cache nuke**
   - Legacy `checkLoginFacebook()` detects FB account switch and clears `adscheck_data`.
   - Current user-scoped reads reduce risk, but module-level in-memory token caches can still survive account switch until refresh/reset path.
   - Recommendation: add a lightweight session verification before first data load or on auth error cluster. Keep simple; do not over-engineer.

### Medium

3. **BM seed/base calls default to `token_b` instead of AUTO**
   - Files: `load-adaccounts-flow.ts`, `fetch-bm-base.ts`.
   - Risk: possible mismatch with legacy when token_i has access/rate behavior token_b lacks.
   - Recommendation: consider `AUTO_READ_POLICY` for read-only BM discovery/account seed endpoints, fallback to `token_b`.

4. **Generic `token_graphql` parser may accept wrong token**
   - File: `fb-token-graphql.ts`.
   - Recommendation: require `EAAHULp` prefix or minimum length/shape; otherwise fail fast.

5. **GraphQL queue errors can become blank cells**
   - Hidden-limit/check-hold and legacy BM groups isolate failure, which is good. But if failure is auth/session, user may not know they need re-login.
   - Recommendation: surface auth-expired as a group/table warning, not only blank values.

### Low / intentional

6. **Plain JSON token cache vs legacy AES**
   - Security posture changed, but both are extension-local. AES key in legacy is hardcoded, so protection was obfuscation, not strong security.
   - If compatibility with legacy extension data matters, JSON breaks read of old encrypted cache. If not, acceptable.

7. **Data cache TTL fixed 30m**
   - Simpler than legacy `setting_cached_in`, but behavior differs. Accept if product wants fixed cache.

## Recommended next steps

1. **Verify `token_g` live first.** This is the only scary unknown.
2. **Add/restore account-switch invalidation.** At minimum clear in-memory token caches when detected current FB `user_id` differs from stored/session user.
3. **Make BM read endpoints opt into AUTO where parity matters.** Especially BM-owned account seeds.
4. **Tighten `token_graphql` parser.** Avoid accepting random short-lived `access_token`.
5. **Improve auth error surfacing for GraphQL queues.** Blank cells are okay for data failure, not for expired login.

## Design options

### Option A — Minimal hardening

Do only: live verify `token_g`, tighten `token_graphql` parser, add clearer auth errors.

Pros:
- Smallest diff.
- Least regression risk.
- Keeps current architecture.

Cons:
- Does not fully restore legacy login-check behavior.
- AUTO asymmetry remains.

### Option B — Parity hardening recommended

Do: Option A + session/account-switch verification + AUTO policy for BM read-only seed/base endpoints.

Pros:
- Best balance between parity and clean architecture.
- Addresses real production risks.
- Still simple.

Cons:
- More touched files.
- Needs manual FB/extension test.

### Option C — Legacy-compatible behavior

Do: reintroduce broader legacy behavior: AES cache compatibility, full legacy token source fallback, more global AUTO fallback.

Pros:
- Closest to old behavior.
- Safer if old extension data migration matters.

Cons:
- More complexity.
- Brings back legacy ambiguity.
- Higher chance of over-engineering.

## Recommendation

Choose **Option B — parity hardening**.

Reason: current architecture is already better. Do not regress to legacy style. Fix the few risky parity gaps only: `token_g`, account-switch invalidation, AUTO on BM reads, stricter GraphQL token parsing, and clearer auth errors.

## Success criteria

- `token_b`, `token_i`, `token_graphql`, `token_g` resolve or fail with clear message.
- Switching FB account cannot reuse stale in-memory token or stale extension token for another user.
- TKQC `source=all`, `source=bmIds`, and BM tab base loading return same or better rows than legacy for same FB account.
- Legacy BM type/quality columns match old source when enabled.
- Expired session causes one refresh/retry, then visible auth error, not silent blank table.

## Unresolved questions

- Is `businessID: '1347771445924940'` universal across real users, or only works in certain sessions?
- Does product require reading old AES `adscheck_data`, or is fresh JSON cache acceptable?
- Should data cache TTL stay fixed 30m, or follow old `setting_cached_in`?
- Should BM base/seed read use AUTO everywhere, or only endpoints proven to need it?
