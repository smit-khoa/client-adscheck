---
phase: 3
title: "Remote registration and Adscheck tab deep-links"
status: completed
priority: P1
dependencies: [2]
---

# Phase 3: Remote registration and Adscheck tab deep-links

## Overview

Update Module Federation remote route registration to target root-level remote branches, then expose Adscheck Pro tab child routes so reload/deep-link activates the correct workspace tab.

## Requirements

- Functional: shell remote guard recognizes `/adscheck-pro` and `/adscheck-pro/*` as adaccounts remote branch.
- Functional: `/adscheck-pro` redirects to `/adscheck-pro/adaccounts`.
- Functional: adaccounts remote exposes child routes for `adaccounts`, `businesses`, `page`, `pixel`.
- Functional: user tab switch updates browser URL.
- Functional: reloading any valid tab URL activates the matching tab.
- Functional: invalid Adscheck Pro child path redirects to `/home`.
- Non-functional: keep router logic out of `WorkspaceTabFrame`.
- Non-functional: do not change tab labels or business logic.

## Architecture

Shell still owns remote boundary:

```text
/adscheck-pro/* -> AppLayout -> RemoteHost(name='adaccounts') -> adaccounts child route
```

Adaccounts remote owns tab route mapping:

```text
''           -> redirect adaccounts
'adaccounts' -> AdAccountsPage
'businesses' -> AdAccountsPage
'page'       -> AdAccountsPage
'pixel'      -> AdAccountsPage
```

`AdAccountsWorkspace` coordinates route and store:

- route changes set `workspaceTabs.activeTab` when path maps to a valid tab.
- tab click calls `router.push()` to matching canonical path.
- if current tab already matches route, no push.

## Related Code Files

- Modify: `apps/shell/src/router/remote-routes.ts`
- Modify: `apps/shell/src/remotes.d.ts` if route comments/types mention `/app`
- Modify: `apps/adaccounts/src/router/index.ts`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
- Modify: `apps/adaccounts/src/features/workspace/types/workspace.types.ts` if route helper types need export
- Optional create: `apps/adaccounts/src/features/workspace/workspace-tab-routes.ts`

## Implementation Steps

1. Change remote registry from `segment: 'adaccounts'` under `/app` to base path `/adscheck-pro`.
2. Update `pathTargetsRemote` to match root base paths exactly or as prefix with `/`.
3. Update adaccounts remote route array with child routes for each workspace tab.
4. Add a tab route mapping helper if it prevents duplicated strings.
5. In `AdAccountsWorkspace`, read `useRoute()` / `useRouter()`.
6. On route changes, set active tab from route path/name.
7. On `handleActiveTabUpdate`, push canonical tab path instead of only setting store.
8. Guard against navigation loops and duplicate navigation.
9. Run shell and adaccounts typechecks.

## Success Criteria

- [x] Deep-link `/adscheck-pro/adaccounts` loads remote and activates TKQC.
- [x] Deep-link `/adscheck-pro/businesses` loads remote and activates BM.
- [x] Deep-link `/adscheck-pro/page` loads remote and activates Page.
- [x] Deep-link `/adscheck-pro/pixel` loads remote and activates Pixel.
- [x] Switching tabs updates URL without full reload.
- [x] Invalid `/adscheck-pro/anything` redirects to `/home`.
- [x] `WorkspaceTabFrame.vue` has no router imports.
- [x] `pnpm --filter @mf2/shell typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.

## Risk Assessment

- Risk: shell guard does not run for deep-linked child route before remote child route exists. Mitigation: keep global `beforeEach` and match by raw path prefix.
- Risk: route watcher and tab click push loop. Mitigation: compare target path/tab before setting or pushing.
- Risk: invalid child path remains inside remote NotFound instead of `/home`. Mitigation: add child catch-all redirect to `/home` or shell-level catch behavior after route registration.
