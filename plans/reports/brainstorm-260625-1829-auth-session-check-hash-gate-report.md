---
topic: auth-session-mvp-parity-and-check-hash-gate
status: approved
source: brainstorm
created: 2026-06-25
modes: [markdown]
---

# Brainstorm — Auth session MVP parity and startup check-hash gate

## Summary

Sếp approved: **MVP parity** for SMIT login session logic and **startup gate** for `public/tools/check-hash`.

Recommended direction: restore only the core legacy behavior needed for correctness:

- Startup still begins with `GET /public/authentication`.
- If logged in, load Adscheck entitlements with `GET /auth` and `GET /product`.
- Track normal/pro session state from `/auth.session_actived`.
- Add minimal actions for choosing Pro session (`POST /sessions/active`) or normal session.
- Add extension hash verification as a startup gate using `POST /public/tools/check-hash` + extension file MD5 compare.

Do **not** port full legacy loading progress, language reload behavior, or pixel-perfect legacy session modal in this round.

## Problem statement

The current Vue 3 MFE client has a lightweight shell auth hydrate. It verifies the SMIT dashboard login but does not restore the old Adscheck product/session contract. The old client also verified the SMIT Connect extension hash through `public/tools/check-hash`; that logic is absent in the new client.

This creates two gaps:

1. The new client can know whether a user is logged into SMIT, but cannot know whether Adscheck Pro is usable through a Pro session vs normal session.
2. The new client can call Facebook tooling through SMIT Connect, but does not validate the installed extension against server-provided file hashes at startup.

## Codebase findings

### Current repo stack and constraints

- Project: Vue 3.5 + TypeScript + Pinia + Module Federation 2.0 monorepo.
- Shared auth state lives in `packages/shared-store/src/auth-store.ts`.
- Gateway API wrapper lives in `packages/shared-store/src/api-client.ts`.
- Shell startup calls auth hydrate before mount in `apps/shell/src/main.ts`.
- Feature docs are mandatory for logic/API changes; relevant doc is `.claude/features/auth-flow.md`.
- Shared-package changes are sensitive: keep APIs additive and avoid mixing `packages/shared-*` and `apps/*` in one commit/PR.

### Already present in current repo

| Area | Current status | Evidence |
|---|---|---|
| SMIT login hydrate | Present | `packages/shared-store/src/auth-store.ts` calls `/public/authentication` |
| Auth response normalization | Present | Accepts `{ isLogin, user, last_visit }` and legacy `{ user }` |
| Centralized 401 handling | Present | `packages/shared-store/src/api-client.ts` has `setUnauthorizedHandler` |
| Facebook session probe | Present, separate concern | `apps/adaccounts/src/api/fb-session.ts` probes Facebook Banzai session |
| Feature docs for auth | Present | `.claude/features/auth-flow.md` documents startup hydrate only |

### Missing in current repo

| Area | Missing behavior | Legacy evidence |
|---|---|---|
| Adscheck entitlement load | No `GET /auth` after SMIT login | Old `src/js/Adscheck.js` calls `/auth` |
| Product catalog | No `GET /product` | Old `src/js/Adscheck.js` calls `/product` |
| Pro session state | No `manager.session_actived` equivalent | Old `SessionUpgrade.vue` and `LoadInsightData.js` rely on `session_actived` |
| Activate Pro session | No `POST /sessions/active` action | Old `SessionUpgrade.vue` calls `/sessions/active` |
| Normal/free session choice | No `setting_use_free` or equivalent | Old `SessionUpgrade.vue` sets `localStorage.setting_use_free = 1` |
| Check extension hash | No `public/tools/check-hash` client logic | Old `Adscheck.js#checkValidHashExtension` posts manifest then checks MD5 of files |

## Legacy behavior summary

### Login and entitlement flow

Old `src/js/Adscheck.js` active `authentication()` flow:

1. `GET /public/authentication`.
2. If `!isLogin`, return unauthenticated.
3. If user lacks name, redirect dashboard.
4. `Promise.all([GET /auth, GET /product])`.
5. Store:
   - `is_login_smit`
   - `user`
   - `bank`
   - `products`
   - `manager`
   - `features` mapped with `usable: !has_expired`
6. Feature usage checks require both ownership and `manager.session_actived`.

### Normal/pro session flow

Old `SessionUpgrade.vue` behavior:

- If Pro session not active and user owns feature, show session prompt.
- User can choose Pro session:
  - `POST /sessions/active`
  - set `manager.session_actived = true`
  - increment `manager.session_used`
- User can choose normal session:
  - `localStorage.setting_use_free = 1`
  - resolve false so advanced/pro action does not continue.
- If prior manager had `session_actived=true` and new `/auth` returns `session_actived=false`, old code reloads page.

### Extension hash check flow

Old `checkValidHashExtension({ manifest })` behavior:

1. Extract `manifest_version`, `name`, `version`.
2. `POST /public/tools/check-hash` with manifest fields.
3. If server returns `success` and `fileHash[]`:
   - normalize `dist/` prefix out of file path.
   - call extension `chrome.runtime.getURL(path)`.
   - fetch file through extension.
   - compute `md5(file)`.
   - compare with server hash.
4. If any mismatch or API fails, mark extension unverified.

## Requirements captured

### Expected output

A brainstorm report and follow-up implementation plan for restoring MVP auth/session parity and startup extension hash gate.

### Acceptance criteria

- Report identifies what current repo already has and what it lacks.
- Plan should define concrete files, phases, contracts, and tests.
- MVP keeps old core behavior but avoids full legacy UI/progress port.
- Startup check-hash gate is mandatory in the design.

### Scope boundary

In scope:

- SMIT login + Adscheck entitlements/session state.
- Minimal Pro/normal session state and actions.
- Startup extension hash verification gate.
- Docs/tests strategy.

Out of scope:

- Pixel-perfect legacy `SessionUpgrade.vue` port.
- Full old loading progress screen.
- Legacy language reload behavior.
- Full session manager/billing UI.
- Broad route/feature gating redesign unless separately approved.

### Non-negotiable constraints

- Keep code simple and additive.
- Preserve current MFE shared-store singleton behavior.
- Use existing `api()` wrapper, not raw fetch.
- Update `.claude/features/auth-flow.md` after implementation.
- Run focused shared-store tests and feature-doc verification.
- Avoid mixing shared package changes and app changes in one commit/PR.

### Touchpoints

Likely files for implementation planning:

- `packages/shared-store/src/auth-store.ts`
- `packages/shared-store/src/api-client.ts` only if new API option is required; avoid if possible.
- `packages/shared-store/src/__tests__/auth-store.test.ts`
- `packages/shared-types/src/index.ts`
- `apps/shell/src/main.ts`
- `apps/shell/src/App.vue` or a minimal shell startup gate component/page if needed.
- `apps/adaccounts/src/api/smit-connect.ts` or a shared/shell-accessible extension proxy helper, depending on final split.
- `.claude/features/auth-flow.md`
- `docs/system-architecture.md`
- `docs/codebase-summary.md`

## Evaluated approaches

### Approach A — MVP parity, additive shared-store session state (recommended)

Restore only the old contract that product logic needs:

- Load `/auth` and `/product` after successful `/public/authentication`.
- Store `manager`, `features`, `products`, `session_actived`.
- Add actions for `refreshEntitlements()`, `activateProSession()`, `useNormalSession()`.
- Add derived booleans such as `hasUsableFeature(code)` and `requiresProSession(code)` only if immediately used.
- Implement check-hash gate as a small startup service.

Pros:

- Closest to actual missing business logic.
- Avoids dragging old UI and loading progress into new architecture.
- Unit-testable.
- Smallest useful change.

Cons:

- Requires careful shared-store type design.
- Still needs minimal UI/error surface for session prompt and hash failure.

### Approach B — Full legacy parity

Port old loading/auth/session behavior almost entirely.

Pros:

- Maximum behavior parity with v6.
- Less product ambiguity if old UI remains desired.

Cons:

- High risk of bringing legacy complexity into MFE shell.
- Conflicts with current feature docs that intentionally retired role/feature gating.
- More files, more UI debt, harder tests.

### Approach C — Documentation only

Only document gaps and defer implementation planning.

Pros:

- Safest; no code impact.
- Useful if backend contracts are not confirmed.

Cons:

- Does not move the product toward working Pro/normal session behavior.
- Startup check-hash remains missing.

## Final recommendation

Choose **Approach A: MVP parity** with **startup check-hash gate**.

Reasoning:

- The repo already has a clean startup hydrate; do not replace it.
- The missing piece is not generic auth; it is Adscheck entitlement/session state.
- The old check-hash flow is concrete and bounded; port it as a gate with retry/error UI.
- Avoid full legacy UI unless real user testing says the old modal behavior is required.

## Proposed implementation shape

### Auth/session data model

Additive shared types, example shape:

```ts
interface AdscheckFeature {
  code: string;
  has_expired?: boolean;
  usable?: boolean;
  [key: string]: unknown;
}

interface AdscheckManager {
  session_actived?: boolean;
  session_used?: number;
  session_limited?: number;
  user?: { is_activated_free?: boolean };
  features?: AdscheckFeature[];
  [key: string]: unknown;
}

interface AdscheckProductResponse {
  success?: boolean;
  error?: boolean;
  products?: unknown;
  [key: string]: unknown;
}
```

Keep unknown fields for backend compatibility, but do not over-model every legacy field.

### Auth/session actions

Add to auth store or a separate shared-store module after planning verifies boundaries:

- `hydrateUser()` keeps current `/public/authentication` behavior.
- `loadEntitlements()` calls `/auth` and `/product` when authenticated.
- `refreshEntitlements()` rechecks `/auth` and detects lost Pro session.
- `activateProSession()` posts `/sessions/active`, updates manager.
- `useNormalSession()` records normal/free session choice.
- `clearSessionChoice()` optional only if needed by UI.

### Check-hash gate

Prefer a small shell-startup service:

- Detect extension and manifest.
- Call `/public/tools/check-hash` through shared API client.
- Ask extension for `chrome.runtime.getURL(path)`.
- Fetch local extension file through extension messaging.
- Compute MD5 and compare.
- Return a typed result:
  - `valid`
  - `extension_missing`
  - `hash_mismatch`
  - `api_error`
  - `extension_error`

Important design concern: current extension proxy helper lives in `apps/adaccounts/src/api/smit-connect.ts`. Shell startup cannot import from the remote. Plan should decide one of:

1. Move/add minimal extension messaging helper to a shell-local file.
2. Add a new shared utility package entry only if allowed and worth the shared impact.
3. Duplicate a tiny shell-only extension detector for startup gate.

Recommended for MVP: **shell-local helper first**, then extract later only when two apps need the exact same helper. This follows KISS/YAGNI.

### Startup behavior

`apps/shell/src/main.ts` should avoid white-screen:

```text
create app + pinia
run auth hydrate + entitlement load
run check-hash gate
mount app
if gate fails, app renders a small shell-owned error/retry screen
```

Implementation detail can be either:

- Store startup gate state in a small shell-local composable/store, then `App.vue` chooses between error screen and router-view.
- Or keep pre-mount async and mount a dedicated error app state.

Recommended: mount app and render a shell-owned startup gate error state. This gives retry without full page reload.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Backend `/auth` shape differs from old assumptions | Type drift/runtime break | Use permissive additive interfaces; pin only fields used by UI |
| Startup hash gate blocks app when extension unavailable | User cannot enter app | Clear error screen with install/enable instructions and Retry |
| Shell imports adaccounts extension helper | MFE boundary leak | Use shell-local minimal helper first |
| Shared-store change affects all remotes | Runtime singleton risk | Additive only, focused tests |
| Mixed shared/app changes in one commit/PR | Violates repo governance | Plan should split commits/PRs if implementation touches both |
| Full feature gating reintroduced accidentally | Scope creep | Do not gate routes; only expose session state and actions |

## Validation strategy

Focused checks:

- `pnpm --filter @mf2/shared-store test`
- `pnpm --filter @mf2/shell typecheck`
- `pnpm verify:features`
- `pnpm verify:all` if shared/app boundaries are touched.

Test cases to plan:

- `/public/authentication` unauthenticated: no entitlement calls, app still renders unauth state.
- Authenticated: calls `/auth` + `/product`, maps features usable status.
- `/auth.session_actived=false`: store exposes Pro session not active.
- `activateProSession()` success updates session fields.
- `useNormalSession()` persists the normal-session choice.
- Check-hash success passes gate.
- Check-hash mismatch fails gate.
- Extension missing fails gate with actionable error.
- API timeout/network error fails gate but supports retry.

## Success metrics

- Current lightweight auth still passes existing tests.
- New Adscheck session state can distinguish Pro session active/inactive.
- Startup gate blocks invalid/missing extension with clear retry path.
- No legacy full UI/progress code is ported unnecessarily.
- Feature docs match code after implementation.

## Next steps

1. Create `/ck:plan` from this report.
2. In the plan, decide exact file ownership and PR/commit split for shared vs app changes.
3. Confirm backend response shapes if sample payloads are available; otherwise keep types permissive.
4. Implement in phases with tests and docs update.

## Unresolved questions

- Exact `/auth`, `/product`, and `/sessions/active` response shapes should be confirmed with live payloads if available.
- Whether normal-session choice should keep legacy key `setting_use_free` or use a namespaced key such as `smit.adscheck.use-normal-session` needs product compatibility decision during planning.
- Whether hash gate should block all shell routes or only Adscheck Pro routes is currently approved as startup gate, so plan should assume all shell startup until Sếp changes scope.
