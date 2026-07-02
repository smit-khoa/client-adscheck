# Codebase Summary

Quick reference to project structure, module responsibilities, and key files.

## Overview

5-package pnpm workspace: 3 apps (shell host + 2 remotes), 3 shared libraries.

```
smit-client-vue (root)   # dev host/port per app: owners.json at repo root (gitignored; copy owners.example.json)
├── apps/
│   ├── shell (host)
│   ├── adaccounts (remote, TKQC management — real FB data + tools via extension)
│   └── ads-manager (remote, placeholder + component showcase)
└── packages/
    ├── shared-types (interfaces, ~60 LOC)
    ├── shared-store (Pinia stores + API client, ~400 LOC)
    └── shared-ui (5 MF components + 24 shadcn-vue components + design system)
```

**Total LOC (excluding node_modules):** ~4,500 (adaccounts FB API layer + tool-actions added).

---

## Apps

### Shell (`apps/shell/`)

**Purpose:** MF host, router, auth/session orchestration, SMIT Connect startup gate, layout state.

**Key Files:**

| File | LOC | Role |
|------|-----|------|
| **src/main.ts** | ~16 | createApp + Pinia + router + early mount + startup checks |
| **src/composables/use-startup-gate.ts** | ~70 | Startup sequence: SMIT auth hydrate → fire-and-forget last-visit track → Adscheck entitlements when authenticated → session selection check → SMIT Connect check-hash gate |
| **src/services/check-hash-gate.ts** | ~100 | Posts extension manifest to `/public/tools/check-hash`, verifies returned extension file MD5 hashes, returns typed gate status |
| **src/services/smit-connect-extension.ts** | ~115 | Shell-local minimal SMIT Connect extension messaging helper |
| **src/components/StartupGateError.vue** | ~110 | Retryable blocking UI for missing/stale/unreadable SMIT Connect |
| **src/components/SessionSelectionDialog.vue** | ~150 | Blocking modal for session selection (Pro vs Normal); uses `<Teleport>` instead of Reka Dialog to avoid injection race; no close button — user must choose |
| **src/router/index.ts** | ~55 | Static route tree: `/` → `/home`; `/adscheck-pro` named parent `remote-adaccounts`; `/app/*` + unknown → `/home` |
| **src/router/product-routes.ts** | ~65 | Product placeholder routes (`/home`, `/ads-save`, `/super-target`, `/support`, `/settings`, `/account`) and path constants (`HOME_PATH`, `ADSCHECK_PRO_PATH`, `ADSCHECK_PRO_DEFAULT_PATH`) |
| **src/router/remote-routes.ts** | ~60 | Dynamic addRoute: loads each remote's `./routes` on first navigation (idempotent, deep-link safe) |
| **src/bootstrap.ts** | ~30 | Entry point, MF bootstrap guard |
| **src/App.vue** | ~40 | Root layout: SpriteProvider + router-view |
| **src/styles.css** | ~100 | Tailwind config + theme (oklch, animations) |
| **src/components/AppLayout.vue** | ~50 | Shell layout: header + sidebar + router-view |
| **src/components/AppHeader.vue** | ~40 | Simplified header (logo + sidebar toggle, no auth UI in prototype) |
| **src/components/ArcSidebar.vue** | ~60 | Nav: `/adscheck-pro/adaccounts` (Adscheck Pro sidebar link) |
| **src/components/RemoteHost.vue** | ~40 | Gating + error boundary + Suspense + router-view for remote child routes |
| **src/pages/CreateBusiness.vue** | ~30 | Placeholder onboarding page |
| **src/composables/use-click-outside.ts** | ~20 | Directive for dismissing dropdowns |
| **rspack.config.ts** | 148 | MF host config, shared deps, build optimization |
| **dev-proxy-config.ts** | ~15 | Builds remote URLs from owners.json (dev) / BASE_PATH-relative (prod) |
| **owners.json** (repo root, gitignored) | ~10 | Single source of truth for every app's dev port — `shell` (host port) + `remotes` (each remote host/port). Read by shell rspack.config.ts (own port + remote URLs) AND each remote's rspack.config.ts (devServer port). Per-machine: copy `owners.example.json`. |

**Architecture:**
- Bootstrap → main.ts (setup Pinia, router, mount early, then run startup checks)
- Startup gate sequence: `hydrateUser()` → `trackLastVisit('ads-check')` (fire-and-forget) → `loadEntitlements()` (authenticated only) → `checkSessionSelection()` (blocks until user selects Pro or Normal session) → `verifySmitConnectHashGate()` (blocks normal router rendering)
- SessionSelectionDialog: Teleport-based blocking modal (no Reka Dialog to avoid injection race); user MUST choose Pro or Normal session to proceed; Normal selection shows popup again on next reload; Pro activation persists session state
- AppLayout (new) wraps all routes: header + sidebar + router-view
- RemoteHost wraps a remote branch, renders its child routes (from `./routes`) via Suspense + error boundary
  - Prototype: no role/feature props (gating deferred)
  - Current auth: startup `hydrateUser()` only; no protected-route wrapper or business/role flow

**Dependencies:**
- @mf2/shared-store (auth-store, Adscheck entitlement/session state, layout-store, api-client)
- @mf2/shared-ui subpaths (icons/core/remote/table/card preferred; root barrel only for broad showcase/demo pages)
- @mf2/shared-types (User, AuthenticationResponse, RemoteStatus)
- vue, vue-router, pinia (eager shared)

---

### Adaccounts Remote (`apps/adaccounts/`)

**Purpose:** Lazy-loaded remote app — Quản lý TKQC (ad accounts). Real Facebook ad-account data + bulk tool actions, executed via the SMIT Connect browser extension. Feature-first structure under `src/features/` (see `docs/adaccounts-feature-architecture.md`).

**Key Files (feature-first):**

| File | Role |
|------|------|
| **src/pages/AdAccountsPage.vue** | Route entry; renders the remote-owned workspace and the single `<Toaster>` outlet |
| **src/features/workspace/** | Workspace tab frame, tab state, main slot, Function panel slots for TKQC/BM/Page/Pixel |
| **src/features/adaccounts/** | Adaccounts/TKQC table, account list, selection, and tool panel |
| **src/features/businesses/** | BM/business table, base-first data loading, selection, and BM action panel/tools |
| **src/features/page/** | Page tab wrappers around prototype Page manager and Page tools |
| **src/features/pixel/** | Truthful empty Pixel table/panel placeholders; no fake data/API |
| **src/features/adaccounts/components/AdAccountTable.vue** | shared-ui DataGrid table; loads on mount, refresh + loading; status by FB code; export enabled (`tools:['download']`) |
| **src/features/adaccounts/composables/use-account-list.ts** | accounts/isLoading/error + ensureLoaded/refresh/applyPatches; extension-store cache (chrome.storage.local, 30m TTL) |
| **src/features/adaccounts/api/list-adaccounts.ts** | fetchAdAccounts(): GET /me/adaccounts paginated via fb-graph |
| **src/features/adaccounts/types/account-list.types.ts** | AdAccount (status = FB numeric account_status; +bm?) |
| **src/features/adaccounts/stores/account-selection-store.ts** | selected-id set (Pinia, decoupled from account data) |
| **src/features/adaccounts/tools/components/ToolGroupList.vue** | TKQC grouped function catalog: search, 4 temporary groups, expand/collapse, selected row |
| **src/components/tool-actions/ToolFunctionForm.vue** | schema-driven config form (showWhen conditional fields), reused by TKQC Panel 2 and Page tools |
| **src/components/tool-actions/ToolRunnerHeader.vue** | Legacy/Page Luồng (concurrency) + Delay inputs, persisted |
| **src/features/adaccounts/tools/components/ToolPanel.vue** | TKQC Function panel 1 shell; renders grouped catalog and appends/focuses workflow steps |
| **src/features/adaccounts/tools/components/ToolDetailPanel.vue** | TKQC Function panel 2 ordered selected-step list/form/run UI |
| **src/features/adaccounts/tools/composables/use-tool-actions.ts** | ordered tools (localStorage), selectedFunctionId/selectedFunction, shared formValues |
| **src/features/adaccounts/tools/data/adaccount-tool-catalog.ts** | TKQC source catalog (8 groups / ~17 functions), derived flat list, and temporary 4-group `TOOL_UI_GROUPS` |
| **src/api/smit-connect.ts** | extension proxy: extFetch/extStorageGet/Set via chrome.runtime.sendMessage |
| **src/api/fb-session.ts** | checkFacebookSession(): probes Banzai endpoint; returns logged_in/not_logged_in/switched and resets token/cache state on logout or FB user switch |
| **src/api/fb-token.ts** | getToken(): scrapes token_b (access_token/fb_dtsg/lsd/user_id), persists to extension storage, dedupes inflight fetches |
| **src/api/fb-token-auto.ts** | getAutoToken(): fetches token_i from AdsCanvasComposerDialog bootloader endpoint, cached in extension storage |
| **src/api/fb-token-graphql.ts** | getLegacyGraphqlToken(): fetches token_graphql from ReactComposerStatusEagerAttachment endpoint, cached in extension storage |
| **src/api/fb-token-policy.ts** | getTokenForPurpose(): routes by readGraph/powerEditorAction/businessManagerAction/legacyGraphql/sessionGraphql; resetTokenForSlot() invalidates only the failed family |
| **src/api/fb-token-cache.ts** | extension-storage bundle (key `adscheck_data`): token_b/g/i/graphql + session metadata, 6h TTL per slot |
| **src/api/fb-graph.ts** | graph() REST + graphql() (doc_id, strips for(;;);), token-policy resolution, targeted auth-error retry |
| **src/api/tools/** | per-tool runners (rename, open/close-account, remove-user) + BM runners under `bm/` + TOOL_RUNNERS registry |
| **src/api/run-batch.ts** | bounded-concurrency batch runner ((account,index) → RowResult); Graph reads can use auto token policy and retry once after targeted slot reset on stale auth |
| **rspack.config.ts** | MF remote config (shared: vue/router/pinia/shared-*/vue-sonner singletons) |

**Architecture:**
- Owns its child routes (`./routes`), mounted by the shell under `/adscheck-pro` (named parent `remote-adaccounts`)
- Route content is a remote-owned workspace with TKQC/BM/Page/Pixel tabs; no adaccounts-local basic/advanced route mode remains
- Workspace toolbar (`AdAccountsWorkspace.vue`) hosts TKQC/BM/Page load-config actions (icon-only Button + Tooltip) and a fixed Teleport target `#adaccounts-workspace-table-toolbar`; active table toolbar buttons (refresh etc.) Teleport into that target at the top of the workspace
- Selection state is domain-local and id-only; tab panels resolve ids against domain rows before running actions
- Before any TKQC/BM/Page load, `checkFacebookSession()` probes the live Facebook session. `not_logged_in` clears rows and surfaces an error; `switched` clears rows and resets token/cache state so previous-user data is not shown.
- Account list is **real** (FB /me/adaccounts via extension), cached in the extension's `chrome.storage.local` as `{user_id, saved_at, data}` (keys `v8_adaccount_cached` + `v8_last_adaccount_cached`, 30m TTL). Cache reads reject another FB user's data; legacy raw-array cache is trusted only when the FB user cannot be resolved. Wired tools patch successful changes into the list+cache locally (no re-fetch), while unwired catalog tools warn instead of faking behavior
- BM tab loads real BM data through `features/businesses`: base BM rows first, then selected API groups. Toggles control API calls, patches merge by `bmId`. Extension-storage cache persists rows + activeConfig for 30 minutes as `{user_id, saved_at, data: {rows, activeConfig}}` (keys `v8_bm_rows_cached`, `v8_bm_active_config_cached`, `v8_last_bm_rows_cached`); reads reject another FB user's data. Advanced group patches use session keys `bm:{bmId}:{group}`. Optional legacy groups `legacyType` and `legacyQuality` use internal GraphQL. BM table always renders (no empty-card gate) with 21 source-facing columns; product decisions exclude `BM tên hiển thị phụ`, `Ghi chú`, and `Hoạt động`, and no detail/debug payloads are stored/displayed.
- Page tab renders Page loading/table UI from `features/page`; extension-storage cache persists rows + config + progress for 30 minutes as `{user_id, saved_at, data: {rows, config, progress}}` (keys `v8_page_rows_cached`, `v8_page_config_cached`, `v8_page_progress_cached`, `v8_last_page_rows_cached`); reads reject another FB user's data. Page tools are UI-only until real runners are accepted
- Pixel tab is a truthful empty placeholder with no API calls or fake rows
- **All FB calls go through the extension** (smit-connect) — the page never calls graph.facebook.com directly

**MF Contract:**
- Exposes: `./App` (standalone entry) + `./routes` (RouteRecordRaw[])
- Consumes: vue, vue-router, pinia (shared singletons from host)

---

### Ads Manager Remote (`apps/ads-manager/`)

**Purpose:** Lazy-loaded remote app (coming-soon placeholder).

**Key Files:**

| File | LOC | Role |
|------|-----|------|
| **src/pages/AdsManagerPage.vue** | ~16 | Coming-soon placeholder |
| **src/App.vue** | ~8 | Standalone entry |
| **src/router/index.ts** | ~10 | Child routes |
| **src/main.ts** | ~15 | createApp |
| **rspack.config.ts** | ~100 | MF remote config |

**Architecture:**
- Package exists as placeholder; not registered in the current product route tree (no `remote-ads-manager` entry in `remote-routes.ts`)
- (Future: will enforce role/feature gating when auth enabled; for now, accessible to all)

**MF Contract:**
- Exposes: `./App` (standalone entry) + `./routes` (RouteRecordRaw[])
- Consumes: vue, vue-router, pinia (shared singletons from host)

---

## Packages

### shared-types (`packages/shared-types/`)

**Purpose:** Central TypeScript interface definitions.

**Key Exports:**

```typescript
// User & Auth
User {
  id, email?, name?, role?, balance?, phone?, phone_verified?
}

AuthenticationResponse {
  isLogin?, last_visit?, user?
}

// Remote status enum
RemoteStatus = 'idle' | 'loading' | 'ready' | 'error'
```

**LOC:** ~60  
**Dependencies:** None (pure types)  
**Usage:** Imported by shared-store, shell, remotes for type safety

---

### shared-store (`packages/shared-store/`)

**Purpose:** Centralized Pinia stores + API client.

**Key Exports:**

#### Auth Store (auth-store.ts, ~200 LOC)

```typescript
useAuthStore() → {
  // SMIT login state
  user, is_loading, is_authenticated, auth_checked, last_visit, auth_error

  // Adscheck entitlement/session state
  adscheck_manager, adscheck_features, adscheck_products
  entitlements_checked, entitlements_loading, entitlements_error
  use_normal_session, is_pro_session_active

  // Actions
  hydrateUser()  // GET /public/authentication, normalize user state
  trackLastVisit(product: string)  // POST /public/last-visit with { last_visit: product }, fire-and-forget
  loadEntitlements()  // GET /ads-check/auth + GET /ads-check/product, maps feature usable state
  refreshEntitlements()
  activateProSession()  // POST /ads-check/sessions/active
  useNormalSession()  // localStorage.setting_use_free = 1
  logout()  // Clear auth/session state, redirect dashboard
}
```

**Guard:** Module-level `hydrate_promise` prevents duplicate startup auth calls.

#### Layout Store (layout-store.ts, ~40 LOC)

```typescript
useLayoutStore() → {
  page_title, header_slot, sidebar_state
  // For page customization (used by remotes)
}
```

#### API Client (api-client.ts, ~90 LOC)

```typescript
class ApiError extends Error { status, data }

api(url, options) → Promise<T>  // Fetch wrapper + error handling
api_get<T>(url, query?) → Promise<T>
api_post<T>(url, body) → Promise<T>
// Base: runtime gateway resolver (any hostname -> gateway.<suffix>)
// Auto-adds: credentials:include, Content-Type: application/json
// On 401 → calls useAuthStore().logout()
```

**LOC:** ~400 total  
**Dependencies:** @mf2/shared-types, pinia, vue  
**Usage:** Imported by shell (initialize), remotes (data fetching)

---

### shared-ui (`packages/shared-ui/`)

**Purpose:** Shared components + design system.

**Key Exports:**

#### Components

**MF custom components** (`components/`):

| Component | LOC | Role |
|-----------|-----|------|
| **Icon.vue** | ~20 | `<Icon name="check" />` → renders sprite symbol |
| **SmitLogo.vue** | ~15 | SMIT logo component |
| **SmitLoading.vue** | ~30 | Loading spinner (CSS animation) |
| **RemoteLoadingFallback.vue** | ~25 | Suspense fallback (gray box + spinner) |
| **RemoteErrorBoundary.vue** | ~60 | onErrorCaptured → retry button + error message |

**shadcn-vue components** (`components/ui/<name>/`, folder-per-component, added via `shadcn-vue` CLI):

24 components grouped — core (button, card, input, label, badge, separator), form (select, checkbox, radio-group, switch, textarea, form), overlay (dialog, drawer, dropdown-menu, popover, tooltip, sonner, tabs), data (table, skeleton, avatar, pagination), layout (resizable).

- Config: `components.json` (style `new-york`, Tailwind v4, `cssVariables`).
- **App import convention:** prefer narrow public subpaths (`@mf2/shared-ui/icons`, `/core`, `/remote`, `/table`, `/card`) instead of the root barrel. This keeps shell/remote initial chunks from pulling unrelated shared-ui groups. The root `@mf2/shared-ui` export remains for compatibility and broad showcase/demo pages.
- **Import convention inside ui/**: relative only (`../../../lib/utils`), NOT `@/` — because each app's rspack aliases `@`→app/src, so `@/` in shared-ui would break the consuming build. CLI-generated `@/` imports are rewritten to relative on add.
- **Toast**: `<Toaster>` (sonner) imports `vue-sonner/style.css` itself (v2 no longer auto-bundles CSS); consumers mount `<Toaster />` once + call `toast()`.

**Data-grid `Table` (`components/ui/table/`)** — the shadcn table primitives were replaced by a
virtualized data-grid (`Table.vue`, ~4.4k LOC: 2-axis virtualization, frozen columns, resize,
header drag-reorder, custom-column, sort, pagination, row-select, pivot). `index.ts` exports only `Table`.
**Transparent surface**: container, header, body rows, frozen cells, footer, and stripe are all `background: transparent` — the containing layout provides the visual surface. Column borders are off by default; pass `showColumnBorders` (`boolean`, default `false`) to enable thin column dividers. Toolbar buttons are icon-only with Tooltip labels (using the shared-ui `Button` default variant). **`toolbarTarget`** (`string | HTMLElement`, optional): when provided, toolbar controls Teleport to that DOM target instead of rendering inline — used by adaccounts workspace to hoist table toolbar buttons into the top workspace bar. **Zoom control** is intentionally hidden/commented; fullscreen logic remains for future reuse. **Header drag-reorder**: 6-dot grip handle per header cell; live reorder follows the pointer, scoped to the
same zone (frozen↔frozen, non-frozen↔non-frozen, no auto freeze/unfreeze); per-hover-cell hysteresis avoids
flip-flop between wide/narrow columns; persists to `localStorage.config_column` on change. Excel-like
**range-select + copy** is opt-in via `enableRangeSelect` (default false → zero regression on the
singleton): solid cell/header background highlight, header column-handle, multi-range, auto-scroll,
copy-confirmation wave, Cmd+C/copy button → full-range TSV, and a settings dropdown with a real checkbox
for the global include-header preference (`localStorage.range_copy_include_header`). **Checkbox row-range selection** (always-on for `showCheckbox`
tables): drag-fill (Excel-like), Shift+click range toggle, mutates `checkedConfig.selected`. **Export**
(opt-in via `tools:['download']`): `ExportMenu.vue` icon-only button with Tooltip opens a Popover format picker (`.xlsx`/`.csv`/`.txt`); exports
`visibleColumns` × (all rows or checked selection) reusing `formatCopyValue`; filename
`smit-adscheck-<table>-<YYYY-MM-DD>`; `xlsx` (SheetJS) lazy-imported so `.txt` never loads it. Logic split
into `composables/` (`use-range-copy`, `use-table-range-selection`, `range-coords`,
`use-range-copy-flow`, `use-checkbox-row-range-selection`, `use-table-export`) with vitest unit tests in `composables/__tests__/`.
Shared `DropdownMenu*` components use the current soft green/gray palette (12px menu radius, 8px item radius),
so table header menus and copy settings stay visually aligned with the grid.
Feature map: `.claude/features/shared-ui-data-grid-table.md`.

Three invariants the caller does NOT see but must hold for the grid to behave correctly:
1. `Table` clones `props.columns` into an internal reactive ref before mutating `frozen`/order;
   callers can pass a plain literal array (typical) without losing reactivity. Never mutate
   `props.columns` from outside.
2. Toolbar buttons (`refresh`, `time`, `filter`, `download`, `custom-column`) are all
   gated by `tools.includes(...)` — pass only the ones you wire. The `actionsAnchor` for the
   floating copy/settings cluster clamps INSIDE the sticky-left band when every column in the
   range is frozen, so the buttons stay over the selected frozen cells.
3. When `data.length === 0 && loading`, `Table` synthesizes 10 data-shaped skeleton rows
   (`id: __skeleton-N`, `data: { [key_id]: __skeleton-N }`) so placeholder rows take the
   normal data-row path instead of being misdetected as group headers. Do not bypass this
   synthesis while a table is loading.
Lessons: `data-grid-mutate-props-columns`, `shared-ui-subpath-injection-key`.

#### Design System

| File | Role |
|------|------|
| **lib/utils.ts** | `cn()` helper (merge Tailwind classes) |
| **lib/colors.ts** | Design tokens (oklch, semantic colors) |
| **icons/sprite-provider.ts** | Injects SVG sprite via provide/inject. Uses `Symbol.for("mf2-sprite-ready")` so the InjectionKey resolves across MFE boundaries even when subpath imports (`@mf2/shared-ui/icons`) bypass the MF singleton |
| **icons/sprite-symbols.ts** | AUTO-GENERATED — single inlined SVG sprite + `IconName` type + `ICON_NAMES` (96 icons). Never edit by hand |
| **icons/svg/** | Per-icon source files (`<name>.svg`, one per icon). Edit these, not the generated output |
| **scripts/generate-icons.mjs** | Regenerates `sprite-symbols.ts` from `icons/svg/`. Run `pnpm generate:icons` after adding/removing an icon |
| **icons/index.ts** | Exports SpriteProvider, Icon, ICON_NAMES, IconName |

**Dependencies:** reka-ui (primitives + Splitter), class-variance-authority, clsx, tailwind-merge, @radix-icons/vue, @vueuse/core, vee-validate + @vee-validate/zod + zod (form), vue-sonner (toast), @tanstack/vue-table (table), vaul-vue (drawer), xlsx (SheetJS — table export, lazy-imported), vue  
**Note:** all are MF singletons — every remote shares one instance; keep changes additive.  
**Usage:** Imported by shell + remotes

---

## Key Flows

### Authentication Initialization

```
main.ts creates Pinia + router, mounts app early
  ↓
useStartupGate().runStartupChecks()
  ↓
auth.hydrateUser()  [hydrate_promise dedupes concurrent calls]
  ↓
GET /public/authentication
  ├─ { isLogin:true, user, last_visit } → store user + authenticated
  ├─ { isLogin:false } / scoped 401 → unauthenticated state
  └─ network/timeout → auth_error=true
  ↓
auth.trackLastVisit('ads-check')  [fire-and-forget, catches errors]
  ↓
if authenticated: auth.loadEntitlements() [entitlements_promise dedupes]
  ↓
GET /ads-check/auth + GET /ads-check/product → store manager/features/products + Pro session state
  ↓
checkSessionSelection()  [if adscheck_manager exists and !is_pro_session_active]
  ├─ SessionSelectionDialog opens (blocking, Teleport-based)
  ├─ user selects Normal → dialog closes, Normal session persists, popup reappears on reload
  └─ user selects Pro → activateProSession(), if success dialog closes + session active, if fail keep dialog open + show error
  ↓
verifySmitConnectHashGate()
  ├─ valid → router-view renders
  └─ failure → StartupGateError blocks normal routes with Retry
```

### Remote Loading

```
Shell.router → /adscheck-pro/adaccounts

router guard (remote-routes.ts)
  ↓ first navigation: import('adaccounts/routes') + addRoute under 'remote-adaccounts' (once)

RemoteHost (route prop: name)
  ↓ RemoteErrorBoundary → Suspense → <router-view>
       ↓ remote child route component import()  [MF manifest loaded]
       └─ page mounted; retry bumps retryKey to remount on error
```

### API Calls

```
Shell or Remote code
  ↓
api_get('/public/authentication') or feature-owned API wrapper
  ↓
fetch('https://gateway.<suffix>/...', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
  ↓
if 401 → registered logout handler runs unless the call suppresses it
if non-2xx → throw ApiError(status, data)
if 2xx → return parsed JSON
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| **package.json (root)** | Scripts: dev, build (via Turbo), typecheck (via Turbo), clean; pnpm workspaces config |
| **pnpm-workspace.yaml** | (implicit) pnpm workspaces definition |
| **turbo.json** | Turbo task definitions: build (outputs dist/, env vars), typecheck (dependsOn ^typecheck), dev (cache:false, persistent) |
| **tsconfig.base.json** | Shared TS config (paths, strict, esModuleInterop) |
| **apps/shell/rspack.config.ts** | MF host: shared deps, remotes config, optimization budget |
| **apps/shell/dev-proxy-config.ts** | Remote URLs (dev-only) |
| **apps/shell/tailwind.config.ts** | Tailwind theme (oklch, components) |
| **apps/adaccounts/rspack.config.ts** | MF remote: expose ./App |
| **apps/ads-manager/rspack.config.ts** | MF remote: expose ./App |
| **.github/CODEOWNERS** | Required reviewers: @tech-lead for packages/shared-*, per-app owners for apps/* |
| **.husky/pre-commit** | Runs `verify:catalog` + `verify:features` (blocks on drift) + soft reminder when `apps/*/src` changes without touching `.claude/features/` |
| **CLAUDE.md** | Governance rules: 5 isolation layers (additive, PR-split, per-app deploy, CI gate, git restore) + AI memory rules (catalog / features / lessons / playbook) |

---

## AI Memory Layer (`.claude/`)

Knowledge layer so an AI assistant reuses components correctly, understands existing features, and avoids repeat mistakes — without the dev re-describing the system each task. Drift is the #1 failure mode, so machine-verifiable parts are guarded by scripts + husky + CI; only non-derivable knowledge (how-to-use, flow, gotchas) is hand-written.

| Path | Purpose |
|------|---------|
| **.claude/playbook.md** | Entrypoint flow for UI/feature/bug tasks: catalog → feature doc → lessons → propose → do → update memory. Self-decision principle (act if ≥85% sure, else ask) |
| **.claude/components-catalog.md** | 28 shared-ui component groups: when-to-use + example + anti-pattern. Read before writing any UI; never hand-roll an existing component |
| **.claude/features/** | Feature map: each doc lists real files/flow/APIs (layer-based code → doc re-assembles it). README.md is the index |
| **.claude/lessons/** | Footguns already hit (symptom → root cause → how to avoid). Shared across all agents; write one after diagnosing a memorable bug |
| **scripts/verify-catalog-coverage.mjs** | Fails if a shared-ui component group is missing from the catalog, or a catalog heading is an orphan (drift both directions) |
| **scripts/verify-feature-docs.mjs** | Fails if a `## Files` path in a feature doc no longer exists, or README index is inconsistent |

---

## Dependency Graph

```
shell (host)
  ├─ shared-store
  │   ├─ shared-types
  │   └─ pinia, vue
  ├─ shared-ui
  │   ├─ reka-ui (primitives + Splitter), @radix-icons/vue, SVG icon sprite
  │   ├─ cva + clsx + tailwind-merge (cn helper)
  │   └─ vee-validate/zod, vue-sonner, @tanstack/vue-table, vaul-vue, @vueuse/core
  ├─ shared-types
  ├─ vue, vue-router, pinia (eager shared)
  └─ remotes (adaccounts, ads-manager) lazy-load via MF

adaccounts (remote)
  ├─ shared-store (shared singleton)
  ├─ shared-ui (shared singleton)
  ├─ shared-types (shared singleton)
  └─ vue, vue-router, pinia (shared singletons from host)

ads-manager (remote)
  ├─ shared-store (shared singleton)
  ├─ shared-ui (shared singleton)
  ├─ shared-types (shared singleton)
  └─ vue, vue-router, pinia (shared singletons from host)
```

---

## Build Outputs

**Shell (dist/), production uncompressed JS after shared-ui subpath import optimization:**
- index.html (splash loader CSS)
- vendors.js (~167KB, vue, vue-router, pinia and shared runtime deps)
- runtime.js (~81KB, Rspack + ModuleFederation + manifest loader)
- main.js (~4KB, shell entry)
- lazy shell chunk (~45KB)
- mf-manifest.json (routes remotes to CDN URLs)
- remoteEntry.js (MF entry point, empty for host)

**Adaccounts (dist/):**
- mf-manifest.json
- remoteEntry.js (exports ./App + ./routes)
- main.js (~79KB), remoteEntry (~80KB), largest data-grid/shared-ui chunk ~271KB
- index.html (standalone dev server)

**Ads Manager (dist/):**
- Same shape as adaccounts
- normal route imports loading UI via `@mf2/shared-ui/core`; standalone component showcase still imports the root shared-ui barrel and keeps a large demo chunk (~419KB) by design

**Initial shell JS:** ~297KB across chunks (largest JS asset ~167KB); remotes are lazy-loaded. Adaccounts still has a ~271KB route chunk because the advanced data-grid legitimately uses Dialog/Dropdown/Select/vuedraggable.

---

## File Naming Conventions

- **Components:** PascalCase, kebab-case file names (`AppHeader.vue`, `app-header.vue`) — both used interchangeably
- **Stores:** Suffix `-store.ts` (auth-store.ts, layout-store.ts)
- **Composables:** Prefix `use-` (use-click-outside.ts)
- **Utilities:** kebab-case (utils.ts, colors.ts)
- **Types:** Exported from shared-types/index.ts

---

## Known Technical Debt

1. **Tests:** Vitest unit tests exist in `@mf2/shared-ui` (jsdom, data-grid table composables) and `@mf2/shared-store` (jsdom, `api-client`/`auth-store`/`layout-store`). `@mf2/adaccounts` currently has no package `test` script after the workspace-tab port; restore pure runner/composable/store tests before expanding FB automation logic. Still pending: CI gate + Playwright e2e.
2. **No i18n:** English only; vue-i18n integration planned if needed
3. **No dark mode:** Theme tokens exist; awaiting design spec
4. **Limited error UI:** Generic API error messages (security precaution)
5. **Hardcoded remote URLs:** dev-proxy-config.ts (should be env-driven in Phase 2)

---

**Document Version:** 1.7  
**Last Updated:** 2026-06-27  
**Scope:** Adaccounts workspace-tab refactor complete (TKQC/BM/Page/Pixel tabs, domain-first structure); workspace toolbar Teleport pattern; shared-ui Table toolbarTarget + icon-only toolbar + transparent surface; BM + Page 30-minute extension-storage cache; WorkspacePathFrame subtle green gradient; shell startup sequence now includes trackLastVisit fire-and-forget + session selection dialog (Teleport-based, blocking).
