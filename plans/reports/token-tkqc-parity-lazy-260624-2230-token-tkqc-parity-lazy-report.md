---
type: brainstorm-report
topic: token-tkqc-parity-lazy
status: proposed
created: 2026-06-24
repo: /Volumes/Workspace/smit/worktree/client/feat-system-starter
old_reference: /Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-shared-dependency
---

# Token/TKQC Parity Lazy — Brainstorm Report

## Summary

Sếp muốn bản mới có thể tải gần như toàn bộ thông tin TKQC trong một lần tải, nên token layer phải mạnh hơn hiện tại. Kết luận: chọn hướng **Parity lazy**.

Ý nghĩa: port đủ các capability token/lifecycle đã chứng minh ở bản cũ, nhưng không copy nguyên kiến trúc cũ. Bản mới giữ pipeline hiện đại: seed → detail → payment → hidden limit → check hold → mapping/cache. Token resolver mới sẽ cấp đúng token theo từng API, lấy token theo nhu cầu, cache 6h, fallback có kiểm soát.

## Problem Statement

Bản mới hiện đọc TKQC/BM tốt hơn về kiến trúc data flow, nhưng token layer chưa đủ sức cho mục tiêu “load full TKQC info once”. Bản cũ vẫn chạy tốt vì có đủ token family và nhiều fallback nhỏ:

- token_i / AUTO
- token_b / POWER_EDITOR
- token_g / BUSINESS_MANAGER
- token_graphql / TOKEN_GRAPHQL
- fb_dtsg, fb_dtsg_ag, lsd, user_id, user_name
- check login Facebook trước khi lấy token
- cache token 6h trong extension storage
- follow redirect khi lấy token_b
- cascade clear data cache khi token invalid
- phân biệt token đọc data và token write/action

Bản mới đang thiếu vài phần trong số đó, nhất là cache/policy/fallback của token family.

## Current Strengths To Keep From New Version

| Area | Điểm mạnh bản mới | Giữ lại |
|---|---|---|
| TKQC flow | `loadAdAccountsFlow` tách seed/detail/payment/hidden-limit/check-hold | Có |
| Error isolation | Payment/hidden/check-hold lỗi không làm mất row chính | Có |
| Batch retry | Batch có retry/backoff, consecutive error guard | Có |
| Source modes | `all`, `tkqcIds`, `bmIds`, personal, BM, hasRole | Có |
| Cache row | `v8_adaccount_cached`, `v8_bm_rows_cached` rõ ràng | Có |
| BM loader | Base-first + advanced group toggles + group cache | Có |
| Module structure | API/composable/types tách lớp, dễ maintain | Có |

Không nên quay lại mixin cũ hoặc copy nguyên `Facebook.js`/`LoadInsightData.js` vì sẽ làm bản mới mất lợi thế modular.

## Proven Strengths To Bring From Old Version

| Old capability | Vì sao cần port | Cách port trong bản mới |
|---|---|---|
| `token_i` / AUTO | Token đọc data Graph chính trong bản cũ | Thêm resolver lazy, dùng cho read endpoints khi policy yêu cầu |
| `token_b` / POWER_EDITOR | Token adsmanager ổn cho action và hiện bản mới đang dùng như token chính | Giữ `fb-token.ts`, thêm persistent cache 6h |
| `token_g` / BUSINESS_MANAGER | Cần cho một số BM/Page/action flows | Giữ `fb-bm-token.ts`, validate hard-coded businessID |
| `token_graphql` | Một số GraphQL legacy dùng token riêng | Thêm optional resolver, chỉ dùng khi endpoint cần |
| `fb_dtsg`/`lsd`/`user_id` | Internal GraphQL/form POST cần | Chuẩn hóa thành shared token bundle metadata |
| Check login Banzai | Báo lỗi FB login rõ, có metadata trước token | Thêm `checkFacebookSession()` trước load lớn |
| Redirect follow token_b | Bản cũ xử lý adsmanager redirect tốt | Giữ/chuẩn hóa follow redirect có giới hạn |
| Token storage 6h | Giảm scrape HTML, tăng ổn định | Dùng `adscheck_data` cho mọi token family |
| Cascade cache clear | Tránh stale data khi đổi user/token invalid | Scope row cache theo `user_id` hoặc clear khi đổi user |

## Recommended Architecture — Parity Lazy

### 1. Token family model

Tạo một token layer thống nhất, ví dụ dưới `apps/adaccounts/src/api/`:

```text
fb-token-cache.ts        existing, extend schema
fb-token.ts              token_b resolver, keep compatibility
fb-token-family.ts       new orchestration/policy layer
fb-session.ts            optional check login / session metadata
fb-bm-token.ts           existing token_g resolver, keep
```

Không nhất thiết phải tạo đủ file y như trên khi implement; đây là boundary logic. Mục tiêu là không để `load-adaccounts-flow.ts` phải biết cách scrape từng token.

### 2. Token types

| Internal key | Legacy mapping | Source | Cache | Lazy? |
|---|---|---|---|---|
| `token_i` | AUTO / ads_manager_token | bootloader AdsCanvasComposerDialog | 6h storage + memory | Yes |
| `token_b` | POWER_EDITOR / power_editor_token | adsmanager page | 6h storage + memory | Yes |
| `token_g` | BUSINESS_MANAGER / business_manager_token | GraphQL `6805088329501573` or business page fallback | 6h storage + memory | Yes |
| `token_graphql` | TOKEN_GRAPHQL | bootloader ReactComposerStatusEagerAttachment | 6h storage + memory | Yes |
| `session` | fb_dtsg/lsd/user_id | bootloader Banzai or token page | storage metadata | Yes |

### 3. Lazy resolution rule

Không lấy tất cả token khi user bấm tải. Thay vào đó:

1. Load session metadata first if missing/stale.
2. Resolve seed TKQC with token policy.
3. Each advanced group requests required token.
4. Token resolver dedup concurrent requests with `inflight` promises.
5. If token auth error: reset only that token → retry limited once → fail group, not full load, unless seed fails.

### 4. Token-to-API policy

| API group | Primary token | Fallback | Notes |
|---|---|---|---|
| `/me/adaccounts` seed | `token_i` | `token_b`, then `token_g` if proven valid | Match old AUTO behavior, but bounded |
| `/act_<id>` detail batch | `token_i` | `token_b` | Read detail |
| payment batch | `token_i` or `token_b` | none/limited | Isolated failure |
| hidden limit GraphQL | session `fb_dtsg` + `lsd` | `token_graphql` only if old endpoint requires | Current new flow may keep existing |
| check hold GraphQL | session `fb_dtsg` + `lsd` | none/limited | Current new flow works this way |
| BM list | `token_i` | `token_b` | Similar old AUTO read |
| BM type/status legacy | `token_graphql` | session GraphQL if endpoint supports | Optional legacy group |
| TKQC rename/share | `token_b` | none | Old POWER_EDITOR |
| remove TKQC from BM/BM account | `token_g` | none | Old BUSINESS_MANAGER |
| Page detail batch | `token_g` | none | Current new behavior |

Policy should be explicit in code comments/docs. No hidden fallback chain inside random API wrapper.

## Load Full TKQC Once — Proposed Flow

```text
User clicks load
  ↓
checkFacebookSession() lazy
  - user_id, fb_dtsg, fb_dtsg_ag, lsd, user_name
  - if not logged in: stop with clear error
  ↓
ensure row cache validity
  - if cache user_id != current user_id: clear/scope cache
  ↓
resolve seeds
  - all / tkqcIds / bmIds / personal / bm / hasRole
  - use token policy for seed APIs
  ↓
run data groups with bounded concurrency
  - detail group
  - payment group
  - hidden limit group
  - check hold group
  - optional legacy BM owner/type/admin groups later
  ↓
merge patches by account_id
  ↓
write cache with user_id + config + timestamp
  ↓
render table even if some groups failed
```

## Missing Details To Add

### P0 — Must add for parity foundation

1. Persist `token_b` in `adscheck_data`
   - Existing schema has `token_b`, but current code does not write it.
   - Mirror `token_g` TTL pattern.
   - Store `access_token`, `date`, and session metadata if available.

2. Add user-scoped cache validation
   - Row cache should include `user_id`.
   - If current FB user differs, ignore/clear old cache.
   - Prevent stale TKQC/BM data after switching FB account.

3. Add token policy layer
   - API wrappers request token by semantic purpose: readGraph, powerEditorAction, businessManagerAction, legacyGraphql.
   - Avoid each file manually deciding token source.

4. Add bounded fallback/retry
   - No infinite retry.
   - Retry auth error once after reset.
   - Fallback token only if policy allows.

### P1 — Should add for stronger full-load UX

5. Add check login/session bootstrap
   - Use old Banzai-like source to get `user_id`, `fb_dtsg`, `lsd` without requiring access token.
   - Better error when not logged in Facebook.

6. Add `token_i` lazy resolver
   - Keep as primary for read Graph API if validated.
   - Helps match old AUTO behavior.

7. Add cascade clear helper
   - Clear adaccount/BM/Page caches when token belongs to new user or known invalid state.
   - Prefer user-scoped cache over blind delete where possible.

8. Validate `businessID=1347771445924940`
   - Confirm if this is SMIT stable BM.
   - If not stable, make it a documented constant or config from extension/backend.

### P2 — Add only when needed by legacy APIs

9. Add `token_graphql` resolver
   - Needed if porting old BM type/status/quality GraphQL endpoints.
   - Keep optional because regex prefix `EAAHULp` is brittle.

10. Add legacy BM/TKQC enrichment groups
   - BM type `doc_id=32061067960207573`
   - BM status/quality `doc_id=3920367411328805`
   - Only add as advanced groups, not mandatory core load.

## What Not To Copy From Old Version

| Old behavior | Decision | Reason |
|---|---|---|
| Infinite retry when token null | Do not copy | Can hang app forever |
| Large Vue mixin flow | Do not copy | Hard to test/maintain |
| Hidden dynamic app contracts like `handleAdaccountData` | Do not copy | New mapper pipeline is clearer |
| Always fetching multiple tokens upfront | Do not copy | Slow and rate-limit prone |
| Silent regex failure | Do not copy | Return typed token errors |

## Implementation Approach Options

### Option A — Parity lazy foundation first (Recommended)

Build token layer foundation first, then migrate API calls to use policy.

Pros:
- Best long-term fit.
- Keeps new architecture clean.
- Enables full TKQC load without random token hacks.
- Reduces future debugging cost.

Cons:
- More upfront design than a quick patch.
- Needs careful tests/mocks around token cache and fallback.

### Option B — Patch token_b + cache only

Add persistent token_b and user-scoped cache, leave token_i/token_graphql for later.

Pros:
- Fastest useful improvement.
- Low risk.

Cons:
- Not enough for full parity.
- Later may require refactor again.

### Option C — Port old token module nearly directly

Copy the old capability into a compatibility module.

Pros:
- Fast parity surface.
- Easy to compare with old behavior.

Cons:
- Brings old technical debt.
- Harder to fit current feature APIs.
- Risk of hidden retries/silent failures.

Recommendation: **Option A**.

## Suggested Phases

### Phase 1 — Token cache + session safety

- Extend `fb-token-cache.ts` to support all token slots cleanly.
- Make `fb-token.ts` read/write `token_b` with 6h TTL.
- Add `user_id` to TKQC/BM row cache metadata.
- Clear/ignore cache when `user_id` mismatch.
- Keep existing Graph behavior unchanged except cache source.

Validation:
- Unit test cache fresh/stale/user mismatch.
- Manual: reload page within 6h should not scrape token_b again unless reset.

### Phase 2 — Token policy resolver

- Add central resolver/policy.
- Add `inflight` dedup for token fetches.
- Add bounded retry/fallback rules.
- Migrate Graph API wrappers to request semantic token purpose.

Validation:
- Mock auth error → reset token → retry once.
- Mock primary fail → allowed fallback used.
- Mock unsupported fallback → group fails gracefully.

### Phase 3 — Add token_i + session bootstrap

- Port bootloader token_i resolver.
- Add session check using Banzai-like endpoint.
- Use token_i as primary read token if validated.

Validation:
- Not logged in FB → clear error before data load.
- Logged in → session metadata stored.
- Different FB user → row cache ignored/cleared.

### Phase 4 — Optional token_graphql + legacy enrichment groups

- Add token_graphql resolver only if needed by specific legacy endpoints.
- Add legacy BM type/status/quality as advanced groups, not blocking base load.

Validation:
- GraphQL legacy fail should not drop TKQC rows.
- Group errors appear isolated.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Facebook internal HTML/GraphQL changes | Token parse fails | Typed errors + fallback + manual refresh |
| Wrong cached token after FB account switch | Data leak/stale rows | Store `user_id` with token and row cache |
| Too many token fetches in full load | Rate limit/throttle | Lazy resolver + inflight dedup + 6h cache |
| Overcomplicated fallback | Hard debug | Explicit token policy table |
| Hard-coded BM ID invalid | token_g fails | Confirm/configure/document BM ID |

## Success Metrics

- Reload within 6h reuses valid `token_b` from extension storage.
- Switching FB user does not show previous user's TKQC/BM cache.
- Full TKQC load can run seed/detail/payment/hidden/check-hold in one action with isolated group failures.
- Token auth error retries once and surfaces clear error if still failing.
- Future tool actions can request correct token by policy, not by copy-paste.

## Acceptance Criteria

1. `token_b` and `token_g` both persist in `adscheck_data` with TTL 6h.
2. TKQC/BM row cache is scoped to `user_id` or cleared on user mismatch.
3. Token resolver has explicit mapping for read Graph, power editor action, business manager action, legacy GraphQL.
4. No infinite retry exists.
5. Existing TKQC/BM load behavior remains compatible.
6. Advanced group failure does not remove base rows.
7. Feature docs updated after implementation.

## Unresolved Questions

1. Is `businessID=1347771445924940` guaranteed stable for production, or should it become configurable?
2. Which exact “full TKQC once” columns are mandatory in first implementation: current 26 columns only, or also legacy BM type/status/quality/spend insights?
3. Should legacy `token_graphql` be implemented in Phase 4 only when a specific endpoint requires it, or included earlier for completeness?
4. Should stale token/data cache be cleared immediately on user mismatch, or ignored and overwritten after successful new load?
