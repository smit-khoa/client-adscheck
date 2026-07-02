---
phase: 2
title: "Auth Response Normalization"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Auth Response Normalization

## Overview

Add lightweight auth hydration to `useAuthStore` so startup can store the current user without running business/role/onboarding flow.

## Requirements

- Functional: support screenshot response `{ isLogin, user, last_visit }`.
- Functional: support legacy response `{ user }` to preserve current test/contract behavior.
- Functional: treat `isLogin: true` with missing/null `user` as unauthenticated.
- Functional: set shared state (`user`, `is_authenticated`, `auth_checked`, `is_loading`, optional `last_visit`) from normalized response.
- Functional: guard duplicate startup hydration calls with a module-level promise.
- Non-functional: do not call `/gate/me/businesses`, roles, onboarding, or redirect.

## Architecture

Add an auth response type and a small normalization boundary in `auth-store.ts`.

Recommended store additions:

- `auth_checked = ref(false)` — remotes can distinguish "not checked yet" from "checked and no user".
- `last_visit = ref<string | null>(null)` — keeps response metadata if needed.
- `hydrate_promise: Promise<void> | null` — mirrors the existing `initialize_promise` pattern for startup hydrate dedupe.
- `hydrateUser()` — lightweight startup action.

Normalization rule:

- If `isLogin === false`: unauthenticated, clear `user`.
- If `isLogin === true` and `user` exists: authenticated.
- If `isLogin === true` and `user` is missing/null: unauthenticated.
- If `isLogin` missing and `user` exists: authenticated (legacy shape).
- If `isLogin` missing and `user` missing/null: unauthenticated.
- Non-transient errors: unauthenticated + checked.
- Transient errors: complete without redirect; set `auth_checked=true`, `is_loading=false`, and leave a retry/error signal if using existing `auth_error`.

`hydrateUser()` should use the Phase 1 no-redirect path for `/public/authentication`. Normal API calls keep the centralized 401 logout behavior.

## Related Code Files

- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-store/src/auth-store.ts`
- Modify: `packages/shared-store/src/__tests__/auth-store.test.ts`
- Possibly modify: `packages/shared-store/src/index.ts` if new types/helpers are exported there

## Implementation Steps

1. Extend `User` additively with optional fields seen in real response only where useful.
2. Add `AuthenticationResponse` interface if it improves clarity.
3. Add `auth_checked`, `last_visit`, and `hydrate_promise` to `useAuthStore`.
4. Add `hydrateUser()` action that calls `/public/authentication` only and uses the Phase 1 no-redirect path.
5. Ensure `hydrateUser()` sets `auth_checked=true` and `is_loading=false` in `finally`.
6. Ensure `hydrateUser()` is deduped for concurrent calls and clears `hydrate_promise` after retryable/transient failures if retry should be allowed.
7. Update `checkAuth()` to reuse normalization; do not leave the current behavior that treats `{ user: null }` as authenticated.
8. Add new state/actions to the setup-store return object: `auth_checked`, `last_visit`, `hydrateUser`.
9. Add tests for:
   - screenshot shape authenticated.
   - legacy `{ user }` authenticated.
   - `{ isLogin: false }` unauthenticated.
   - `{ isLogin: true, user: null }` unauthenticated.
   - non-transient auth failure unauthenticated + checked.
   - transient failure completes without redirect and sets `auth_checked=true`, `is_loading=false`.
   - concurrent `hydrateUser()` calls make one auth request.
   - hydrate does not call business/role/onboarding endpoints.
10. Re-run shared-store tests.

## Success Criteria

- [ ] `hydrateUser()` sets `user` and `is_authenticated` for screenshot shape.
- [ ] Legacy `checkAuth()` behavior remains compatible for valid `{ user }` responses.
- [ ] Missing/null user never results in `is_authenticated=true`.
- [ ] `auth_checked` becomes true after hydrate success or handled failure.
- [ ] `is_loading` becomes false after hydrate success or handled failure.
- [ ] No redirect is triggered by hydrate when `/public/authentication` returns unauthenticated.
- [ ] Concurrent hydrate calls are deduped.
- [ ] No business/role/onboarding API calls happen in hydrate.

## Risk Assessment

Risk: changing `checkAuth()` breaks existing `initialize()` tests.
Mitigation: reuse normalization but preserve `initialize()` sequencing; adjust tests only for intentional response-shape support.

Risk: adding too many user fields bloats shared-types with speculative schema.
Mitigation: add optional fields only; no required fields beyond current contract.

Risk: suppressing unauthorized handler globally would race with other requests.
Mitigation: use a per-call option in `api()` rather than temporarily unregistering the global handler.
