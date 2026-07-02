---
title: "Auth Startup Hydrate"
status: pending
created: 2026-06-24
source: plans/reports/auth-startup-brainstorm-260624-1119-auth-startup-hydrate-report.md
blockedBy: []
blocks: [260625-1829-auth-session-check-hash-gate]
---

# Plan: Auth Startup Hydrate

## Overview

Implement lightweight startup auth hydration for the shell. On app start, call `/public/authentication`, normalize the response, store `user` in `@mf2/shared-store`, and keep business/role gating out of scope.

Approved design source: [brainstorm report](../reports/auth-startup-brainstorm-260624-1119-auth-startup-hydrate-report.md).

## Fixed decisions

- Startup auth is **hydrate only**: no `/gate/me/businesses`, no roles/onboarding, no route protection.
- Startup hydrate must **not redirect** on unauthenticated auth check. Because the current `api()` triggers the global 401 handler, implementation must either:
  - require `/public/authentication` to return `200 + { isLogin: false }` for unauthenticated users, or
  - add a scoped way for this auth check to suppress the global unauthorized handler.
- Gateway host is **domain suffix only**, resolved at request time:
  - `localhost`, `127.0.0.1`, `::1` -> `http://localhost:3000`
  - normal domains -> `https://gateway.` + last two hostname labels.
- Auth response supports both screenshot shape and legacy shape:
  - `{ isLogin, user, last_visit }`
  - `{ user }`
- Invalid auth body (`isLogin: true` but missing/null `user`) is treated as unauthenticated.
- Do not port the legacy global `window.api`/axios wrapper. Keep the existing typed `api-client` public API.
- `__API_GATEWAY_URL__` must not remain in the runtime path after resolver migration; otherwise shell builds keep using the define and bypass domain suffix logic.
- `packages/shared-*` changes must be additive. Implementation should be split as separate shared-store commit/PR before shell wiring if committing.

## Phase roadmap

| Phase | Name | Scope | Priority | Status |
|---|---|---|---|---|
| 1 | [Shared API host resolver](phase-01-shared-api-host-resolver.md) | `packages/shared-store/src/api-client.ts` + tests | P1 | pending |
| 2 | [Auth response normalization](phase-02-auth-response-normalization.md) | `packages/shared-types`, `packages/shared-store/src/auth-store.ts` + tests | P1 | pending |
| 3 | [Shell startup wiring and docs](phase-03-shell-startup-wiring-and-docs.md) | `apps/shell/src/main.ts`, auth feature docs, verification | P1 | pending |

## Dependencies

- Phase 2 depends on Phase 1 because startup auth needs the 401-suppression decision in `api-client` before `hydrateUser()` can satisfy no-redirect behavior.
- Phase 3 depends on Phase 2 because shell should call the new lightweight hydrate action.
- Commit/PR discipline: Phase 1+2 touch `packages/shared-*`; Phase 3 touches `apps/*` and docs. Do not mix shared and app changes in one commit/PR if shipping.

## Success criteria

- [ ] `api()` builds gateway URL from runtime domain suffix and keeps `credentials: "include"`.
- [ ] Runtime resolver is not bypassed by `__API_GATEWAY_URL__` in shell builds.
- [ ] Existing API public contract remains stable: `api`, `api_get`, `api_post`, `ApiError`, `setUnauthorizedHandler`.
- [ ] Startup auth can represent unauthenticated response without redirecting.
- [ ] `useAuthStore` can hydrate user from `{ isLogin, user, last_visit }`.
- [ ] `useAuthStore` still accepts legacy `{ user }` response.
- [ ] `is_authenticated=false` for `isLogin=false`, missing user, or non-transient auth failure.
- [ ] Startup shell calls lightweight hydrate before mount and does not run full `initialize()`.
- [ ] `hydrateUser()` manages `is_loading`, `auth_checked`, and duplicate calls predictably.
- [ ] No dashboard/introduction/business/role flow is enabled in this round.
- [ ] `.claude/features/auth-flow.md` is updated to match the new startup hydrate behavior.

## Verification commands

Run narrow checks first:

```bash
pnpm --filter @mf2/shared-store test
pnpm --filter @mf2/shared-store typecheck
pnpm --filter @mf2/shell typecheck
pnpm verify:features
```

If shared/app boundaries or docs guards are touched broadly, run:

```bash
pnpm verify:all
```

## Risks

| Risk | Mitigation |
|---|---|
| 401 from `/public/authentication` triggers global logout | Phase 1 must add a scoped suppress-unauthorized path or document verified 200-body contract before Phase 2 |
| Domain suffix resolver breaks unusual hostnames | Pin `.team`, `.vn`, `localhost`, `127.0.0.1`, `::1` behavior in tests; document ccTLD/single-label limitations |
| Runtime resolver bypassed by build define | Remove `__API_GATEWAY_URL__` from API runtime path and shell DefinePlugin |
| Full auth flow accidentally runs | Add separate hydrate action and wire shell to it, not `initialize()` |
| Shared singleton blast radius | Keep changes additive and verify `@mf2/shared-store` before app wiring |
| App mount waits on slow auth | Accept prototype blank-background trade-off; do not add new UI unless product asks |

## Out of scope

- Business selection routing.
- Roles/onboarding fetch.
- Remote role/feature gating.
- New auth UI/spinner.
- Full `AuthLayout` reactivation.

## Red Team Review

### Accepted findings

| Severity | Finding | Plan delta |
|---|---|---|
| Critical | HTTP 401 currently triggers global logout before `hydrateUser()` can catch | Phase 1 now requires scoped suppress-unauthorized behavior or verified 200-body contract; Phase 2 tests no-redirect behavior |
| Critical | Keeping `__API_GATEWAY_URL__` can bypass runtime resolver | Phase 1 requires removing runtime define dependency; Phase 3 removes shell DefinePlugin entry if unused |
| High | Resolver breaks IP/loopback hostnames | Phase 1 adds `127.0.0.1` and `::1` behavior + tests |
| High | Resolver must not read `window.location` at module-load in node tests | Phase 1 requires lazy/per-call resolver or hostname-arg helper |
| High | Top-level await may fail under current Rspack config | Phase 3 uses async IIFE/bootstrap instead of top-level await |
| High | `is_loading` default `true` can remain stuck after hydrate | Phase 2 requires `hydrateUser()` to set `is_loading=false` in `finally` |
| High | Duplicate hydrate calls can race | Phase 2 adds `hydrate_promise` guard + concurrent-call test |
| High | `isLogin:true` with null user is undefined | Phase 2 treats missing/null user as unauthenticated and tests it |
| Medium | New store state/action can be forgotten in setup return | Phase 2 explicitly returns `auth_checked`, `last_visit`, `hydrateUser` |
| Medium | Resolver affects standalone remotes too | Phase 1 documents shared-store resolver behavior for shell + standalone remotes |

### Rejected / downgraded findings

- `AuthLayout` double-hydration was downgraded: current `apps/shell/src/router/index.ts` does not mount `AuthLayout`, so it is not an active blocker. Plan still records that reactivating `AuthLayout` is out of scope and must not accidentally call full `initialize()` in this round.
- Adding a spinner to `index.html` was rejected as out of scope; prototype accepts blank-background wait during startup hydrate.

### Whole-Plan Consistency Sweep

- Files reread before edit: `plan.md`, `phase-01-shared-api-host-resolver.md`, `phase-02-auth-response-normalization.md`, `phase-03-shell-startup-wiring-and-docs.md`.
- Decision deltas checked: 10.
- Reconciled stale references:
  - `no redirect` now includes 401 handler constraint.
  - `__API_GATEWAY_URL__` cleanup changed from optional to required when unused.
  - top-level await snippet replaced with async bootstrap/IIFE approach.
  - resolver tests expanded to loopback/IP and standalone remote implications.
  - `hydrateUser()` now owns `is_loading`, `auth_checked`, `hydrate_promise`, missing-user handling.
- Unresolved contradictions: 0.

## Unresolved questions

None.
