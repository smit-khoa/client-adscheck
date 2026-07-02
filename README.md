# SMIT Agency Client — Vue 3 Micro-frontend

Base micro-frontend platform for SMIT Agency, built with Vue 3 Composition API, TypeScript, Tailwind CSS v4, and Module Federation 2.0. Focuses on lightweight, scalable architecture for lazy-loading remote applications.

**Status:** Prototype complete. Shell + Adaccounts remote functional with real TKQC list/tools and advanced BM data loading via SMIT Connect extension; Ads Manager placeholder. Production-ready bundle optimization.

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Vue 3.5 (Composition API, `<script setup>`) |
| **Language** | TypeScript 5.6 |
| **Bundler** | Rspack 1.0 (via @rspack/cli) |
| **Module Federation** | @module-federation/enhanced 0.8 |
| **Router** | vue-router 4.0 |
| **State** | Pinia 3.0 (setup store pattern) |
| **UI** | Tailwind CSS v4 + shadcn-vue (reka-ui Primitive) |
| **Build Orchestration** | Turborepo 2.9.16 (task caching, affected-graph) |
| **Package Manager** | pnpm 10.11 (workspaces) |
| **Node** | ≥20 |

## Architecture

> Ports below are illustrative. The single source of truth for dev host/port is
> [owners.json](owners.json) at the repo root (gitignored, per-machine — copy
> `owners.example.json`) — change a port there and it propagates everywhere.

```
Shell (port 8301, HTTPS)
  ├─ Pinia + vue-router (host)
  ├─ shared-store (auth-store, layout-store, api-client)
  ├─ shared-ui (icon sprite, buttons, cards, design tokens)
  └─ shared-types (User, AuthenticationResponse, RemoteStatus)
      │
      ├─→ Adaccounts Remote (port 3010, HTTP, lazy-load)
      │    └─ App.vue + AdAccountsPage (basic TKQC + advanced BM loading)
      │
      └─→ Ads Manager Remote (port 3002, HTTP, lazy-load)
           └─ App.vue (coming-soon placeholder)
```

**MF2 Contract:**
- Shell exports nothing (consumer only)
- Remotes expose `./App` (standalone entry) **and** `./routes` (`RouteRecordRaw[]`, child routes)
- Shell injects the adaccounts remote's `./routes` under `/adscheck-pro` on first navigation (dynamic `addRoute`)
  - Product routing: `/home`, `/adscheck-pro/adaccounts`, `/adscheck-pro/businesses`, `/adscheck-pro/page`, `/adscheck-pro/pixel`
  - Legacy `/app/*` and unknown paths redirect to `/home`
- Shared singletons: `vue`, `vue-router`, `pinia`, `@mf2/shared-*` (eager)
- Remote shared non-eager + requiredVersion:false (workspace packages)

## Quick Start

### Installation

```bash
pnpm install
```

`owners.json` (dev host/port per app) is gitignored, so a fresh clone or new
`git worktree` won't have it. `pnpm install` runs a `postinstall` step
([scripts/ensure-owners.mjs](scripts/ensure-owners.mjs)) that auto-creates it —
copied from the main worktree's `owners.json`, or from `owners.example.json` as
fallback. Edit ports there if the defaults clash.

### Development (all apps in parallel)

```bash
pnpm dev
```

Starts the shell (HTTPS) + every remote (HTTP). Dev host/port for each app comes from
[owners.json](owners.json) at the repo root — the one place to change a port.

Edit `.env.local` per app to override `DASHBOARD_URL` or a remote URL (`<APP>_REMOTE_URL`). API gateway is resolved at runtime from the current domain suffix (`gateway.smit.team` / `gateway.smit.vn`).

### Development (individual apps)

```bash
pnpm dev:shell
pnpm dev:adaccounts
pnpm dev:ads-manager
```

### Build (all apps via Turborepo)

```bash
pnpm build
```

Runs `turbo run build` for the selected app(s), then mirrors those selected outputs into sibling directory `../client-adscheck-deployment` using the production same-origin layout: shell at root, remotes under `/adaccounts/` and `/ads-manager/`. Turborepo caches outputs, skipping unchanged apps.

### Type Check (via Turborepo)

```bash
pnpm typecheck
```

Runs `turbo run typecheck` (all workspaces, workspace deps first). Vue TSC strict mode enforced. CI gates PRs with affected-only filter: `turbo run typecheck build --filter=...[origin/main]`.

### Preview Built Artifacts

```bash
pnpm preview
```

Serves all apps on allocated ports (useful before deploy).

## Folder Structure

```
client/
├── apps/
│   ├── shell/                # Host shell (MF consumer)
│   │   ├── src/
│   │   │   ├── bootstrap.ts  # Entry, guards MF init
│   │   │   ├── main.ts       # createApp + Pinia + router
│   │   │   ├── router/      # index.ts (/adscheck-pro/*) + remote-routes.ts (dynamic addRoute)
│   │   │   ├── App.vue       # Root layout (SpriteProvider + router-view)
│   │   │   ├── styles.css    # Tailwind + theme tokens (oklch)
│   │   │   ├── components/   # AppLayout, AppHeader, ArcSidebar (2-item nav), RemoteHost
│   │   │   ├── pages/        # (orphan: CreateBusiness, QuickLogin)
│   │   │   └── composables/  # use-click-outside.ts
│   │   ├── dev-proxy-config.ts # Builds remote URLs from owners.json (dev) / BASE_PATH-relative (prod)
│   │   ├── owners.json        # Single source of truth: dev host/port per app (shell + remotes both read it)
│   │   └── rspack.config.ts   # MF host config (shared, remotes, optimization)
│   ├── adaccounts/           # Remote app — TKQC/BM/Page/Pixel workspace
│   │   └── src/
│   │       ├── App.vue
│   │       ├── pages/AdAccountsPage.vue
│   │       ├── features/workspace/         # tab frame, tab state, function panel slots
│   │       ├── features/adaccounts/        # TKQC table, list, selection, tools
│   │       ├── features/businesses/        # BM table, data loading, selection, BM tools
│   │       ├── features/page/              # Page tab loading/table/tools
│   │       ├── features/pixel/             # truthful empty Pixel placeholder
│   │       ├── components/tool-actions/    # generic tool-action UI shared inside the remote
│   │       ├── composables/tool-actions/   # generic tool-action composables
│   │       ├── api/                        # smit-connect, fb-token, fb-graph, tool runners
│   │       └── router/index.ts (./routes)
│   └── ads-manager/          # Remote app — Quản lý quảng cáo (coming-soon placeholder)
│       └── src/{App.vue, pages/AdsManagerPage.vue, router/index.ts (./routes)}
├── packages/
│   ├── shared-types/         # TS interfaces (User, AuthenticationResponse, RemoteStatus)
│   ├── shared-store/         # Pinia stores + API client
│   │   └── src/
│   │       ├── auth-store.ts # useAuthStore (startup user hydrate)
│   │       ├── layout-store.ts # Page title, header slot, sidebar state
│   │       └── api-client.ts  # Fetch wrapper, ApiError, runtime gateway resolver
│   └── shared-ui/            # Components + design system
│       └── src/
│           ├── icons/        # Sprite provider (90 lucide icons)
│           ├── components/   # Icon.vue, SmitLogo.vue, SmitLoading.vue, RemoteLoadingFallback.vue, RemoteErrorBoundary.vue, Button.vue, Card.vue
│           └── lib/          # utils.ts (cn), colors.ts (design tokens)
├── package.json              # Root scripts (dev, build, typecheck, clean)
└── tsconfig.base.json        # Shared TS config
```

## Key Features

### Routing

Product routes live at the root level:
- `/` redirects to `/home`.
- `/home` renders a shell placeholder.
- `/adscheck-pro` redirects to `/adscheck-pro/adaccounts`.
- `/adscheck-pro/adaccounts`, `/adscheck-pro/businesses`, `/adscheck-pro/page`, and `/adscheck-pro/pixel` lazy-load the adaccounts remote and activate the matching workspace tab.
- `/ads-save`, `/super-target`, `/support`, `/settings`, and `/account` render shell placeholders until those features are implemented.
- Legacy `/app/*` and unknown paths redirect to `/home`.

**Startup auth hydrate:**
1. Shell creates Pinia in `main.ts`.
2. `auth.hydrateUser()` calls `/public/authentication` before app mount.
3. The response is normalized from `{ isLogin, user, last_visit }` or legacy `{ user }`.
4. `useAuthStore()` stores `user`, `is_authenticated`, `auth_checked`, `last_visit`, and `is_loading=false` for all remotes.
5. The app mounts whether the user is authenticated or not; no business/role/onboarding flow runs.

### Role & Feature Gating (Retired)

Client-side role/feature gating was removed from the shell auth flow. Remote access is not gated by `hasRole`/`hasFeature`; the gateway/API remains the security boundary.


### Adaccounts Facebook Data

The adaccounts remote renders a remote-owned workspace with four tabs:
- **TKQC:** real ad-account list and two-panel selected-account tool workflow via the SMIT Connect extension.
- **BM:** BM data loading plus two-panel prototype BM tools.
- **Page:** prototype Page loading/table UI plus two-panel UI-only Page tools.
- **Pixel:** truthful empty placeholder; no fake data or API calls.

BM loading is base-first: `fetch-bm-base` renders BM rows, then enabled advanced groups call their feature API wrappers. Toggles control real API calls, not only visual columns. Results merge by `bmId` and use session-only cache keys `bm:{bmId}:{group}`. Components call `use-bm-data-loader`; they never call Facebook APIs directly.

The BM table keeps 21 source-facing columns. Product decisions exclude `BM tên hiển thị phụ`, `Ghi chú`, and `Hoạt động`; detail/debug payloads such as `pageDetail`, `instagramDetail`, `accountShareDetail`, `adminDetail`, and `adminViewerId` are not stored or displayed.

### Remote Error Recovery

RemoteHost + RemoteErrorBoundary provide:
- Suspense-based loading fallback (RemoteLoadingFallback.vue)
- onErrorCaptured for remote JS errors
- Manual retry via retryKey (remounts the Suspense subtree to reload the remote)

API request timeouts live in the shared api-client (`api({ timeout_ms })`, default 15s), not in the error boundary.

### Icon Sprite System

90 lucide icons compiled into a single SVG sprite (sprite-symbols.ts). Consumed via Icon.vue `<use>` tag. Reduces HTTP requests + inlines small SVG data.

## Bundle Optimization

**Performance Budget:** 300KB max per-asset size (rspack `performance` hint, warnings in production). This is a per-asset budget — no single chunk exceeds it; total JS across chunks is larger.

**Actual Sizes (production build, uncompressed JS, gzip is far smaller):**
- Vendor chunk: ~169KB (vue, vue-router, pinia, reka-ui)
- MF runtime: ~82KB (ModuleFederation setup)
- Shell entry (main): ~40KB
- Lazy chunk: ~27KB
- Total shell JS: ~317KB across chunks (no single asset over the 300KB per-asset budget)

**Techniques:**
- `runtimeChunk` isolated (avoids vendor cache invalidation)
- `splitChunks` with cacheGroups (mfRuntime priority 30 > vendor 10)
- Tree-shaking enabled (ES6 imports, no CommonJS fallback)
- CSS inlined via postcss-loader (no separate CSS file for dev)
- RemoteLoadingFallback CSS is pure (no animation libraries)

Remote apps (adaccounts, ads-manager) are lazy-loaded; initial shell load is ~300KB total.

## Deployment

Each app builds independently to `dist/`. Deploy strategy:

1. **Shell (host):** Deploy to primary CDN/S3 + CloudFront (update on every build)
2. **Remotes (adaccounts, ads-manager):** Deploy to secondary CDN/S3 + enable versioning (update on every build; shell always fetches latest via mf-manifest.json)
3. **Update config:** Modify `dev-proxy-config.ts` → `app_urls` to point production CDN URLs

Remote URL resolution:
- **Dev:** localhost host/port from [owners.json](owners.json) at the repo root
- **Production:** Environment variables `ADACCOUNTS_REMOTE_URL`, `ADS_MANAGER_REMOTE_URL` (loaded at build time or runtime via global defines)

No shared state between remotes. Each remote fetches its own data from API gateway. Shell orchestrates (will orchestrate: auth + layout when enabled).

## Development Workflow

### Adding a New Feature

1. **Shell feature** (navigation, layout, auth flow):
   - Add route in `src/router/index.ts`
   - Create component in `src/components/` or `src/pages/`
   - Use `useAuthStore()` for auth checks, `useLayoutStore()` for page title
   - Import shared-ui components (Button, Card, Icon, etc.)

2. **Shared library** (icon, utility, type):
   - Add to `packages/shared-ui/src/` or `packages/shared-types/src/`
   - Update `packages/*/src/index.ts` exports
   - Reimport in app if needed (pnpm workspace resolution automatic)

3. **Remote app** (home, ads_asset):
   - Develop in `apps/{remote}/src/` (layer convention created on demand — see `.claude/features/README.md`)
   - Expose `./App` (standalone entry) and `./routes` (child routes) — MF contract
   - Shell mounts `./routes` into RemoteHost; gating + error boundary handled at the host

### Testing

Unit tests run via `pnpm turbo run test`. Current coverage:
- `@mf2/shared-store` (jsdom): api-client, auth-store, layout-store
- `@mf2/shared-ui` (jsdom): data-grid composables, copy-preset persistence

`@mf2/adaccounts` pure-logic tests (runners, token helpers, stores) are pending restoration after the workspace-tab port. Do not expand FB automation logic before restoring them. CI gate (`turbo run test --filter=...[origin/main]`) and Playwright e2e are still pending.

### Debugging

1. **Type errors:** `pnpm typecheck`
2. **Build errors:** `pnpm build` (check dist/ or rspack output)
3. **Runtime errors:** Browser console (dev mode shows unminified stack traces)
4. **MF issues:** Check `__@mf-types__/*.d.ts` (auto-generated), `mf-manifest.json`, `remoteEntry.js`
5. **Remote load failure:** Check Network tab (CORS? HTTPS/HTTP mix?), RemoteErrorBoundary boundary in console

## Environment Variables

**Shell (apps/shell/):**
- API gateway is resolved at runtime from the current hostname suffix: `https://gateway.<last-two-labels>`.
- `DASHBOARD_URL` (default: https://dashboard.smit.team) — logout redirect

**Dev host/port** ([owners.json](owners.json) at the repo root) — single source of truth, read by
the shell (remote URLs) and each remote's `rspack.config.ts` (its own dev server). Change a port here only.

Override a remote URL per app via `.env.local` (`<APP>_REMOTE_URL`, e.g. `ADACCOUNTS_REMOTE_URL`).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Module not found in shell** | Check `tsconfig.base.json` paths, ensure package exports in `package.json` main/types |
| **Remote not loading (gray 404)** | Verify remote dev server is running, check `dev-proxy-config.ts` URL, inspect Network tab for CORS errors |
| **Mixed content (HTTPS shell + HTTP remote)** | Chrome secure-context exception allows http://localhost in development; production requires both HTTPS |
| **Pinia store undefined** | Ensure app.use(createPinia()) before app.mount() in main.ts; import useAuthStore() inside <script setup> |
| **Icons not showing** | Check SpriteProvider is parent of app in App.vue; ensure Icon.vue sprite href matches sprite-symbols.ts export |
| **Build fails with MF error** | Clear `.rspack_cache` and `@mf-types/` directory, run `pnpm clean`, retry |

## Contributing

1. Follow code standards in `./docs/code-standards.md`
2. Use Composition API + `<script setup>` for new components
3. Keep components focused (≤150 LOC per file)
4. No console.logs in production code
5. Test auth flow changes thoroughly (affects all routes)

## Related Documentation

- **[System Architecture](./docs/system-architecture.md)** — MF2 flow, remote lifecycle, auth patterns
- **[Code Standards](./docs/code-standards.md)** — naming, style, patterns
- **[Deployment Guide](./docs/deployment-guide.md)** — CDN strategy, environment setup
- **[Project Roadmap](./docs/project-roadmap.md)** — planned features, milestones

## License

Proprietary — SMIT Agency
