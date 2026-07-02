---
slug: role-feature-gating
remote: shell
route: n/a
roles: []
feature_flag: n/a
status: retired
---

## Purpose

Historical note for the removed shell role/feature gating idea. The current app no longer performs client-side auth role checks, business feature checks, or protected remote gating.

## Flow

Retired. Remote routes render through `RemoteHost` without role/feature props. Auth only hydrates the current user at startup; it does not fetch businesses, roles, onboarding, or feature flags.

## Entry points / Routes

- No active route or entry point.

## Files (MANDATORY — real paths, verified to exist)

- apps/shell/src/components/RemoteHost.vue — remote error boundary + Suspense + `<router-view>` only; no role/feature gating.
- apps/shell/src/router/index.ts — remote routes at `/adscheck-pro/adaccounts` and `/home/ads-manager` with only `name` props.
- packages/shared-store/src/auth-store.ts — current auth store exposes user hydrate state only; no `hasRole`/`hasFeature`.

## APIs used

- none.

## State

- none. Role/business/onboarding state was removed from `useAuthStore`.

## Permissions / Flags

- none in client. Gateway/API backend remains responsible for authorization.

## Verification

- Run `pnpm verify:features` to ensure the retired doc still references real files.
- Run `pnpm --filter @mf2/shared-store test` after auth store changes.

## Related

[[auth-flow]] [[remote-loading-recovery]]

## Decisions / Gotchas

- Do not reintroduce client-side role/feature gating unless Sếp explicitly asks for a new auth/business authorization flow.
- Any future authorization must be planned as a new feature and should not reuse the retired `hasRole`/`hasFeature` assumptions.
