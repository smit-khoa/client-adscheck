---
phase: 2
title: "Shell root routes and sidebar placeholders"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Shell root routes and sidebar placeholders

## Overview

Replace the shell `/app` route tree with root-level product routes. Sidebar links should point directly to canonical product URLs, and route phụ should render simple placeholders without adding real feature behavior.

## Requirements

- Functional: `/` redirects to `/home`.
- Functional: `/app/*` redirects to `/home`.
- Functional: unknown paths redirect to `/home`.
- Functional: `/adscheck-pro` redirects to `/adscheck-pro/adaccounts`.
- Functional: `/ads-save`, `/super-target`, `/support`, `/settings`, `/account` render placeholder content.
- Functional: sidebar uses canonical product paths, not `/app/${path}`.
- Non-functional: do not change shared-ui; keep shell changes app-local.
- Non-functional: keep placeholder simple and truthful.

## Architecture

Shell owns product route shell, placeholders, sidebar, and remote host boundaries:

```text
/                     -> redirect /home
/home                 -> AppLayout + shell placeholder
/adscheck-pro         -> redirect /adscheck-pro/adaccounts
/adscheck-pro         -> AppLayout + RemoteHost(name='adaccounts') parent branch
/ads-manager          -> AppLayout + RemoteHost(name='ads-manager') if retained
/ads-save             -> AppLayout + placeholder
/super-target         -> AppLayout + placeholder
/settings             -> AppLayout + placeholder
/support              -> AppLayout + placeholder
/account              -> AppLayout + placeholder
/app/:pathMatch(.*)*  -> redirect /home
/:pathMatch(.*)*      -> redirect /home
```

`AppLayout` should show shell placeholder only for shell placeholder routes, not for remote branches. This preserves the existing lesson that shell placeholder must not mask remote content.

## Related Code Files

- Modify: `apps/shell/src/router/index.ts`
- Modify: `apps/shell/src/components/AppLayout.vue`
- Modify: `apps/shell/src/components/ArcSidebar.vue`
- Optional modify: `apps/shell/src/components/WorkspaceContent.vue`
- Optional create: `apps/shell/src/pages/ShellPlaceholderPage.vue`
- Optional create: `apps/shell/src/router/product-routes.ts`

## Implementation Steps

1. Update shell route tree to use root-level paths.
2. Add or reuse a placeholder page for `/home` and route phụ.
3. Ensure route meta can drive placeholder title/description if using one component.
4. Update `AppLayout` placeholder logic so it keys off route meta or explicit shell route names, not `route.path === '/app'`.
5. Update sidebar nav item definitions:
   - Home: `/home`
   - Adscheck Pro: `/adscheck-pro/adaccounts`
   - Ads Save: `/ads-save`
   - Super Target: `/super-target`
   - Settings: `/settings`
   - Support: `/support`
   - Account: `/account`
6. Update sidebar active detection for root-level paths.
7. Run focused shell typecheck.

## Success Criteria

- [x] `/`, `/app/adaccounts`, and unknown paths redirect to `/home`.
- [x] `/home` renders a shell placeholder.
- [x] Route phụ placeholders render and do not mount remote content.
- [x] Sidebar links contain no `/app` prefix.
- [x] Sidebar active state works for root-level routes.
- [x] Remote branch placeholder masking is avoided.
- [x] `pnpm --filter @mf2/shell typecheck` passes.

## Risk Assessment

- Risk: catch-all redirect order captures remote branches. Mitigation: put catch-all after all concrete routes.
- Risk: AppLayout shows placeholder for remote routes. Mitigation: use explicit route meta/name for placeholders.
- Risk: active sidebar breaks for nested `/adscheck-pro/*`. Mitigation: active detection should match exact root item path or known prefix for Adscheck Pro.
