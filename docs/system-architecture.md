# System Architecture

Comprehensive guide to SMIT Client's micro-frontend architecture, data flow, and design patterns.

> **Note on ports:** Port numbers in the diagrams and examples below are illustrative.
> The single source of truth for each app's dev host/port is
> [`owners.json`](../owners.json) at the repo root (gitignored, per-machine — copy
> `owners.example.json` to create it) — change a port there and it
> propagates to the shell's own dev server (`owners.shell.port`), its remote URLs, and each
> remote's own dev server (`owners.remotes.<name>`). Do not treat the numbers in this doc as
> authoritative.

## High-Level Overview

```
┌────────────────────────────────────────────────────────────────┐
│ SMIT Client (Vue 3 Micro-frontend Platform)                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Shell Host (port 8301, HTTPS)                               │
│  ├─ Router (vue-router) — owns navigation                     │
│  ├─ Auth State (Pinia) — singleton, shared with remotes      │
│  ├─ Layout State (Pinia) — page title, header, sidebar       │
│  ├─ Shared UI (icons, buttons, cards) — singleton            │
│  └─ RemoteHost (gating + ErrorBoundary + Suspense + router-view) │
│                                                                │
│  ┌─ Remotes (lazy-loaded via Module Federation manifest) ────┤
│  │                                                             │
│  ├─ Adaccounts Remote (port 3010, HTTP)                       │
│  │  ├─ TKQC/BM/Page/Pixel workspace tabs                      │
│  │  ├─ Two-panel function architecture + FB extension data    │
│  │  └─ MF exposes ./App + ./routes                            │
│  │                                                             │
│  └─ Ads Manager Remote (port 3002, HTTP, placeholder)         │
│     ├─ pages/AdsManagerPage.vue (coming-soon)                 │
│     └─ MF exposes ./App + ./routes                            │
│                                                                │
│  ┌─ Shared Libraries (pnpm workspaces) ─────────────────────┤
│  │                                                             │
│  ├─ shared-types: User, AuthenticationResponse, RemoteStatus │
│  ├─ shared-store: auth-store, layout-store, api-client      │
│  └─ shared-ui: components, icon sprite, design tokens       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                               │
                               │ API calls (credentials:include)
                               ▼
                   gateway.smit.team / gateway.smit.vn (HTTPS)
                   └─ GET /public/authentication, GET /ads-check/auth, GET /ads-check/product
                      POST /public/tools/check-hash
```

---

## Module Federation 2.0 (MF2) Architecture

### Host Configuration

**Shell (rspack.config.ts):**

```javascript
new ModuleFederationPlugin({
  name: "shell_host",
  remotes: {
    adaccounts: "adaccounts@http://localhost:3010/mf-manifest.json",
    ads_manager: "ads_manager@http://localhost:3002/mf-manifest.json",
  },
  shared: {
    // Framework — eager, singleton (prevents version mismatch)
    vue: { singleton: true, eager: true, requiredVersion: "^3.5.0" },
    "vue-router": { singleton: true, eager: true, requiredVersion: "^4.0.0" },
    pinia: { singleton: true, eager: true, requiredVersion: "^3.0.0" },
    
    // Workspace packages — eager, singleton, no version check
    "@mf2/shared-types": { singleton: true, eager: true, requiredVersion: false },
    "@mf2/shared-ui": { singleton: true, eager: true, requiredVersion: false },
    "@mf2/shared-store": { singleton: true, eager: true, requiredVersion: false },
    // Stateful libs whose module state must cross the shell boundary
    "vue-sonner": { singleton: true, eager: true, requiredVersion: "^2.0.9" },
  },
})
```

**Why eager + singleton?**
- **Singleton:** Prevents multiple instances of Pinia, vue-router, etc. (critical for shared auth state)
- **Eager:** Loaded immediately with shell (not lazy), ensures auth-store ready before remotes initialize
- **vue-sonner singleton:** the toast queue lives in module state. Without sharing it, a remote bundles its own copy — `toast()` pushes to one emitter while `<Toaster>` listens on another → toasts never render in the shell. Rule: any stateful lib used across the MF boundary (event bus, toast queue, injection registry) must be a shared singleton in host AND every remote that uses it.

### Remote Configuration

**Adaccounts & Ads Manager (rspack.config.ts):**

```javascript
new ModuleFederationPlugin({
  name: "adaccounts",  // or "ads_manager"
  exposes: {
    "./App": "./src/App.vue",  // Shell imports via `adaccounts/App`
    "./routes": "./src/router/routes.ts",  // Child routes
  },
  shared: {
    // Same as host, but non-eager (loaded by host)
    vue: { singleton: true, requiredVersion: "^3.5.0" },
    pinia: { singleton: true, requiredVersion: "^3.0.0" },
    "@mf2/shared-*": { singleton: true, requiredVersion: false },
    "vue-sonner": { singleton: true, requiredVersion: "^2.0.9" }, // shared queue with shell
  },
})
```

### Manifest Resolution Flow

```
Shell loads (port 8301)
  ↓
MF Plugin loads mf-manifest.json
  ├─ GET http://localhost:3010/mf-manifest.json (adaccounts)
  └─ GET http://localhost:3002/mf-manifest.json (ads_manager)
  ↓
Manifest returns:
{
  "adaccounts": { "url": "http://localhost:3010", "exposes": { "./App": "...", "./routes": "..." } },
  "ads_manager": { "url": "http://localhost:3002", "exposes": { "./App": "...", "./routes": "..." } }
}
  ↓
On first navigation into /adscheck-pro/adaccounts:
  router guard imports adaccounts/routes and addRoute(...) under the named parent (once)
  ↓
  MF loads remoteEntry.js from http://localhost:3010
  ↓
  remoteEntry.js exports shared singletons (vue, pinia from host) + local code
  ↓
  Remote child route renders into RemoteHost's <router-view>, wrapped by Suspense + ErrorBoundary
```

---

## Authentication Flow

### Startup Hydrate Sequence

```
Browser loads shell (https://dev.smit.team:8301/)
  ↓
bootstrap.ts initializes MF, loads app
  ↓
main.ts creates Vue app + Pinia + router, then mounts app early
  ↓
useStartupGate().runStartupChecks()
  ├─ auth.hydrateUser() → GET /public/authentication
  │  ├─ 200 + { isLogin:true, user, last_visit } → user stored, is_authenticated=true
  │  ├─ 200 + { isLogin:false } or 401 via scoped suppression → user=null, is_authenticated=false
  │  └─ network/timeout → auth_error=true, app still continues to gate check
  ├─ auth.trackLastVisit('ads-check') → POST /public/last-visit with { last_visit: 'ads-check' }
  │  └─ fire-and-forget (catches errors internally, does not block startup)
  ├─ if authenticated: auth.loadEntitlements() → GET /ads-check/auth + GET /ads-check/product
  │  └─ stores Adscheck manager/features/products and maps usable=!has_expired
  ├─ checkSessionSelection() → blocks startup if adscheck_manager exists and !is_pro_session_active
  │  ├─ SessionSelectionDialog renders (Teleport to body, no Reka Dialog injection race)
  │  ├─ user clicks "Use Normal Session" → closes dialog, does NOT persist (popup reappears next reload)
  │  └─ user clicks "Activate Pro Session" → calls activateProSession()
  │     ├─ success → closes dialog, is_pro_session_active=true, proceeds to hash gate
  │     └─ fail (pro_error=true) → keeps dialog open, shows error message, user must retry
  └─ verifySmitConnectHashGate() → POST /public/tools/check-hash + extension-local MD5 checks
     ├─ valid → App renders normal router-view
     └─ missing/API/extension/hash mismatch → StartupGateError blocks normal router rendering with Retry
  ↓
Router navigates / → /home → /adscheck-pro/adaccounts
  ↓
AppLayout renders header/sidebar/content; RemoteHost renders remote routes
```

There is one shell SMIT login flow: startup user hydration. It does not fetch businesses, roles, onboarding, or feature flags. It does not wrap routes in `AuthLayout`, redirect to introduction, or gate remotes by role.

Adscheck entitlement/session state is a separate layer loaded only after SMIT login succeeds. The shell calls `GET /ads-check/auth` and `GET /ads-check/product` once per startup cycle, stores manager/features/products in the shared auth store, and exposes Pro/normal session state (`session_actived`, `activateProSession()`, `useNormalSession()`). This MVP exposes state only; it does not block routes by Adscheck features or session status.

SMIT Connect integrity is checked by the shell startup gate for all startup states. The gate posts the extension manifest to `/public/tools/check-hash`, reads the returned extension-local files through SMIT Connect, computes MD5 with `js-md5`, and blocks normal shell rendering on missing extension, API error, extension read error, or hash mismatch. This verifies expected extension files under the normal extension trust model; it is not proof against a malicious extension lying about its own file reads.

### Authorization Checks

Client-side role/feature gating is retired. Remote routes are not protected by `hasRole`/`hasFeature`; the gateway/API backend remains responsible for authorization.

### Logout & Session Cleanup

```
auth.logout()
  ├─ Clear startup auth state (user, is_authenticated, auth_checked, last_visit)
  └─ window.location.href = `${DASHBOARD_URL}/signin?referer=...`
```

---

## Remote Loading & Error Recovery

### RemoteHost Component (host layout)

`RemoteHost` wraps the remote's child `<router-view>` in `RemoteErrorBoundary` + `Suspense`.
The error boundary exposes a `retryKey` via slot prop;
bumping it (Retry button) remounts the Suspense subtree, which re-runs the remote loader.

```vue
<RemoteErrorBoundary :name="name" v-slot="{ retryKey }">
  <Suspense :key="retryKey">
    <router-view />
    <template #fallback>
      <RemoteLoadingFallback :name="name" />
    </template>
  </Suspense>
</RemoteErrorBoundary>
```

**Flow:**
1. Router guard registers the remote's `./routes` (once, deep-link safe) → MF resolves the chunk URL via manifest
2. Suspense renders fallback (RemoteLoadingFallback) while loading
3. Remote child route mounts into `<router-view>`
4. If error thrown → `onErrorCaptured` in RemoteErrorBoundary stops propagation + shows a Retry panel
5. Retry bumps `retryKey` → Suspense subtree remounts → remote reloads

### RemoteErrorBoundary

`onErrorCaptured` records the error, logs it, and returns `false` to stop propagation.
The Retry button increments `retryKey` (passed down via slot prop); there is no auto-hide timer.

**Error Types Handled:**
- Remote chunk fails to load (network down, corrupted remoteEntry.js)
- Missing shared dependency (version mismatch)
- Remote code throws during render

> API request timeouts are handled in the shared api-client (`api({ timeout_ms })`, default 15s),
> not here. The error boundary only covers remote-chunk/render failures.

---

## State Management (Pinia)

### Auth Store (useAuthStore)

```
State:
├─ user: User | null
├─ is_loading: boolean
├─ is_authenticated: boolean
├─ auth_checked: boolean
├─ last_visit: string | null
├─ auth_error: boolean
├─ adscheck_manager: AdscheckManager | null
├─ adscheck_features: AdscheckFeature[]
├─ adscheck_products: AdscheckProductResponse | null
├─ entitlements_checked/loading/error: boolean
├─ use_normal_session: boolean
└─ is_pro_session_active: boolean

Actions:
├─ hydrateUser() → GET /public/authentication
├─ trackLastVisit(product: string) → POST /public/last-visit with { last_visit: product }, fire-and-forget
├─ loadEntitlements() → GET /ads-check/auth + GET /ads-check/product
├─ refreshEntitlements() → re-fetch Adscheck auth/product state
├─ activateProSession() → POST /ads-check/sessions/active
├─ useNormalSession() → persist legacy localStorage.setting_use_free=1
└─ logout() → Clear auth/session state + redirect dashboard
```

**Module-Level Guard:**
```typescript
let hydrate_promise: Promise<void> | null = null;

async function hydrateUser() {
  if (hydrate_promise) return hydrate_promise;
  hydrate_promise = (async () => { ... })();
  return hydrate_promise;
}
```

Prevents duplicate startup authentication calls across shell/remotes sharing the MF singleton.

### Layout Store (useLayoutStore)

```
State:
├─ page_title: string
├─ header_slot: string (for custom header content)
└─ sidebar_state: { isCollapsed: boolean }

Used by:
├─ Shell to set header title dynamically
└─ Remotes to customize header appearance
```

---

## API Client Architecture

### api-client.ts

```typescript
class ApiError extends Error {
  status: number;
  data: Record<string, any>;
}

async function api(url: string, options: RequestInit): Promise<Response> {
  const apiUrl = `${resolveApiUrl()}${url}`;
  
  const response = await fetch(apiUrl, {
    ...options,
    credentials: 'include',  // Send cookies for cross-origin auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    
    if (response.status === 401) {
      useAuthStore().logout();  // Auto-logout on 401
    }
    
    throw new ApiError(response.status, errorData);
  }
  
  return response.json();
}

async function api_get<T>(url: string, query?: Record<string, string>): Promise<T> {
  const queryStr = query ? '?' + new URLSearchParams(query).toString() : '';
  return api(url + queryStr, { method: 'GET' });
}

async function api_post<T>(url: string, body: Record<string, any>): Promise<T> {
  return api(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
```

API gateway is resolved at runtime by hostname suffix for every hostname: `https://gateway.<last-two-labels>`. This keeps `.team` and `.vn` environments aligned without a build-time gateway var.

**Features:**
- Centralized fetch wrapper (single point for logging, auth handling)
- Auto-logout on 401 (prevents auth loops)
- Typed response via generics
- Credentials sent (enables cookie-based session auth)

### FB-over-extension layer (adaccounts only)

The adaccounts remote talks to Facebook through the **SMIT Connect browser
extension**, not the SMIT gateway. This is a separate API shape, local to
`apps/adaccounts/src/api/`:

```
ensureLoaded / load / refresh (TKQC, BM, Page)
      │
      ▼
fb-session: checkFacebookSession()  →  Banzai bootloader probe (logged_in / not_logged_in / switched)
      │  not_logged_in / switched → reset token/cache state; clear rows
      ▼
Workspace tabs / ToolPanel catalog / ToolDetailPanel "Chạy N bước" / account-list refresh / BM data-loading / Page loading
      │
      ▼
run-batch (bounded concurrency = Luồng, delay = Delay)   ·  list-adaccounts (paginated)
      │                                                   ·  use-bm-data-loader (base-first BM rows + selected groups)
      │
      ▼
tools/* runners  ──►  fb-graph: graph() REST  +  graphql() (doc_id, strips for(;;);)
                            │  resolves token via fb-token-policy; resets only the failed slot on auth error
                            ├─ fb-token-policy: purpose → token slot
                            │     ├─ token_b (fb-token)         scrape + persist access_token, fb_dtsg, lsd, user_id
                            │     ├─ token_g (fb-bm-token)      BM-scoped Graph token
                            │     ├─ token_i (fb-token-auto)    AdsCanvasComposerDialog bootloader endpoint
                            │     └─ token_graphql (fb-token-graphql)  ReactComposerStatusEagerAttachment endpoint
                            └─ smit-connect.extFetch ──► chrome.runtime.sendMessage(ext, {cmd:'fetch', url, options})
                                                              └─ extension fetches FB (cookies borrowed, CORS bypassed)
```

- The page **never** calls `graph.facebook.com` directly — all FB traffic is proxied
  by the extension so the user's FB session cookies are reused.
- `checkFacebookSession()` runs before TKQC/BM/Page loads. `not_logged_in` surfaces
  an error; `switched` clears rows and token/cache state so a different FB user never
  sees the previous user's data.
- Token cache lives in one extension-storage bundle (`adscheck_data`) with session
  metadata and four slots (`token_b`, `token_g`, `token_i`, `token_graphql`). Each
  slot has a 6-hour TTL. `resetTokenForSlot` invalidates only the token family that
  failed.
- No extension / not logged in → each batch row reports the error (no crash), surfaced
  as an aggregated toast.
- The account list is cached in the extension's `chrome.storage.local` as a user-scoped
  payload `{user_id, saved_at, data}` (keys `v8_adaccount_cached` + `v8_last_adaccount_cached`,
  30-minute TTL). Cache reads reject another FB user's data; legacy raw-array cache is
  trusted only when the FB user cannot be resolved. Successful tool actions return a
  `patch` that `applyPatches` writes into the in-memory list and the cache, so the table
  reflects the change with no re-fetch.
- BM data loading is local to `features/businesses`: base rows load first, advanced toggles
  control whether group API wrappers run, group patches merge by `bmId`. Extension-storage
  cache persists rows + activeConfig for 30 minutes as a user-scoped payload (keys
  `v8_bm_rows_cached`, `v8_bm_active_config_cached`, `v8_last_bm_rows_cached`); reads reject
  another FB user's data. Optional legacy groups `legacyType` and `legacyQuality` use
  internal GraphQL. Per-group advanced patch cache uses session keys `bm:{bmId}:{group}`.
  BM table always renders (no empty-card gate). 21 source-facing columns; product-rejected
  columns (`BM tên hiển thị phụ`, `Ghi chú`, `Hoạt động`) and detail/debug payloads intentionally omitted.
- Page loading is local to `features/page`; extension-storage cache persists rows + config +
  progress for 30 minutes as a user-scoped payload (keys `v8_page_rows_cached`,
  `v8_page_config_cached`, `v8_page_progress_cached`, `v8_last_page_rows_cached`); reads reject
  another FB user's data. Page tools are UI-only until real runners are wired.
- Pixel is a truthful placeholder tab with no API calls and no fake rows.

### Adaccounts Two-Panel Function Architecture

The adaccounts workspace uses `WorkspacePathFrame` to render the main table plus two resizable function panels. The frame is shared-ui because the path-shaped tab surface and panel sizing are reusable UI, but the business behavior stays inside the `adaccounts` remote.

```text
WorkspaceTabFrame
  ├─ main table slot (TKQC/BM/Page/Pixel)
  ├─ Function panel 1: function catalog for the active tab
  └─ Function panel 2: ordered workflow-step details for selected functions
```

Panel responsibilities are intentionally split:

- **Panel 1** shows the active tab's catalog. TKQC uses fixed product groups (`Super Share`, `Kháng TKQC`, `Đổi Info`, `Xoá QTV ẩn`); BM and Page use grouped/searchable catalog UIs. Selecting a function appends it to the ordered step list or focuses the existing step.
- **Panel 2** renders selected workflow steps, per-step schema forms, expand/collapse state, remove/reorder controls, and the run button when a runner exists.
- **State isolation:** TKQC/Page share the app-local `createToolActions()` factory so each panel instance gets its own catalog, localStorage order/enabled keys, selected-step list, and per-tool form values. BM uses `use-bm-actions` because BM tools carry BM-specific metadata and runners.
- **Runner truthfulness:** TKQC/BM only execute wired runners. Page is currently UI-only and warns instead of faking API behavior; Pixel remains empty.
- **Workspace toolbar:** `AdAccountsWorkspace` provides `#adaccounts-workspace-table-toolbar`; active data tables Teleport shared-ui Table toolbar controls into that top bar beside the tab load-config trigger.

---

## Data Flow Example: Startup Auth Hydrate

```
1. User lands on https://dev.smit.team:8301/
   ↓
2. Shell loads and creates Pinia + router, then mounts early
   ↓
3. runStartupChecks() calls auth.hydrateUser()
   ↓
4. hydrateUser() → GET /public/authentication (credentials:include)
   ├─ { isLogin:true, user, last_visit } → store user + authenticated
   ├─ { isLogin:false } / scoped 401 → unauthenticated state
   └─ network/timeout → auth_error=true
   ↓
5. trackLastVisit('ads-check') → POST /public/last-visit (fire-and-forget, does not block)
   ↓
6. If authenticated, loadEntitlements() → GET /ads-check/auth + GET /ads-check/product
   └─ store Adscheck manager/features/products and session state
   ↓
7. checkSessionSelection() → if adscheck_manager && !is_pro_session_active, block startup
   ├─ SessionSelectionDialog renders (Teleport-based, no close button)
   ├─ user selects Normal → closes, Normal session persists, popup reappears next reload
   └─ user selects Pro → activateProSession()
      ├─ success → closes dialog, is_pro_session_active=true, proceeds
      └─ fail → keeps dialog open, shows error, user retries
   ↓
8. verifySmitConnectHashGate() → POST /public/tools/check-hash + extension-local MD5 checks
   ├─ valid → normal router rendering
   └─ failure → retryable StartupGateError blocks router-view
   ↓
9. Router navigates / → /home → /adscheck-pro/adaccounts
   ↓
10. RemoteHost registers remote routes and renders the remote child route
```

---

## Bundle Optimization Strategy

### Code Splitting

**Rspack config (shell):**

```javascript
optimization: {
  runtimeChunk: { name: 'runtime' },
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      mfRuntime: {
        test: /[\\/]node_modules[\\/]@module-federation[\\/]/,
        name: 'mf-runtime',
        priority: 30,
      },
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
      },
    },
  },
}
```

**Outputs (production, uncompressed JS after shared-ui subpath import optimization):**
- `vendors.js` (~167KB) — Vue ecosystem/runtime dependencies used by shell
- `runtime.js` (~81KB) — Rspack + MF runtime, manifest loader
- `main.js` (~4KB) — shell entry
- lazy shell chunk (~45KB)
- **Initial shell JS:** ~297KB across chunks; no shell asset exceeds the 300KB per-asset budget

**Shared-ui import strategy:**
- Feature/page code should import narrow subpaths (`@mf2/shared-ui/icons`, `/core`, `/remote`, `/table`, `/card`) instead of the root barrel.
- The root `@mf2/shared-ui` export remains for compatibility and broad showcase/demo pages.
- This prevents icon/loading-only consumers from pulling data-grid/dialog/dropdown/select/form dependencies into the initial shell chunk.

### Tree-Shaking

- **Vue:** treeshake=true by default (SFC compiler includes used components only)
- **Tailwind:** Scoped CSS (unused utilities not included in build)
- **Lucide icons:** Sprite-compiled (96 icons inlined as one SVG, no runtime fetch). Source = per-icon `.svg` files in `shared-ui/src/icons/svg/`; `pnpm generate:icons` builds `sprite-symbols.ts` (sprite string + `IconName` type). Splitting source into per-icon files does NOT change bundle/runtime — output is the same single inlined sprite

### Remote Lazy-Loading

Remotes don't load until route matches:

```
Shell initial load: ~297KB JS (across chunks)
  ├─ Includes MF manifest loader (in runtime chunk)
  ├─ Includes shared stores + narrow shared-ui shell imports
  └─ Excludes remote route code

Route /adscheck-pro/adaccounts:
  ├─ Load adaccounts remote manifest/entry + page chunks
  └─ Largest current data-grid/shared-ui route chunk: ~271KB

No prefetch (conservative, reduces unnecessary traffic)
```

---

## Deployment Architecture

### Static Build Outputs

**Shell (`dist/`):**
```
index.html              (splash loader, preconnect links)
runtime.js              (~81KB, Rspack + MF runtime)
vendors.js              (~167KB, framework/runtime deps)
main.js                 (~4KB, shell entry)
shell lazy chunk         (~45KB)
mf-manifest.json        (routes remotes to CDN)
remoteEntry.js          (empty for host)
```

**adaccounts / ads_manager (`dist/`):**
```
index.html              (standalone dev server)
main.js                 (40KB, remote code)
runtime.js              (30KB)
mf-manifest.json        (routes to self)
remoteEntry.js          (exports ./App + ./routes)
```

### Deployment Strategy

**Development:**
- Shell runs on HTTPS; remotes still run on HTTP localhost. Every app's dev port comes from `owners.json` —
  including the shell (`owners.shell.port`). The shell's host (`dev.smit.team`) + https stay
  hard-coded in its `rspack.config.ts`; only the port is centralized.
- Dev remote URLs resolve to shell same-origin proxy paths (`/remotes/<segment>` on
  `https://dev.smit.team:<owners.shell.port>`). The shell devServer forwards those requests to
  `owners.remotes` `{host, port}` targets, so the browser does not make HTTPS shell → HTTP localhost
  remote requests directly.
- Each remote's own `rspack.config.ts` reads its `{host, port}` from `owners.remotes.<name>`,
  and the shell reads `owners.shell.port` (`devServer.port`, remote proxy base) — so a dev port lives
  in ONE place. No `--port` flag in `package.json` (a CLI flag would override the config and
  re-split the source).

**Production (per-app deploy targets):**
- The prod shell bakes each remote URL as a `BASE_PATH`-relative path by default
  (`/adaccounts/...`, `/ads-manager/...`), so same-origin hosting remains the zero-config path.
  A remote can still be hosted independently by setting its absolute `*_REMOTE_URL` override at
  shell build time.
- `pnpm build` is build-only and stops at `apps/<app>/dist/`. There is no combined deploy
  repo and no assemble/copy step. Publish the selected app's `dist/` directory directly, or
  make that `dist/` directory a separate deploy git repo/worktree. No CI auto-deploy
  (`deploy-pages.yml` retired).

**owners.json (repo root):** `shell` carries the host's dev `{port}`; `remotes` maps each remote
name → dev `{host, port}`. It does NOT carry prod URLs — prod is relative, derived at build
time. Example:

```json
{
  "shell": { "port": 8301 },
  "remotes": {
    "adaccounts": { "host": "localhost", "port": 3010 },
    "ads_manager": { "host": "localhost", "port": 3011 }
  }
}
```

---

## CI/CD & Governance

### Build Orchestration (Turborepo 2.9.16)

**Task Graph (turbo.json):**

```javascript
{
  "tasks": {
    "build": {
      "outputs": ["dist/**"],
      "env": ["NODE_ENV", "DASHBOARD_URL", "BASE_PATH",
              "ADACCOUNTS_REMOTE_URL", "ADS_MANAGER_REMOTE_URL"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]  // shared packages typecheck first
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Task Execution:**
- **PR to main:** `pnpm turbo run typecheck build --filter=...[origin/main]`
  - Affected-only: builds changed package + dependent apps
  - Example: Fix in `shared-types` → typechecks/builds `shared-types`, `shared-store`, `shared-ui`, `shell`, `adaccounts`, `ads-manager` (all dependents)
  - Broken app = PR blocked (CI gate)

- **Push to main:** `pnpm turbo run typecheck build` (full)
  - Diffs main against itself = zero tasks without filter (so always full build to keep main green)

**Cache Strategy:**
- Local cache: `.turbo/` directory (gitignore'd)
- CI cache: keyed on `hashFiles('pnpm-lock.yaml')` (shared deps stable)
- Cache hit skips work entirely (verified: typecheck 4.756s cold → 17ms warm / FULL TURBO)

### CI Gate (GitHub Actions, .github/workflows/ci.yml)

**PR Verification:**
```yaml
- Checkout (fetch-depth:0 for git diff)
- Install pnpm 10.11, node 20
- Run: pnpm turbo run typecheck build --filter=...[origin/main]
- Fails if: changed pkg doesn't compile, dependent app breaks
- Blocks merge: branch protection requires CI green
```

**Push to Main Verification:**
```yaml
- Run: pnpm turbo run typecheck build (full, no filter)
- Ensures main always compiles and deploys cleanly
```

**Concurrency:**
- Cancels stale PR runs (new commit pushed)
- Never cancels main push (post-merge verification must complete)

### Code Ownership (CODEOWNERS)

**Enforcement:**
- Shared package changes require @tech-lead review (enforces additive + PR-split discipline)
- App-specific changes can be reviewed by assigned dev

**File Routing:**
```
/packages/shared-*/      @tech-lead
/apps/adaccounts/        @dev-a
/apps/ads-manager/       @dev-b
/turbo.json              @tech-lead
/.github/                @tech-lead
```

Requires GitHub branch protection: "Require review from Code Owners" + "Dismiss stale reviews on push".

### Governance Model

Full rationale: [docs/micro-frontend-governance.md](./micro-frontend-governance.md)

**5 Isolation Layers (prevent → recover):**

| Layer | Mechanism | Enforcement |
|-------|-----------|------------|
| **1. Additive Changes** | No breaking changes to `shared-*` public API | Code review (tech-lead) |
| **2. PR-Split** | Never mix `packages/` + `apps/*` in one PR | CODEOWNERS forces separate PRs |
| **3. Per-App Deploy** | Each app builds + deploys independently | CI tags: `adaccounts-deploy-YYYY.MM.DD` |
| **4. CI Gate** | Broken code cannot merge to main | GitHub branch protection |
| **5. Git Restore** | Roll back one app without touching others | `git restore --source <ref> -- apps/{app}/` |

**Key Implication (Singleton Truth):**
- All remotes share ONE runtime instance of each `shared-*` package (MF `singleton:true`)
- Breaking change in `shared-*` breaks EVERY app simultaneously (regardless of versioning)
- Isolation comes from **process discipline**, not repo boundaries
- Single shared PR must merge before dependent app PR (Layer 2 + Layer 4 together)

---

## Security Considerations

1. **CORS + Credentials:** API Gateway must set `Access-Control-Allow-Credentials: true` + specific origin
2. **SameSite Cookies:** Dashboard signs cookies with `SameSite=Strict` (only sent to dashboard domain)
3. **HTTPS Enforcement:** Shell HTTPS, remotes HTTPS in prod (dev exception: localhost HTTP)
4. **MF Manifest Versioning:** Each build produces new manifest, prevents stale remote references
5. **No Token Storage:** Cookies only (httpOnly preferred), no localStorage tokens

---

## Monitoring & Debugging

### Available Signals

- **MF Manifest Load:** Network tab → mf-manifest.json (should be 200)
- **Remote Entry Load:** Network tab → remoteEntry.js (should be 200)
- **Shared Deps:** Browser console → check Pinia version, vue version match
- **Auth State:** DevTools → Vue tab → useAuthStore state inspect
- **Error Boundary:** Browser console → [remote-name] Error captured logs

### Common Issues

| Issue | Debug | Fix |
|-------|-------|-----|
| Remote returns 404 | Check dev server running, Network tab URL | `pnpm dev` (starts all apps) |
| Shared dep mismatch | Console warns version conflict | Ensure rspack.config shared config matches |
| Mixed content warning | HTTPS shell + HTTP remote (dev only) | Prod is same-origin relative — no mixed content |
| Undefined shared module | Remote can't find shared-store | Verify @mf2/shared-store in rspack shared config |
| Auth token invalid | 401 response from API | Check gateway CORS, cookie SameSite policy |

---

**Document Version:** 1.3  
**Last Updated:** 2026-06-27  
**Audience:** Backend devs, DevOps, frontend architects (tech decision reference)  
**Changes:** Added trackLastVisit fire-and-forget + SessionSelectionDialog blocking modal (Teleport-based) to startup sequence
