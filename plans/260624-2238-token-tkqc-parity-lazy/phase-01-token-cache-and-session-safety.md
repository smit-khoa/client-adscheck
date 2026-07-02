---
phase: 1
title: "Token cache and session safety"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Token Cache and Session Safety

## Overview

Make the existing token/data cache safe and useful before adding more token types. Persist `token_b` like `token_g`, bootstrap Facebook session metadata, and prevent TKQC/BM caches from leaking across Facebook accounts.

## Requirements

- Functional: `token_b` is read/written from extension storage key `adscheck_data` with the same 6h TTL pattern as `token_g`.
- Functional: session metadata includes at least `user_id`, `fb_dtsg`, `fb_dtsg_ag`, `lsd`, and optionally `user_name`.
- Functional: TKQC and BM row caches are scoped by current `user_id` or ignored/cleared on mismatch.
- Functional: existing `getToken()` consumers continue to work.
- Non-functional: no infinite retry; no raw fetch in components; no shared package changes.

## Architecture

Current `fb-token-cache.ts` already defines `token_b` and `token_g`, but only `token_g` is persisted. Extend cache helpers so token slots share a simple API:

```text
readCachedToken(slot, expectedUserId?)
writeCachedToken(slot, token, sessionMetadata)
expireCachedToken(slot)
```

Session metadata can be collected from the same HTML parse as `token_b` first. A dedicated `fb-session.ts` can be introduced if the implementation needs a login check before token fetch.

Row cache metadata should be additive:

```ts
interface UserScopedCache<T> {
  user_id?: string;
  saved_at: number;
  data: T;
}
```

Keep backward compatibility by accepting old raw array cache shape and rewriting in new shape after successful load.

## Related Code Files

- Modify: `apps/adaccounts/src/api/fb-token-cache.ts`
- Modify: `apps/adaccounts/src/api/fb-token.ts`
- Modify: `apps/adaccounts/src/features/adaccounts/composables/use-account-list.ts`
- Modify: `apps/adaccounts/src/features/businesses/composables/use-bm-data-loader.ts`
- Maybe create: `apps/adaccounts/src/api/fb-session.ts`
- Tests: `apps/adaccounts/src/api/__tests__/fb-token-cache.test.ts` or nearest existing test convention

## Implementation Steps

1. Inspect existing `fb-token-cache.ts`, `fb-token.ts`, `use-account-list.ts`, and `use-bm-data-loader.ts` before editing.
2. Add shared cache helpers for token slots without changing public behavior of `getBmToken()`.
3. Update `getToken()` to:
   - read fresh `token_b` from storage first;
   - validate `user_id` when available;
   - use in-memory cache second;
   - fetch adsmanager HTML only when cache is missing/stale;
   - write `token_b` + session metadata after successful parse.
4. Preserve bounded redirect-follow for adsmanager token fetch.
5. Add user-scoped TKQC row cache read/write. Old array cache remains readable only when current FB `user_id` is unknown; once `user_id` is known, unscoped legacy cache must be ignored to avoid showing another account's data.
6. Add user-scoped BM row cache read/write. Old cache remains readable only when current FB `user_id` is unknown; once `user_id` is known, unscoped legacy cache must be ignored to avoid showing another account's data.
7. On user mismatch, ignore cache and overwrite after successful explicit load. Do not blindly hydrate stale data. Prefer ignore-overwrite over blind delete unless helper already has safe delete path.
8. Add focused tests around fresh/stale token, user mismatch, and legacy cache shape.

## Success Criteria

- [ ] Reload within 6h uses cached `token_b` instead of scraping adsmanager again.
- [ ] `token_g` behavior remains unchanged.
- [ ] TKQC cache from another `user_id` is not shown.
- [ ] BM cache from another `user_id` is not shown.
- [ ] Old raw array cache does not crash hydration.
- [ ] No component imports raw token/cache helpers directly.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Cache migration breaks existing users | Read both old and new cache shapes |
| User ID unavailable before cache read | Fetch/session bootstrap first for user-scoped decisions; if unavailable, treat cache as untrusted for full-load and require explicit refresh/load before showing legacy unscoped rows |
| More extension storage calls slow startup | Keep helpers small; only run on load/ensureLoaded |
