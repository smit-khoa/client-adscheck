---
type: brainstorm-report
topic: auth-startup-hydrate
created_at: 2026-06-24 11:19 Asia/Saigon
status: approved-design
modes: [markdown]
---

# Auth Startup Hydrate Brainstorm Report

## Summary

Add a lightweight startup auth flow for the shell.

Final agreed direction: shell calls `/public/authentication` at startup, normalizes the auth response, stores `user` in `@mf2/shared-store`, and does not enable redirect/business/role gating yet.

## Problem-first framing

### Solution-jumping diagnosis

Requested solution: add auth flow on project startup.

Underlying signal: remotes need shared current-user state without each remote calling auth independently.

### Underlying problem

In an MFE app, auth state must be initialized once by the shell and exposed via the shared-store singleton so every remote reads the same user/session state.

### Assumption challenges

| Assumption | Risk if wrong | Validation |
|---|---|---|
| `/public/authentication` response matches screenshot | store fails to set user | Unit test screenshot shape + legacy `{ user }` shape |
| domain suffix always maps gateway correctly | staging/custom domain breaks API | Runtime tests for `.team`, `.vn`, `localhost` |
| remotes only need user for this round | hidden dependency on roles/businesses | Keep `auth_checked` so remotes can wait; do not add role gating |
| startup can wait for auth | slow API delays mount | Use existing splash; no new UI unless needed |

### Problem statement

Users open the shell. The app needs to know the logged-in user once, early, and share it across remotes. If each remote handles auth separately, state diverges and API behavior becomes inconsistent. Success: one auth call at startup, shared-store has normalized `user`, and remotes can consume it.

### Alternative framings

1. **Startup state problem** — hydrate user before app mount.
2. **Route protection problem** — guard routes and redirect unauthenticated users.
3. **Full session context problem** — hydrate user + businesses + roles + onboarding.

Chosen framing: startup state problem only.

### Evidence status

Medium. Repo already has auth-store/api-client/AuthLayout, but routing bypasses auth. Screenshot shows real auth response shape that current types do not fully model.

### Validation plan

- Unit test auth response normalization.
- Unit test API host resolver for `.team`, `.vn`, `localhost`.
- Run shared-store tests/typecheck.
- Update auth feature doc.

### Stakeholder message

We can enable startup user hydration now without turning on route protection. This gives remotes shared current-user state while avoiding redirect/business/role complexity in this round.

## Requirements captured

| Item | Decision |
|---|---|
| Expected output | Startup auth call stores user in shared-store for whole app |
| Acceptance | Correct gateway host by domain suffix, cookies included, supports screenshot response + legacy response |
| Scope | Auth startup + user store only |
| Out of scope | Redirect signin, business/role/onboarding flow, remote role/feature gating |
| API host | Domain suffix only |
| Auth response | Support `{ isLogin, user, last_visit }` and `{ user }` |
| Touchpoints | `api-client.ts`, `auth-store.ts`, `shared-types`, shell startup, auth feature doc/tests |

## Evaluated approaches

### Approach A — Startup hydrate before app mount

Shell creates Pinia, calls lightweight auth hydrate, then mounts app.

Pros:
- Best match to scope.
- Remote sees shared auth state early.
- No router redirect loop risk.
- Reuses shared-store singleton.

Cons:
- App mount waits for auth call.
- Needs startup action separate from full `initialize()`.

### Approach B — Hydrate in `App.vue` after mount

App mounts immediately, root component checks auth on mounted.

Pros:
- UI appears sooner.
- Very small wiring.

Cons:
- Remote may mount before user is ready.
- More `user=null` temporary states in remote code.

### Approach C — Lightweight router guard

Router waits for auth hydration before navigation continues, no redirect.

Pros:
- Prevents route/remote before auth.
- Easy to extend to protection later.

Cons:
- Heavier than needed.
- Async guard can create navigation hangs if mishandled.

## Final recommendation

Use Approach A.

Implementation shape:

1. Add runtime gateway resolver in shared `api-client`:
   - `localhost` -> `http://localhost:3000`
   - otherwise -> `https://gateway.` + last two hostname labels
2. Keep `api()`, `api_get`, `api_post`, `ApiError` public API stable.
3. Add auth response normalization in auth-store:
   - accept `{ isLogin, user, last_visit }`
   - accept legacy `{ user }`
   - set `user`, `is_authenticated`, optional `last_visit`, and `auth_checked`
4. Add lightweight startup action, e.g. `hydrateUser()`.
5. Wire shell startup to call lightweight action after Pinia install and before `app.mount()`.
6. Do not call full `initialize()` for startup hydrate.
7. Update `.claude/features/auth-flow.md` after code change.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Blocking mount feels slow | Use existing loading/splash; avoid new UI unless observed needed |
| Host resolver breaks custom domains | Document domain-suffix-only decision; tests pin behavior |
| Shared package change affects all apps | Keep additive, run shared-store tests/typecheck |
| Auth response has extra fields | Add optional fields only; do not require every field |
| Business/role logic accidentally runs | Separate `hydrateUser()` from `initialize()` |

## Success metrics

- One startup auth request to correct gateway host.
- `useAuthStore().user` contains current user from screenshot shape.
- `is_authenticated=true` when `isLogin=true` or legacy `{ user }` exists.
- `is_authenticated=false` when `isLogin=false` or auth fails non-transiently.
- No redirect to dashboard or introduction in this round.
- Shared-store tests pass.

## Suggested verification

- `pnpm --filter @mf2/shared-store test`
- `pnpm --filter @mf2/shared-store typecheck`
- `pnpm --filter @mf2/shell typecheck`
- `pnpm verify:features`

## Next steps

1. Create implementation plan via `/ck:plan`.
2. Implement small shared-store changes.
3. Wire shell startup.
4. Update auth feature doc.
5. Verify with focused tests.

## Unresolved questions

None.
