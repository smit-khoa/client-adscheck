---
phase: 1
title: "Shared API Host Resolver"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Shared API Host Resolver

## Overview

Move gateway base URL selection to a runtime domain-suffix resolver in the shared API client while preserving the current public API and preventing startup auth from causing an unwanted redirect.

## Requirements

- Functional: `api()` must call `http://localhost:3000` on `localhost`, `127.0.0.1`, and `::1`.
- Functional: `api()` must call `https://gateway.<last-two-host-labels>` on normal domains such as `.team` and `.vn`.
- Functional: runtime resolver must affect shell and standalone remote builds because `@mf2/shared-store` is shared by all apps.
- Functional: startup auth needs a scoped way to avoid global logout on `/public/authentication` 401, unless backend contract is verified as `200 + { isLogin: false }`.
- Functional: keep cookies via `credentials: "include"` and keep `timezone` header.
- Non-functional: no global `window.api`, no axios port, no breaking public API changes.

## Architecture

Current `api-client.ts` reads `__API_GATEWAY_URL__` with fallback `https://gateway.smit.team`. Replace that runtime path with a small resolver used lazily/per request. Do not keep a hybrid path where `__API_GATEWAY_URL__` wins, because shell `DefinePlugin` currently defines it and would bypass the resolver.

Suggested helper shape:

```ts
function resolveApiUrl(hostname?: string): string {
  const current = hostname ?? globalThis.location?.hostname ?? "localhost";
  if (current === "localhost" || current === "127.0.0.1" || current === "::1") {
    return "http://localhost:3000";
  }
  const suffix = current.split(".").slice(-2).join(".");
  return `https://gateway.${suffix}`;
}
```

Call the resolver inside `api()` or pass hostnames in tests; do not compute it once at module load if the code can run in node-test context.

401 handling decision:

- Preferred if backend confirms it: `/public/authentication` returns HTTP 200 with `{ isLogin: false }` for unauthenticated users; then global 401 handler is not involved.
- If backend can return HTTP 401 for startup auth: extend `api()` additively with an option such as `suppress_unauthorized_handler?: boolean` so `hydrateUser()` can receive `ApiError(kind: "auth")` without redirecting. Default remains current behavior for all other API calls.

## Related Code Files

- Modify: `packages/shared-store/src/api-client.ts`
- Modify: `packages/shared-store/src/__tests__/api-client.test.ts`
- Later in Phase 3: `apps/shell/rspack.config.ts` for removing stale `__API_GATEWAY_URL__` define if no longer used

## Implementation Steps

1. Remove the `__API_GATEWAY_URL__` runtime dependency from `api-client.ts`; do not leave it as a higher-priority branch.
2. Add a lazy/per-call resolver with explicit loopback handling.
3. Decide and implement the startup-auth 401 behavior:
   - If backend contract is verified as 200-body unauthenticated: document it in tests/docs.
   - Otherwise add an additive `api()` option to suppress the global unauthorized handler for that one call.
4. Update `api()` URL composition to use resolver output.
5. Add/adjust tests for:
   - `dev.smit.team` -> `https://gateway.smit.team`
   - `adscheck.smit.vn` -> `https://gateway.smit.vn`
   - `localhost` -> `http://localhost:3000`
   - `127.0.0.1` -> `http://localhost:3000`
   - `::1` -> `http://localhost:3000`
   - startup auth 401 does not call the unauthorized handler when suppression option is used.
6. Re-run shared-store API client tests.

## Success Criteria

- [ ] Resolver behavior is covered by `.team`, `.vn`, `localhost`, `127.0.0.1`, and `::1` tests.
- [ ] Existing success/error/timeout/401 tests still pass.
- [ ] Existing API behavior remains default: normal 401 still triggers the centralized unauthorized handler once.
- [ ] Startup auth can opt out of the handler if backend returns 401.
- [ ] No call site outside `api-client.ts` needs to know gateway base URL.
- [ ] No legacy global API wrapper introduced.

## Risk Assessment

Risk: Node test environment has no real `window.location`.
Mitigation: resolver accepts an optional hostname and/or reads `globalThis.location` lazily inside `api()`.

Risk: removing `__API_GATEWAY_URL__` changes standalone remote behavior.
Mitigation: resolver loopback behavior covers standalone remote dev; production remotes inherit shell browser hostname.

Risk: ccTLD or single-label custom domains resolve incorrectly with "last two labels".
Mitigation: record as an accepted limitation of Sếp's domain-suffix-only decision; tests pin only `.team`, `.vn`, and loopbacks.
