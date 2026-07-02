---
phase: 3
title: "Shell startup gate UI and wiring"
status: completed
priority: P1
dependencies: [1, 2]
---

# Phase 3: Shell startup gate UI and wiring

## Overview

Wire entitlement loading and check-hash verification into shell startup without causing a white-screen. Add a minimal shell-owned startup gate state and retryable error UI.

## Requirements

- Functional: startup runs current auth hydrate, entitlement load, and check-hash gate in a predictable order.
- Functional: failed check-hash gate blocks normal `router-view` rendering.
- Functional: user can retry hash verification without full page reload.
- Functional: unauthenticated SMIT user does not call entitlement APIs; clarify whether check-hash still runs for guest state during implementation.
- Non-functional: no route-level feature gating in this phase.
- Non-functional: minimal UI using existing shared-ui primitives where available.

## Architecture

Prefer mounting the Vue app early with startup state rather than waiting on all async work before mount.

Suggested shape:

```text
apps/shell/src/stores/startup-gate-store.ts or composables/use-startup-gate.ts
  status: idle | checking | ready | blocked
  error: CheckHashGateResult | null
  runStartupChecks(): Promise<void>
  retryHashGate(): Promise<void>

apps/shell/src/main.ts
  create app + pinia
  app.use(router)
  app.mount(container)
  run startup checks

apps/shell/src/App.vue
  SpriteProvider
    StartupGateError if blocked
    else router-view
```

If a Pinia store feels too heavy for shell-only startup state, use a small shell-local composable singleton. Do not put UI-only gate state in shared-store unless a remote needs it.

## Related Code Files

- Modify: `apps/shell/src/main.ts`
- Modify: `apps/shell/src/App.vue`
- Create: `apps/shell/src/components/StartupGateError.vue`
- Create optional: `apps/shell/src/composables/use-startup-gate.ts`
- Use from Phase 2: `apps/shell/src/services/check-hash-gate.ts`
- Use from Phase 1: `packages/shared-store/src/auth-store.ts`

## Implementation Steps

1. Decide startup orchestration location:
   - `main.ts` owns sequence and writes startup state, or
   - a small `useStartupGate()` composable owns sequence.
2. Mount app early enough that blocked/error state can render.
3. Run auth hydrate first.
4. Run `auth.loadEntitlements()` only when `is_authenticated=true`; `hydrateUser()` must not call it directly.
5. Run `verifySmitConnectHashGate()` according to approved startup gate scope.
6. Add `StartupGateError.vue`:
   - clear title.
   - simple explanation based on typed failure status.
   - Retry button.
   - no complex modal/session UI.
7. Update `App.vue` to render `StartupGateError` before `router-view` when blocked.
8. Ensure retry re-runs only hash gate unless auth reload is needed for API error recovery.

## Success Criteria

- [x] App mounts and can show startup gate errors instead of blank screen.
- [x] Valid hash gate allows normal router rendering.
- [x] Missing extension blocks router rendering with retry UI.
- [x] Hash mismatch blocks router rendering with retry UI.
- [x] Authenticated startup loads entitlement/session state once.
- [x] Unauthenticated startup does not call `/ads-check/auth` or `/ads-check/product`.
- [x] No remote route imports or adaccounts source imports in shell startup.
- [x] UI is minimal and truthful; no fake success states.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Double entitlement load from store and shell | Shell is the only startup orchestrator for `loadEntitlements()`; `hydrateUser()` only hydrates SMIT login |
| Startup gate blocks guest/unauthenticated users unexpectedly | Approved default is startup gate for all shell startup; do not add bypass unless Sếp explicitly approves env-gated behavior |
| Error UI grows into full legacy modal | Keep component single-purpose: explain gate failure + retry |
| Router renders protected remote before gate finishes | Default status should be `checking` until hash gate resolves; render loading or nothing minimal |
