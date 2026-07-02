---
type: brainstorm-report
created: 2026-06-25
scope: current-vs-v6-token-tkqc-bm-cache
status: advisory
previous_report: plans/reports/token-tkqc-cache-parity-260624-2323-token-tkqc-cache-parity-report.md
---

# Current vs V6 Token/TKQC/BM/Cache Audit

## Summary

Đánh giá thật: bản hiện tại **không phải bản port 1:1 từ v6**. Nó là bản port + nâng cấp + ghép thêm contract từ bmmanager/report khác. Có phần tốt hơn rõ, nhưng cũng có vài điểm sai/thiếu có khả năng làm data lệch hoặc fail trên vài account Facebook.

Kết luận phân loại:

| Nhóm | Đánh giá |
| --- | --- |
| Token core | Có đủ slot chính, nhưng user/session guard chưa đều. |
| TKQC list | Kiến trúc mới tốt hơn v6, nhưng không còn `AUTO` semantics, batch thiếu auth retry. |
| TKQC fields | Nhiều hơn/đúng hơn một phần, nhưng không còn date range tổng tiêu của v6. |
| BM base/advanced | Nhiều cải tiến từ bmmanager contract, không phải v6 thuần. |
| BM legacy | Có lỗi parity rõ: variables/parser legacy type/quality/status lệch v6. |
| Cache row | Tốt hơn v6 vì user-scoped, TTL cố định 30m. Nhưng user resolution phụ thuộc `token_b`. |
| Tool actions | Nhiều action mới tốt hơn v6; token purpose còn chỗ chưa dùng `BUSINESS_MANAGER` đúng nghĩa. |

Ưu tiên nếu fix: **BM legacy + token_graphql + batch retry + token AUTO fallback có kiểm soát**. Không nên refactor token manager lớn ngay.

## Codebase context found

- Project: Vue 3.5 + TypeScript 5.6 + Pinia + Module Federation 2.0, app liên quan là `apps/adaccounts`.
- Current relevant files:
  - `apps/adaccounts/src/api/fb-token*.ts`, `fb-graph.ts`, `fb-bm-token.ts`, `smit-connect.ts`.
  - `apps/adaccounts/src/features/adaccounts/api/*`, `use-account-list.ts`.
  - `apps/adaccounts/src/features/businesses/api/*`, `use-bm-data-loader.ts`.
  - `apps/adaccounts/src/features/page/api/page-fetch.ts` also touches token/BM token.
  - `apps/adaccounts/src/api/tools/**` for TKQC/BM tool actions.
- Legacy v6 relevant files:
  - `src/js/Facebook.js` for token/cache/Graph wrappers.
  - `src/js/Adscheck.js` for startup login/session verify.
  - `src/vue/mixins/LoadInsightData.js` for TKQC/BM list/cache/date range.
- Existing report `plans/reports/bm-data-loading-contract-260617-1544-gpt-bm-flow-report.md` shows current BM implementation intentionally follows newer bmmanager contract for some groups, not only v6.

## Exact requirement captured

- Expected output: advisory report comparing current vs legacy v6, including improvements, missing/s wrong points, honest risk assessment.
- Acceptance: findings are backed by file evidence and ranked by impact.
- Scope boundary: no code change, no live FB/extension test.
- Constraints: keep KISS/YAGNI; any future fix must update feature docs and run adaccounts typecheck/build.
- Touchpoints: token helpers, Graph wrappers, TKQC list/batch/cache, BM base/advanced/legacy, Page/token touchpoints, tool runners.

## High-confidence findings

### F1 — High — `token_graphql` parser is likely incomplete

Current:

- `apps/adaccounts/src/api/fb-token-graphql.ts` parses `"access_token"` or lowercase `access_token` style.

V6:

- `src/js/Facebook.js:getTokenUseGraphQL()` searches `"accessToken":"EAAHULp..."` camelCase.

Why this matters:

- Current BM legacy type/quality uses `tokenPurpose: 'legacyGraphql'`.
- If FB endpoint still returns camelCase `accessToken`, current `token_graphql` fetch can fail.

Verdict: **Sai/thiếu so với v6.** Easy, high-value fix.

### F2 — High — BM legacy type/quality/status variables and parser are wrong for v6 parity

Current:

- `fetch-bm-legacy.ts`:
  - Type `doc_id=32061067960207573`, variables `{ businessID }`, parse generic keys: `business_type`, `businessType`, `type`, `tier`.
  - Quality `doc_id=3920367411328805`, variables `{ businessID }`, parse generic keys: `quality`, `status`, etc.

V6:

- `LoadInsightData.js:onGetBmType()`:
  - `doc_id=32061067960207573`
  - variables `{ businessID: item.account_id, overridePrimaryBusinessLocationEligibility:false }`
  - parse newline chunks and read `ad_account_creation_limit`
  - output `bm_type = BM ${ad_account_creation_limit}`.
- `onGetBmStatus()` / `onGetBmQuality()`:
  - `doc_id=3920367411328805`
  - variables `{ entity_id: item.id, action:null }`
  - parse `data.data.isRestricted` or `data.isRestricted`.

Why this matters:

- Current can return blank/wrong legacy type and quality.
- The current code is not just “different style”; it is likely wrong input shape for that doc_id.

Verdict: **Sai rõ so với v6.** Fix before trusting BM legacy columns.

### F3 — High/Medium — Current removed v6 `AUTO` token semantics from core list flows

Current:

- `fb-graph.ts` default `readGraph` returns `token_b`.
- `adaccount-batch.ts` directly calls `getToken()` => `token_b`.
- BM base/assets/ad accounts use `graph()` default => `token_b`.

V6:

- `Facebook.graph(token:'AUTO')` uses `ads_manager_token || power_editor_token || business_manager_token`.
- `LoadInsightData.js` uses `token:'AUTO'` for TKQC list, TKQC batch, BM base.
- Startup calls `getMultiAccessTokenUsed(['AUTO','TOKEN_GRAPHQL'])`, meaning token_i + token_graphql are intentionally preloaded.

Why this matters:

- Some VIA/account patterns may only work with `token_i` or fallback behavior.
- Current `readPreference:'auto'` exists but is barely used in app flows.

Verdict: **Not parity.** Could be okay if Sếp accepts token_b-first behavior, but risky for broad FB account compatibility.

### F4 — Medium/High — TKQC batch bypasses auth retry

Current:

- `fb-graph.ts` can reset token and retry once on auth error.
- `adaccount-batch.ts` posts raw batch with `getToken()` and `extFetch`; batch item OAuth errors become row errors.

V6:

- No clean retry either; it also had a weak recursive wait if token property missing.
- But current code has a better centralized retry path and does not use it here.

Why this matters:

- Stale token in storage creates many false row/payment errors.
- This is a regression relative to current architecture, even if not strictly v6 parity.

Verdict: **Thiếu trong bản mới.** Fix small: detect auth codes in batch body, reset token, retry once.

### F5 — Medium — `token_i` / `token_graphql` cache lacks session metadata

Current:

- `getAutoToken()` writes only `token_i`.
- `getLegacyGraphqlToken()` writes only `token_graphql`.
- `readCachedToken(slot, expectedUserId?)` only checks user if caller supplies expected user or stored user exists.

V6:

- All token fetches flow through `onHandleGetParams()` and merge `user_id`, `user_name`, `lsd`, `fb_dtsg`, `fb_dtsg_ag` into storage.
- Startup first calls `checkLoginFacebook()` to update metadata.

Why this matters:

- Token cache can be valid by TTL but not definitely bound to current FB user.
- Latent risk increases if current code starts using `readPreference:'auto'` more.

Verdict: **Thiếu guard.** Before broad AUTO fallback, fix metadata/session bootstrap.

### F6 — Medium — Current cache is better, but user detection depends on `token_b`

Current:

- TKQC cache `v8_adaccount_cached`: `{ user_id, saved_at, data }` TTL 30m.
- BM cache `v8_bm_rows_cached`: `{ user_id, saved_at, data }` TTL 30m.
- `getCurrentUserId()` uses `getToken()` => `token_b`.

V6:

- Row cache uses `adaccount_cached`, `bm_cached`, TTL from `localStorage.setting_cached_in`.
- No user-scope in row cache.

Improvement:

- Current row cache is safer than v6 for switching FB accounts.

Remaining problem:

- If `token_b` cannot parse but user is logged in and `token_i` works, cache user check becomes unknown.
- Current code trusts legacy raw-array cache only when user cannot resolve. New v8 object with user_id mismatch is only rejected if currentUserId exists; if currentUserId undefined, it returns data. That can show stale rows after token parse failure.

Verdict: **Mostly improved, but still edge-case stale risk.** Better session bootstrap would solve.

### F7 — Medium — TKQC total spend date range from v6 is missing

V6:

- `updateAdDateRange()` updates `tong_tieu` via batch `insights.date_preset(lifetime)` or `insights.time_range({since,until})`.
- UI had date range stored in `localStorage.adaccount_total_spend_range_start/end`.

Current:

- `SPEND_INSIGHTS_FIELDS` is fixed `insights.date_preset(maximum){spend}`.
- Load config has no date range.

Why this matters:

- If product needs custom date range spend, current TKQC is missing v6 behavior.
- If current product only needs lifetime/max spend, this is intentionally out of scope.

Verdict: **Missing v6 feature**, not necessarily bug. Needs product decision.

### F8 — Medium — BM advanced data intentionally drops detail/debug payloads

Current:

- Feature docs say detail/debug payloads such as `pageDetail`, `instagramDetail`, `accountShareDetail`, `adminDetail`, `adminViewerId` are intentionally not stored/displayed.
- `fetchBmAdmins()` computes label only: `Admin X - FB:Y - IG:Z - Sys:Z`; it does not store detail.
- `mapAssetPatch()` stores counts/summaries, not detail arrays.

BM contract report:

- Admin MVP originally wanted full detail (`adminDetail`, `adminViewerId`), but later feature docs/product decisions removed detail/debug payloads.

Why this matters:

- Compared with richer bmmanager contract, current is reduced.
- Compared with v6, v6 BM sample only had simple fields (`admin_count`, `bm_type`, `bm_quality`), so this is not v6 regression.

Verdict: **Product scope cut, not code bug** if Sếp intentionally wants source-facing summary only. If Sếp wants bmmanager parity, this is missing.

### F9 — Medium — Business Manager token `businessID` constant still unproven

Current and v6 both use:

- `doc_id=6805088329501573`
- `businessID=1347771445924940`

Current docs already note:

- “still needs live confirmation that it is universal rather than account-specific.”

Why this matters:

- Because current BM action flows rely more heavily on token_g and newer BM tools.
- If constant is not universal, failures will look random by FB account.

Verdict: **Inherited risk, not newly introduced.** Needs live test, not speculation.

### F10 — Medium — Some BM tool actions probably use default token_b where v6 used BUSINESS_MANAGER

Examples:

- `api/tools/bm/cancel-pending-invites.ts` uses `graph()` default for `/{bmId}/pending_users` and delete request.
- `api/tools/bm/bm-admins.ts:listBmAdmins()` has comment: “test-live: whether a BUSINESS_MANAGER-scoped token is required.” It uses default `graph()`.

V6 examples:

- `onRemoveAdaccountInBM()` uses `token:'BUSINESS_MANAGER'`.
- `onRemoveBmAccount()` uses `token:'BUSINESS_MANAGER'`.

Why this matters:

- Some BM endpoints require token_g. Default token_b may fail/return partial data.
- Current code itself leaves `test-live` comments.

Verdict: **Potential bug.** Not all BM tools are proven live. Prioritize only tools Sếp needs now.

### F11 — Low/Medium — `parseTokens()` for token_b stricter than v6

Current:

- Requires `access_token`, `fb_dtsg`, `lsd`, `user_id`.

V6:

- Fails only if missing `fb_dtsg` or `access_token`; `user_id`, `lsd`, `name` can be null-ish.

Why this matters:

- If FB markup changes and user id is not in Ads Manager page, current token_b fails even if token works.

Verdict: **Maybe too strict.** Safer fix: if user_id missing, call `/me` with token to resolve; do not blindly accept unknown user.

### F12 — Low — v6 `need_2fa` UX not ported

V6:

- `getFacebookToken({type:'G'})` could detect `/security/twofactor/reauth/` and set `need_2fa`.

Current:

- token_g path throws generic error.

Why this matters:

- UX less specific when FB asks reauth/2FA.

Verdict: **Low priority.** Only fix if live errors show 2FA is common.

## Improvements in current version

### I1 — Better code boundaries

Current splits:

- token cache: `fb-token-cache.ts`
- token slots: `fb-token.ts`, `fb-token-auto.ts`, `fb-token-graphql.ts`, `fb-bm-token.ts`
- token policy: `fb-token-policy.ts`
- Graph wrapper: `fb-graph.ts`
- feature APIs by domain.

V6 had a large `Facebook.js` + monolithic `LoadInsightData.js`.

Verdict: **Clear improvement.** Easier to test, reason, and fix surgically.

### I2 — Better TKQC loading architecture

Current:

- seed loading separated from detail/payment.
- payment queue failure does not kill basic/detail rows.
- hidden limit/check-hold isolated.
- concurrency bounded.

V6:

- many operations batched inside mixin; errors often toast/log and continue unpredictably.

Verdict: **Real improvement.** Keep this design; do not revert to monolith.

### I3 — Better row cache safety

Current caches include user_id and TTL independent of localStorage setting.

V6 caches row arrays without user ownership.

Verdict: **Improvement.** Needs stronger session bootstrap but direction is correct.

### I4 — Better BM base + advanced group isolation

Current:

- base-first row rendering.
- group-level loading/error state.
- session cache by `bm:{bmId}:{group}`.
- disabled groups do not call API.

V6:

- BM load ran base then type/quality/status together, less granular.

Verdict: **Improvement.** This is better UX and safer failure behavior.

### I5 — Better truthfulness in some tools

Example `open-close-account.ts` treats “no marker and no error” as failure instead of optimistic success.

Verdict: **Good.** Keep truthful outcomes.

## Design options

### Option A — Fix proven parity defects only (Recommended)

Do only these:

1. Fix `token_graphql` parser for `accessToken` camelCase / `EAAHULp`.
2. Fix `fetch-bm-legacy.ts` variables/parser to match v6.
3. Add one-shot auth retry to `adaccount-batch.ts`.
4. Add session metadata/user guard for `token_i` and `token_graphql` writes.

Ưu:

- Small diff.
- Fixes high-confidence wrong parts.
- Low risk of breaking current improvements.

Nhược:

- Does not fully restore v6 `AUTO` behavior for all list calls.
- Does not address custom date range spend.

### Option B — Restore AUTO semantics for read/list flows

After Option A, use token policy for TKQC/BM read operations:

- Try current `token_b` or `token_i` depending chosen policy.
- On auth/permission token failure, fallback once.
- Avoid using token_g except endpoints known to require BM token.

Ưu:

- Better compatibility with various VIA/account types.
- Closer to v6.

Nhược:

- Broader behavior change.
- Must fix user guard first or risk cross-user token cache.
- More manual live testing required.

### Option C — Full token/session manager rewrite

Build one token manager that:

- bootstraps session from Banzai/checkLogin equivalent.
- owns all token slots.
- enforces current FB user for every slot.
- invalidates data cache on user switch.
- exposes purpose-based token APIs.

Ưu:

- Clean long-term.
- Removes scattered token assumptions.

Nhược:

- Over-engineered for now.
- High regression risk.
- Needs live FB matrix to justify.

## Recommendation

Em khuyến nghị **Option A**.

Lý do thẳng: bản hiện tại có kiến trúc tốt hơn v6, không nên kéo ngược về v6. Nhưng có vài lỗi parity rất rõ và nhỏ. Sửa mấy lỗi rõ trước, live test, rồi mới quyết định có cần AUTO fallback rộng hay không.

Nếu Sếp muốn “bản mới phải chạy được nhiều VIA như bản cũ”, sau Option A hãy làm Option B. Nếu chỉ cần luồng ổn định cho account chính, Option A đủ thực dụng hơn.

## Priority list

| Priority | Item | Why |
| --- | --- | --- |
| P0 | Fix `token_graphql` parser | Legacy BM currently depends on it. Small/high impact. |
| P0 | Fix BM legacy variables/parser | Current likely wrong output. |
| P1 | Batch OAuth retry | Avoid false row errors from stale token. |
| P1 | Token_i/token_graphql session metadata | Prereq before AUTO fallback. |
| P2 | Decide custom date range spend | Product decision. |
| P2 | Token purpose audit for BM tools | Only for tools Sếp actively uses. |
| P3 | 2FA/reauth UX | Nice-to-have after live evidence. |

## Validation criteria for future fix

Static:

- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features` after doc update.

Manual with extension + FB login:

- Clear `adscheck_data`; load TKQC default.
- Force stale `token_b`; ensure batch retries once and rows do not all become OAuth errors.
- Load BM with `legacyType=true`, `legacyQuality=true`; compare same BM against v6 output.
- Switch FB account; ensure TKQC/BM cache does not show previous account data.
- Test at least one BM tool known to require BM token.

## Unresolved questions

- Is target parity **v6 shared-dependency** or **newer bmmanager contract**? Some current BM choices intentionally follow newer contract/report, not v6.
- Does Sếp need custom date range total spend from v6 now?
- Which BM tools are production-critical first? Token purpose audit should start there, not across all tools.
- Is `businessID=1347771445924940` confirmed universal from real production sessions?
