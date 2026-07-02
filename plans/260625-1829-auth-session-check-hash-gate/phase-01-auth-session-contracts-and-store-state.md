---
phase: 1
title: "Auth session contracts and store state"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Auth session contracts and store state

## Overview

Add the minimum shared auth/session contract needed to represent Adscheck entitlement state after SMIT login. Preserve the current lightweight `/public/authentication` hydrate and add entitlement/session state only when the user is authenticated.

## Requirements

- Functional: load `/ads-check/auth` and `/ads-check/product` after authenticated hydrate.
- Functional: map legacy feature objects to include `usable: !has_expired`.
- Functional: expose whether Pro session is active through `manager.session_actived` or a computed equivalent.
- Functional: add `activateProSession()` for `POST /ads-check/sessions/active` and `useNormalSession()` for the normal/free choice.
- Non-functional: additive shared-store/shared-types changes only.
- Non-functional: no route gating or UI prompt in this phase.

## Architecture

Keep the current `useAuthStore` as the single cross-MFE auth singleton. Add small permissive interfaces in `packages/shared-types` for Adscheck entitlement/session data, but avoid over-modeling backend fields.

Suggested state additions in `auth-store.ts`:

```text
adscheck_manager: AdscheckManager | null
adscheck_features: AdscheckFeature[]
adscheck_products: unknown | null
entitlements_checked: boolean
entitlements_loading: boolean
entitlements_error: boolean
use_normal_session: boolean
```

Suggested actions:

```text
loadEntitlements(): Promise<void>
refreshEntitlements(): Promise<void>
activateProSession(): Promise<boolean>
useNormalSession(): void
clearAdscheckSession(): void
```

`hydrateUser()` must **not** call `loadEntitlements()` directly. Shell startup orchestration calls `loadEntitlements()` only after `is_authenticated=true`. This keeps auth hydrate reusable and prevents double entitlement calls when shell retry/startup logic is added in Phase 3.

## Related Code Files

- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-store/src/auth-store.ts`
- Modify: `packages/shared-store/src/__tests__/auth-store.test.ts`
- Avoid unless needed: `packages/shared-store/src/api-client.ts`

## Implementation Steps

1. Add permissive `AdscheckFeature`, `AdscheckManager`, `AdscheckAuthResponse`, `AdscheckProductResponse`, and `ActivateSessionResponse` interfaces.
2. Add store state for entitlement/session data and loading/error flags.
3. Add a module-level `entitlements_promise` guard to dedupe concurrent entitlement loads.
4. Implement `loadEntitlements()`:
   - no-op/clear if `is_authenticated=false`.
   - `GET /ads-check/auth` and `GET /ads-check/product` through `api()`.
   - map features to `usable` without mutating backend objects unexpectedly.
5. Implement `refreshEntitlements()` with lost-Pro detection state only; do not reload page.
6. Implement `activateProSession()`:
   - `POST /ads-check/sessions/active`.
   - on success, set `manager.session_actived=true` and increment `session_used` when numeric.
   - return boolean or throw typed API error depending on existing store style; prefer boolean for UI simplicity.
7. Implement `useNormalSession()` with legacy storage key `setting_use_free` for MVP parity with v6.
8. Update existing auth-store tests and add new entitlement/session tests.

## Success Criteria

- [x] Existing auth-store tests still pass.
- [x] Authenticated hydrate can load `/ads-check/auth` and `/ads-check/product`.
- [x] Unauthenticated hydrate does not call `/ads-check/auth` or `/ads-check/product`.
- [x] Features get `usable: !has_expired`.
- [x] `session_actived=false` is represented without redirect/reload.
- [x] `activateProSession()` updates session state on success.
- [x] `useNormalSession()` persists normal-session choice with legacy `setting_use_free` key.
- [x] No shell/app files are modified in this phase.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Unknown backend payload fields | Use permissive interfaces and only consume known session fields |
| Duplicate entitlement calls | Add `entitlements_promise` guard and tests |
| Shared-store blast radius | Additive API only; focused tests before shell wiring |
| Accidentally reintroducing route gating | Phase explicitly exposes state only; no router changes |
