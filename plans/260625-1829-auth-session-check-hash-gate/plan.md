---
title: "Auth Session MVP Parity And Check Hash Gate"
status: completed
created: 260625-1829
source: plans/reports/brainstorm-260625-1829-auth-session-check-hash-gate-report.md
priority: P1
effort: medium
blockedBy: [260624-1119-auth-startup-hydrate]
blocks: []
---

# Plan: Auth Session MVP Parity And Check Hash Gate

## Overview

Restore the minimum missing v6 Adscheck session behavior in the current Vue 3 MFE shell: load Adscheck entitlements after SMIT login, track normal/pro session state, expose explicit actions for Pro activation or normal-session fallback, and add a startup `public/tools/check-hash` gate for SMIT Connect extension integrity.

Approved design source: [brainstorm report](../reports/brainstorm-260625-1829-auth-session-check-hash-gate-report.md).

## Dependency note

This plan builds on the already-implemented code from `plans/260624-1119-auth-startup-hydrate/plan.md` but that plan file still has `status: pending`. Treat this plan as **logically blocked by** `260624-1119-auth-startup-hydrate` until Sếp or implementation updates that earlier plan status. Code evidence shows the startup hydrate behavior exists in `packages/shared-store/src/auth-store.ts` and `apps/shell/src/main.ts`.

## Fixed Decisions

- Keep current startup auth hydrate as the base: `GET /public/authentication` remains first.
- If SMIT login succeeds, load Adscheck entitlement/session data with `GET /ads-check/auth` and product data with `GET /ads-check/product`.
- MVP only: do not port legacy loading progress, language reload, pixel-perfect `SessionUpgrade.vue`, billing/session-manager UI, or broad route gating.
- Track Pro session with `/ads-check/auth.session_actived` and expose explicit actions:
  - `activateProSession()` → `POST /ads-check/sessions/active`.
  - `useNormalSession()` → persist the user choice with legacy key `setting_use_free` for v6 parity.
- Startup orchestration owner is the shell: `hydrateUser()` only hydrates SMIT login; shell/startup logic calls `loadEntitlements()` when `is_authenticated=true` to avoid duplicate entitlement calls.
- Startup check-hash is a **gate**: invalid/missing extension or hash mismatch blocks normal shell rendering and shows a retryable shell-owned error state.
- Shell must not import `apps/adaccounts/src/api/smit-connect.ts`; add shell-local extension messaging helper first. Extract shared helper later only if a second real shell/app use appears.
- Shared-store/shared-types changes must be additive.
- Commit/PR discipline: split shared-package changes and app/shell changes when shipping.

## Scope Boundaries

In scope:

- Shared auth/session data model and actions.
- Minimal Adscheck entitlement loading after SMIT auth.
- Minimal normal/pro session state and persistence.
- Shell-local extension hash verification gate.
- Minimal shell startup error/retry UI.
- Feature docs and architecture docs updates.
- Focused tests for shared-store and shell startup gate helpers.

Out of scope:

- Full legacy session modal UI.
- Full legacy loading progress screen.
- Legacy language reload behavior.
- Session manager/payment/bundle UI.
- Broad role/feature route protection.
- Changing Facebook session probe behavior in `apps/adaccounts/src/api/fb-session.ts`.
- Shared extension helper extraction unless implementation proves shell-local duplication is worse.

## Threat Model Notes

- Check-hash gate verifies that the installed SMIT Connect extension files match server-provided hashes for the checked paths.
- It does **not** prove the extension is impossible to compromise. If a malicious extension controls its own `chrome.runtime.getURL`/fetch response path, it can potentially lie. This gate is an integrity/compatibility check against wrong, stale, or tampered builds under the normal extension trust model.
- Missing extension in local dev is still a startup gate failure by default. Do not silently bypass. If Sếp later wants a dev bypass, add an explicit build-time env var and include it in `turbo.json` `build.env`.

## Target Architecture

```text
apps/shell/src/main.ts
  create app + pinia
  mount app with startup state available
  auth.hydrateUser()
    └─ GET /public/authentication
  auth.loadEntitlements() if authenticated
    ├─ GET /ads-check/auth
    └─ GET /ads-check/product
  verifySmitConnectHashGate()
    ├─ chrome.runtime.getManifest via shell-local extension helper
    ├─ POST /public/tools/check-hash
    ├─ chrome.runtime.getURL(file)
    ├─ extension fetch(file)
    └─ md5 compare

apps/shell/src/App.vue
  SpriteProvider
    if startup gate failed -> StartupGateError with Retry
    else -> router-view

packages/shared-store/src/auth-store.ts
  user/auth hydrate state
  adscheck manager/features/products/session state
  actions for entitlement refresh + Pro/normal session choice
```

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [Auth session contracts and store state](phase-01-auth-session-contracts-and-store-state.md) | completed | Add permissive response types and additive shared-store state/actions for `/ads-check/auth`, `/ads-check/product`, and Pro/normal session choice |
| 2 | [Startup check-hash gate service](phase-02-startup-check-hash-gate-service.md) | completed | Add shell-local extension messaging + `public/tools/check-hash` MD5 verification helper with typed outcomes |
| 3 | [Shell startup gate UI and wiring](phase-03-shell-startup-gate-ui-and-wiring.md) | completed | Wire auth entitlement load + hash gate into shell startup and render retryable error UI without white-screen |
| 4 | [Docs tests and verification](phase-04-docs-tests-and-verification.md) | completed | Update feature/system docs, add focused tests, and run verification commands |

## Dependency Graph

```text
260624-1119-auth-startup-hydrate -> Phase 1 -> Phase 3 -> Phase 4
                                      Phase 2 -> Phase 3
```

Phase 1 touches shared packages. Phase 2/3 touch shell app files. Keep implementation and commits separated where practical.

## Acceptance Criteria

- [x] Existing `/public/authentication` startup hydrate behavior is preserved.
- [x] Authenticated startup loads `/ads-check/auth` and `/ads-check/product` exactly once per hydrate cycle unless explicitly refreshed.
- [x] Store exposes manager/features/products and can distinguish Pro session active vs inactive.
- [x] `activateProSession()` posts `/ads-check/sessions/active` and updates session state on success.
- [x] `useNormalSession()` persists normal-session choice with legacy `setting_use_free` key.
- [x] Check-hash gate posts manifest fields to `/public/tools/check-hash`.
- [x] Check-hash gate verifies every server-provided file hash by reading extension-local files and computing MD5.
- [x] Missing extension, API error, extension fetch error, and hash mismatch produce typed failure states with retry UI.
- [x] Shell does not import remote `apps/adaccounts` source.
- [x] Feature docs and relevant docs match the final behavior.
- [x] Focused verification passes or failures are reported honestly.

## Verification Strategy

Narrow checks first:

```bash
pnpm --filter @mf2/shared-store test
pnpm --filter @mf2/shared-store typecheck
pnpm --filter @mf2/shell typecheck
pnpm verify:features
```

Broaden when shared/app/docs boundaries are touched:

```bash
pnpm verify:all
```

Manual smoke after implementation needs gateway + SMIT Connect extension:

- Valid extension + logged-in SMIT user reaches `/home` or `/adscheck-pro/adaccounts` normally.
- Missing extension shows clear startup gate error + Retry.
- Hash mismatch blocks app with clear message.
- User with inactive Pro session can be represented in store without route crash.
- Activating Pro session updates session counters/state.

## Risks

| Risk | Mitigation |
|---|---|
| Unknown `/ads-check/auth`, `/ads-check/product`, `/ads-check/sessions/active` payload shape | Use permissive additive interfaces; pin only fields used by current UI/state |
| Startup gate blocks all app routes when extension missing | Approved as startup gate; show actionable retry/install message |
| Shell duplicates extension messaging from adaccounts | Accept small shell-local duplication for MVP; extract only after second real shared use |
| Shared-store singleton affects every remote | Additive state/actions only; focused shared-store tests |
| Reintroducing full feature gating accidentally | Do not block routes by features/session in this plan; expose state only |
| Mixed shared/app changes violate governance | Split phases and commits/PRs by shared vs app scope |
| MD5 implementation unavailable in browser | Browser WebCrypto does not support MD5; Phase 2 must choose an explicit small dependency (or proven existing dependency) and document package impact |
| Existing auth-startup plan stale status causes confusion | Mark dependency in this plan; update old plan status before implementation if needed |

## Open Questions

- Confirm exact live payloads for `/ads-check/auth`, `/ads-check/product`, and `/ads-check/sessions/active` if available; otherwise keep types permissive.
- Decide in Phase 1 whether to keep legacy key `setting_use_free` for compatibility or use namespaced key and migrate later.
- Decide final copy for startup gate error screen during Phase 3.

## Next Step Recommendation

Because this plan touches auth/session startup and extension integrity gate, run plan validation or red-team before implementation.

Recommended after Sếp reviews:

```bash
/ck:plan red-team /Volumes/Workspace/smit/worktree/client/feat-system-starter/plans/260625-1829-auth-session-check-hash-gate/plan.md
```


## Implementation Report

Completed on 2026-06-25. Implemented shared auth/session state, shell startup check-hash gate, retry UI, feature docs, architecture docs, and focused tests.

Verification passed:

- `pnpm --filter @mf2/shared-store test`
- `pnpm --filter @mf2/shared-store typecheck`
- `pnpm --filter @mf2/shell test`
- `pnpm --filter @mf2/shell typecheck`
- `pnpm verify:features`
- `pnpm verify:all`

Review/test subagents could not run because the local agent provider returned `503 no claude provider with tag="cli" for UA`. Local command verification passed after endpoint corrections.
