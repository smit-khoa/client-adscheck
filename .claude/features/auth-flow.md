---
slug: auth-flow
remote: shell
route: n/a (startup hydrate)
roles: []
feature_flag: n/a
status: done
---

## Purpose

Hydrate the current SMIT user when the shell starts, then load the minimum Adscheck entitlement/session state for authenticated users. Every remote reads the same auth/session state from the `@mf2/shared-store` singleton.

## Flow

1. `apps/shell/src/main.ts` creates Vue app, Pinia, router, mounts immediately, then calls `useStartupGate().runStartupChecks()`.
2. `runStartupChecks()` calls `auth.hydrateUser()`.
3. `hydrateUser()` GET `/public/authentication` with cookies included.
4. Response is normalized from either real gateway shape `{ isLogin, user, last_visit }` or legacy `{ user }`.
5. Store sets `user`, `is_authenticated`, `auth_checked`, `last_visit`, and `is_loading=false`.
6. If authenticated, shell calls `auth.loadEntitlements()` exactly once for the startup cycle.
7. `loadEntitlements()` calls `GET /ads-check/auth` and `GET /ads-check/product` in parallel, stores manager/features/products, and maps each feature to include `usable: !has_expired`.
8. If authenticated and `session_actived=false` and `use_normal_session=false` (and `adscheck_manager` is non-null), shell shows `SessionSelectionDialog` — a blocking modal awaiting user choice.
9. User chọn Pro → `POST /ads-check/sessions/active`; thành công → dialog đóng, startup tiếp tục. Thất bại server-side → inline error, cho retry hoặc chuyển Normal. User chọn Normal hoặc dismiss (X) → `useNormalSession()` (persists localStorage) → dialog đóng.
10. Shell chạy SMIT Connect check-hash startup gate trước khi render các route thông thường.

There is no business selection, role loading, onboarding loading, introduction redirect, or protected-route wrapper in the current auth flow. Adscheck Pro/normal session state is exposed to callers but does not gate routes in this MVP.

## Entry points / Routes

- Startup entry: `apps/shell/src/main.ts` -> `useStartupGate().runStartupChecks()`.
- Auth store: `packages/shared-store/src/auth-store.ts`.
- Current router remains simple: `/` -> `/home` -> remotes.

## Files (MANDATORY — real paths, verified to exist)

- apps/shell/src/main.ts — mounts app early, installs router, runs startup checks after mount.
- apps/shell/src/composables/use-startup-gate.ts — startup orchestration: SMIT hydrate, entitlement load, check-hash gate.
- apps/shell/src/App.vue — renders startup loading/error gate before normal router view.
- apps/shell/src/components/StartupGateError.vue — retryable startup gate error UI.
- apps/shell/src/components/SessionSelectionDialog.vue — blocking startup session-type dialog with white rounded panel, decorative session illustration, two full-width CTA buttons, and slot-count footer; 2 UI states: normal (slots available) and full-slot (Pro button disabled). Stateless — parent drives open/loading/error via props.
- apps/shell/src/services/check-hash-gate.ts — posts manifest to check-hash API and verifies extension file MD5 hashes.
- apps/shell/src/services/smit-connect-extension.ts — shell-local minimal SMIT Connect extension messaging helper.
- packages/shared-store/src/auth-store.ts — single auth flow, Adscheck entitlement/session state, `hydrateUser`, `loadEntitlements`, `activateProSession`, `useNormalSession`, `logout`.
- packages/shared-store/src/api-client.ts — `api()`: runtime gateway resolver, timeout, error classification, centralized 401 handler with scoped suppression option.
- packages/shared-types/src/index.ts — `User`, `AuthenticationResponse`, Adscheck entitlement/session response types, `RemoteStatus`.

## APIs used

- GET /public/authentication -> `{ isLogin?: boolean, user?: User | null, last_visit?: string }`
- GET /ads-check/auth -> Adscheck manager/session response with `features`, `session_actived`, `session_used`, `session_limited` and permissive extra fields.
- GET /ads-check/product -> Adscheck product response, stored permissively for future UI.
- POST /ads-check/sessions/active -> `{ success?: boolean, message?: string }`; on success store marks Pro session active and increments numeric `session_used`.
- POST /public/tools/check-hash -> `{ success?: boolean, fileHash?: Array<{ path: string, hash: string }>, message?: string }`.

## State

SMIT login:

- `user: User | null`
- `is_authenticated: boolean`
- `auth_checked: boolean`
- `last_visit: string | null`
- `is_loading: boolean`
- `auth_error: boolean`

Adscheck entitlement/session:

- `adscheck_manager: AdscheckManager | null`
- `adscheck_features: AdscheckFeature[]`
- `adscheck_products: AdscheckProductResponse | null`
- `entitlements_checked: boolean`
- `entitlements_loading: boolean`
- `entitlements_error: boolean`
- `use_normal_session: boolean`
- `is_pro_session_active: boolean`

## Permissions / Flags

- No route protection, role checks, business checks, or feature gating are enabled by auth.
- Gateway remains the real security boundary.
- `useNormalSession()` persists legacy `localStorage.setting_use_free = "1"` for v6 parity.
- `activateProSession()` persists `setting_use_free = "0"` after successful Pro activation.

## Verification

- Unit tests: `pnpm --filter @mf2/shared-store test` — `api-client`, `auth-store` startup hydrate and entitlement/session actions.
- Shell gate tests: `pnpm --filter @mf2/shell test` — `check-hash-gate` missing extension, API error, extension error, mismatch, valid states.
- Typecheck: `pnpm --filter @mf2/shared-store typecheck` and `pnpm --filter @mf2/shell typecheck`.
- Run `pnpm verify:features` after updating this doc.

## Related

[[remote-loading-recovery]] [[role-feature-gating]] [[shell-startup-check-hash-gate]]

## Decisions / Gotchas

- Session selection dialog blocks startup between `loadEntitlements` and the hash gate. Skip conditions: `!is_authenticated`, `session_actived=true`, `use_normal_session=true`, or `adscheck_manager=null` (entitlements failed). In skip cases user proceeds silently.
- Session selection dialog UI intentionally follows the provided white-card mockup: decorative session illustration, Pro CTA, normal-session CTA, and slot-count footer. Behavior remains unchanged and stateless.
- Full slot (`session_used >= session_limited`): Pro button disabled; user must pick Normal. Slot refresh only on next app restart.
- Dialog dismiss (X) is equivalent to choosing Normal — calls `useNormalSession()` to persist localStorage so the dialog is skipped on next startup.
- `loading_pro` / `pro_error` state lives in `use-startup-gate.ts` (module-level refs); parent (`App.vue`) threads them as props into `SessionSelectionDialog`. Component remains stateless.
- There is one SMIT login flow only: startup `hydrateUser()`.
- `hydrateUser()` intentionally does not call `loadEntitlements()`; shell startup owns orchestration to avoid duplicate entitlement calls during retry/startup flows.
- `hydrate_promise` dedupes concurrent startup hydrate calls; `entitlements_promise` dedupes concurrent entitlement calls.
- `/public/authentication` uses scoped 401-handler suppression so unauthenticated startup hydrate does not redirect before the app mounts. Normal API calls still trigger centralized logout on 401.
- Adscheck Pro/normal session is separate from SMIT login and Facebook browser session. Do not mix their state or docs.
- Gateway host is resolved at runtime by domain suffix for every hostname: `https://gateway.<last-two-labels>`. There is no localhost/loopback special case, and this intentionally follows the legacy `.team`/`.vn` behavior rather than supporting arbitrary ccTLD/single-label domains.
- `API_GATEWAY_URL` no longer controls runtime gateway selection for the shell; `DASHBOARD_URL` still controls logout redirect.
- `AuthLayout`, auth business selection, role fetching, and onboarding fetching were removed from the shell auth flow.
- api-client must NOT import auth-store; auth-store registers the 401 handler to avoid an import cycle.
