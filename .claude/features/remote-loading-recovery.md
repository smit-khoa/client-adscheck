---
slug: remote-loading-recovery
remote: shell
route: /adscheck-pro/* (adaccounts remote branch)
roles: []
feature_flag: n/a
status: done
---

## Purpose
Load Module Federation remotes lazily, show a loading fallback during fetch, and recover gracefully (with manual retry) when a remote chunk fails to load.

## Flow
1. Shell navigates into a remote branch -> router guard registers the remote's child routes (./routes) once.
2. RemoteHost wraps the remote render in RemoteErrorBoundary + Suspense.
3. While the remote chunk loads -> Suspense fallback is screen-reader-only text, not the old branded spinner.
4. Remote JS error -> onErrorCaptured stops propagation, shows error panel with Retry.
5. Retry increments retryKey -> Suspense subtree remounts -> remote reloads.

## Entry points / Routes
- See frontmatter `route`; main entry is the documented route/action for this feature.

## Files (MANDATORY — real paths, verified to exist)
- apps/shell/src/components/RemoteHost.vue — error boundary + Suspense + <router-view> for remote child routes
- apps/shell/src/router/remote-routes.ts — installRemoteRoutes: lazy addRoute per remote, idempotent, deep-link safe
- packages/shared-ui/src/components/RemoteErrorBoundary.vue — onErrorCaptured, retryKey slot prop
- packages/shared-ui/src/components/RemoteLoadingFallback.vue — legacy branded Suspense fallback; exported for compatibility but no longer rendered by current shell RemoteHost
- apps/shell/src/remotes.d.ts — hand-written module declarations for `<remote>/App` and `<remote>/routes`; stable offline fallback when MF `dts.consumeTypes` has no running remote to fetch from (e.g. isolated CI typecheck)
- apps/{shell,adaccounts,ads-manager}/rspack.config.ts — MF `dts`: remotes generate types via `vue-tsc` (`./App` is a `.vue` SFC), shell consumes them over HTTP from running remotes; generated types land in gitignored `@mf-types/`; dev shell also proxies `/remotes/<segment>/*` to localhost remotes.
- apps/shell/dev-proxy-config.ts — builds dev/prod remote manifest URLs from `owners.json`; dev uses shell same-origin proxy paths, prod uses `BASE_PATH`-relative paths.
- packages/shared-ui/src/remote.ts — narrow public entrypoint for `RemoteErrorBoundary` + `RemoteLoadingFallback` (`@mf2/shared-ui/remote`)
- apps/{adaccounts,ads-manager}/rspack.config.ts — production remotes split non-singleton vendor deps (`reka-ui`, table deps, form deps, generic vendor) and enforce 300KB per-asset budget; `maxEntrypointSize` allows the combined entrypoint to exceed one-asset budget because the repo policy is per emitted asset, not per entrypoint sum.
- apps/{shell,adaccounts,ads-manager}/rspack.config.ts — `lazyCompilation: false` (see gotcha below)

## APIs used
- none (loads remote chunks via MF mf-manifest.json, not the gateway)

## State
- See `## Flow` and `## Files` for the stores/composables involved; no additional state notes recorded yet.

## Permissions / Flags
- See frontmatter `roles` and `feature_flag`; no additional permission notes recorded yet.

## Verification
- Run `pnpm verify:all` plus the relevant app/package typecheck/build after changing this feature.

## Related
[[role-feature-gating]] [[auth-flow]]

## Decisions / Gotchas
- Remote routes are registered via a global `beforeEach` guard (not parent `beforeEnter`): a deep-link to a not-yet-registered child path falls into the catch-all until child routes are injected, which `beforeEnter` would miss. Match is by root base path (`/adscheck-pro`), then the navigation is re-resolved.
- `registered` Set guarantees addRoute runs once per remote even across repeated back/forward navigation (no duplicate routes).
- retryKey is the recovery primitive: bumping it remounts the Suspense subtree, which re-runs the remote loader.
- Remote host imports `RemoteErrorBoundary` from `@mf2/shared-ui/remote` and intentionally does not render `RemoteLoadingFallback`; product shell reset should not show the old branded loading spinner.
- AppLayout renders remote child routes for remote branches. It may show the shell `WorkspaceContent` placeholder on plain `/home`, but must not hide `/adscheck-pro/*` content.
- Dev remote URLs use shell same-origin proxy paths (`https://dev.smit.team:<owners.shell.port>/remotes/<segment>`). The browser only talks to the HTTPS shell origin; shell devServer forwards the request to the HTTP localhost remote. This avoids Chrome Private Network Access blocking while keeping the shell port centralized in `owners.json`.
- Remote production builds use `splitChunks` only for non-singleton vendor deps. Do NOT move MF singleton packages (`vue`, `vue-router`, `pinia`, `@mf2/shared-*`, `vue-sonner`) out of `ModuleFederationPlugin.shared`; splitting those through generic vendor chunks can break runtime instance sharing.
- Performance budget is per emitted asset (`maxAssetSize: 300_000`). Entrypoint sum can exceed 300KB because it is multiple chunks; keep `maxEntrypointSize` higher than per-asset budget to avoid false warnings.
- rspack `lazyCompilation` MUST stay disabled (top-level config, NOT `experiments.lazyCompilation`). Its web default `{ imports: true }` defers compiling dynamic imports until a runtime trigger request. MF remotes load as dynamic imports across origins (HTTPS shell → HTTP localhost remote); the cross-origin compile trigger never completes, so `import()` hangs and the remote sits on RemoteLoadingFallback forever (no error → error boundary never fires). Symptom: page stuck on loading spinner, all network 200, chunks named `*lazy-compilation-proxy*`.
