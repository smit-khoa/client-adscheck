---
phase: 3
title: "Shell Startup Wiring and Docs"
status: pending
priority: P1
dependencies: [2]
---

# Phase 3: Shell Startup Wiring and Docs

## Overview

Wire shell startup to run lightweight user hydration before app mount, then update feature documentation to describe the new behavior accurately.

## Requirements

- Functional: shell calls the new lightweight auth hydrate action at startup.
- Functional: app does not enable route protection, business flow, role flow, or `AuthLayout` reactivation.
- Non-functional: keep startup code small; no new UI unless required.
- Documentation: update auth feature doc after code changes.

## Architecture

In `apps/shell/src/main.ts`, create the Pinia instance explicitly, install it, then call the auth store hydrate action before mounting.

Use an async bootstrap/IIFE instead of top-level await so `apps/shell/rspack.config.ts` does not need `experiments.topLevelAwait`.

Suggested flow:

```ts
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

void (async () => {
  const auth = useAuthStore(pinia);
  await auth.hydrateUser();

  app.use(router);
  app.mount(container);
})();
```

Exact error handling can be adjusted, but the invariant is fixed: startup runs lightweight `hydrateUser()`, not full `initialize()`.

## Related Code Files

- Modify: `apps/shell/src/main.ts`
- Modify: `apps/shell/rspack.config.ts` to remove `__API_GATEWAY_URL__` from `DefinePlugin` if Phase 1 removed all usage
- Modify: `.claude/features/auth-flow.md`
- Possibly modify: `README.md` or `docs/system-architecture.md` only if they become misleading for startup auth

## Implementation Steps

1. Import `useAuthStore` in shell startup.
2. Create a named Pinia instance and pass it to `app.use`.
3. Run `auth.hydrateUser()` inside an async IIFE/bootstrap before `app.mount()`.
4. Ensure startup does not call `initialize()` and does not mount/reactivate `AuthLayout`.
5. Ensure handled hydrate failure still reaches `app.mount()`; no blank screen from an uncaught promise.
6. Remove `__API_GATEWAY_URL__` from shell `DefinePlugin` if there is no remaining `api-client` usage after Phase 1. This is required to avoid future dead config drift.
7. Update `.claude/features/auth-flow.md`:
   - startup hydrate is active.
   - full AuthLayout/business/role flow remains not active for prototype.
   - list new/changed files and verification.
   - document that API host is resolved by runtime domain suffix.
8. Update `README.md` or `docs/system-architecture.md` only if they still claim auth is fully bypassed or `API_GATEWAY_URL` controls runtime gateway.
9. Run focused verification.

## Success Criteria

- [ ] Shell startup calls `hydrateUser()` once through the deduped store action.
- [ ] Startup does not call `initialize()`.
- [ ] Startup does not use top-level await.
- [ ] Handled unauthenticated/failure response does not prevent `app.mount()`.
- [ ] `__API_GATEWAY_URL__` shell define is removed if unused.
- [ ] Auth feature doc matches implemented behavior.
- [ ] `pnpm --filter @mf2/shell typecheck` passes.
- [ ] `pnpm verify:features` passes.

## Risk Assessment

Risk: top-level await may not be accepted by current build target or Rspack config.
Mitigation: use async IIFE/bootstrap; do not require `experiments.topLevelAwait`.

Risk: blocking mount makes failure look like blank screen.
Mitigation: `hydrateUser()` catches handled failures and Phase 3 ensures mount still runs; prototype accepts blank-background wait during the request.

Risk: future `AuthLayout` reactivation could run full `initialize()` after startup hydrate.
Mitigation: keep `AuthLayout` out of scope and document that future reactivation must reconcile `hydrateUser()` with `initialize()`.
