# Project Overview & PDR

## Project Vision

SMIT Agency Client is a production-grade micro-frontend platform (Vue 3) serving as the base for SMIT's SaaS dashboard. Achieves 2.5× smaller bundle than React baseline through careful optimization (Rspack, selective code-splitting, lazy-remote-loading). Focus: lightweight, maintainable, scalable for incremental feature deployment via Module Federation 2.0.

## Scope — Prototype (Current)

**What's In:**
- Shell host (HTTPS) with product routing: `/` → `/home`; `/adscheck-pro` → adaccounts remote; `/app/*` and unknown → `/home` (auth bypassed)
- Adaccounts remote: TKQC/BM/Page/Pixel tab workspace — real FB ad-account list + two-panel function architecture (Panel 1 catalog; Panel 2 ordered workflow-step details); BM data loading with 30-minute extension-storage cache; Page data loading with 30-minute extension-storage cache; workspace toolbar hosts tab load-config actions + shared-ui Table toolbar via Teleport
- Ads Manager remote: coming-soon placeholder + component showcase
- Shared stores (Pinia), shared types, shared UI (shadcn-vue)
- Icon sprite system (90 lucide icons)
- Bundle optimization (300KB performance budget)

**What's Out (Phase 2+):**
- Auth flow enablement (currently code exists but routers don't use it)
- Role/feature gating (code exists, not active in prototype routes)
- Asset sync (Facebook Ads Manager integration)
- Data tables, advanced filtering
- Real business context + multi-business orchestration
- Offline support

## Key Decisions (Locked)

### 1. Vue 3 over React
- **Why:** Smaller bundle (315KB vs 804KB), faster boot-up for micro-frontend consumers
- **Trade-off:** Smaller ecosystem (ok for internal tools), longer hiring ramp (mitigated by docs)
- **Lock:** Vue 3.5 Composition API + TypeScript mandatory. No Options API.

### 2. Rspack + Module Federation 2.0 (MF2)
- **Why:** Native MF2 support (no @module-federation/core patches), faster build (Rspack 3–5× faster than Webpack), remote manifest versioning
- **Trade-off:** Rspack ecosystem still maturing (mitigated: use proven plugins only)
- **Lock:** Shell = MF host. Remotes = stateless, lazy-load via manifest.json.

### 3. Pinia + Setup Store Pattern
- **Why:** Reactive, no boilerplate, works seamlessly with Composition API
- **Trade-off:** Learning curve for Redux veterans (docs + examples provided)
- **Lock:** No Vuex, no module pattern. Single setup store per domain (auth-store, layout-store).

### 4. Tailwind CSS v4 + shadcn-vue
- **Why:** utility-first, extreme bundling efficiency (tree-shake unused classes), reka-ui primitives are unstyled (complete control)
- **Trade-off:** No pre-built complex components (custom build required)
- **Lock:** No Material UI, no Bootstrap. Icons via sprite only (no font-icons).

### 5. Localhost HTTP for Remotes (Dev)
- **Why:** Secure-context exception allows http://localhost in HTTPS-shell dev environment; avoids cert generation hassle
- **Trade-off:** Production requires both HTTPS; no mixed-content warnings in prod
- **Lock:** Dev = http://localhost:XXXX. Prod = same-origin BASE_PATH-relative path (`/<remote>/...`), no separate CDN host.

### 6. Eager Shared Singletons (vue, vue-router, pinia, @mf2/shared-*)
- **Why:** Prevents version mismatch at runtime (critical for shared store), faster initialization
- **Trade-off:** Slightly larger shell bundle (vue + router + pinia eager = ~180KB, unavoidable)
- **Lock:** All framework deps + workspace packages are eager:true. No lazy-shared fallback.

## Functional Requirements

| Req | Description | Status |
|-----|-----------|--------|
| **FR1** | Shell loads without blocking on remotes | ✓ Done (Suspense + RemoteLoadingFallback) |
| **FR2** | Startup auth hydrate (`/public/authentication` → shared user state) | ✓ Done |
| **FR2a** | Track last product visit (`/public/last-visit`, fire-and-forget) | ✓ Done (trackLastVisit) |
| **FR2b** | Session selection dialog blocks startup until user chooses Pro/Normal | ✓ Done (SessionSelectionDialog, Teleport-based) |
| **FR3** | Client-side role/business gating | retired (gateway owns authorization) |
| **FR4** | Remote error recovery (retry, 403 fallback) | ✓ Done (RemoteErrorBoundary) |
| **FR5** | Icon sprite inlined (no external requests) | ✓ Done (sprite-symbols.ts + Icon.vue) |
| **FR6** | API client with credentials (cross-origin auth) | ✓ Done (api-client.ts, credentials:include) |

## Non-Functional Requirements

| Req | Target | Status |
|-----|--------|--------|
| **NFR1** | Per-asset size < 300KB (rspack hint) | ✓ Done (largest asset ~169KB; total shell JS ~317KB across chunks) |
| **NFR2** | TypeScript strict mode | ✓ Done (tsconfig.base.json, vue-tsc --strict) |
| **NFR3** | All active shared types exported from shared-types | ✓ Done (User, AuthenticationResponse, RemoteStatus) |
| **NFR4** | No console.log in production | ✓ Process (linting rule added) |
| **NFR5** | Dev HTTPS (preconnect headers) | ✓ Done (rspack devServer https + preconnect injection) |
| **NFR6** | MF manifest versioning (no hash caching) | ✓ Done (mf-manifest.json in dist/, remoteEntry.js separate) |

## Technical Constraints

1. **Node ≥20:** Modern async/await, top-level await support
2. **pnpm workspaces:** No symlink monorepo (pnpm hoisting)
3. **Gateway API:** Must support credentials:include (CORS + SameSite:Strict)
4. **Dev ports:** shell:8301, adaccounts:3010, ads-manager:3011 (centralized in `owners.json` at repo root, gitignored/per-machine — copy `owners.example.json`; `shell.port` + `remotes.<name>`, read by every app's rspack.config.ts)
5. **No IE11 support:** Rspack outputs ES2022 (let, const, arrow functions, etc.)

## Architecture Highlights

**Shell (MF Host):**
- Owns router, auth, layout state
- Loads remote child routes on demand (dynamic addRoute from each remote's `./routes`)
- Shared vue/vue-router/pinia as singletons (eager)

**Remotes:**
- Own their own data fetching + child routes
- Expose `./App` (standalone entry) + `./routes` (RouteRecordRaw[])
- adaccounts: mounts under `/adscheck-pro` (named parent `remote-adaccounts`); four-tab workspace with real FB TKQC data, tools, and BM data loading via the SMIT Connect extension; `/adscheck-pro` redirects to `/adscheck-pro/adaccounts`
- ads-manager: package exists as placeholder; not in the current product route tree

**API Client:**
- Centralized fetch wrapper (shared-store/api-client.ts) with per-call timeout + error classification
- Centralized 401 → single logout() via registered handler
- Throw ApiError (kind: http|auth|network|timeout|aborted); is_transient marks retryable

**Auth Flow:**
1. Shell startup calls `hydrateUser()` → GET /public/authentication
2. Calls `trackLastVisit('ads-check')` (fire-and-forget) → POST /public/last-visit
3. If authenticated, calls `loadEntitlements()` → GET /ads-check/auth + GET /ads-check/product
4. If Adscheck manager exists and Pro session not active, `checkSessionSelection()` blocks until user selects Pro or Normal via SessionSelectionDialog (Teleport-based modal)
5. Calls `verifySmitConnectHashGate()` → POST /public/tools/check-hash (blocks if extension invalid)
6. App mounts and RemoteHost renders remotes without client role/feature gating

## Success Metrics

- **Bundle:** Largest shell asset < 300KB (per-asset budget); total shell JS ~317KB across chunks; remotes lazy
- **Startup:** First paint < 1.5s (HTTPS + preconnect, no remote blocker)
- **Auth:** Redirect from login → dashboard in < 500ms
- **Errors:** 99.5% uptime (remote fetch failures do not crash shell)
- **Maintenance:** New feature ≤ 2 PRs (1 shell route + feature, 1 remote implementation)

## Dependencies & Version Pins

**Core:**
- Vue 3.5 (^3.5.0)
- vue-router 4 (^4.0.0)
- Pinia 3 (^3.0.0)
- TypeScript 5.6 (^5.6.3)

**Build:**
- Rspack 1.0 (^1.0.0)
- @module-federation/enhanced 0.8 (^0.8.0)
- Tailwind CSS 4 (^4.0.0)
- rspack-vue-loader 17.2 (^17.2.2)

**UI:**
- reka-ui 2.9 (^2.9.0)
- lucide-vue-next (icons, ~90 compiled into sprite)

**Node:** ≥20.0.0

**pnpm:** 10.11.0 (pinned in package.json packageManager field)

## Known Limitations

1. **Test suite partial:** Vitest (jsdom) set up in `@mf2/shared-ui` covering the data-grid range-copy pure logic; other packages still manual-only. Plan: broaden Vitest coverage + add Playwright e2e in Phase 2.
2. **No i18n:** Hardcoded English. Plan: add vue-i18n if multi-language required.
3. **No dark mode:** Tailwind theme (oklch) supports future dark variant; design tokens in shared-ui/lib/colors.ts.
4. **Limited error messages:** API errors logged generically (security: no leak sensitive data). Plan: user-facing error UI in Phase 2.
5. **No analytics:** No event tracking. Plan: add Posthog/Mixpanel integration if metrics needed.
6. **Single shell instance:** No multi-shell orchestration. Each domain gets own shell instance if needed.

## Roadmap Alignment

**Phase 1 (Current):** ✓ Base platform, auth, 2 remote placeholders, bundle optimized.

**Phase 2 (Next):** Port asset-sync (FB Ads Manager), real onboarding flow, data-table-v2.

**Phase 3:** Add analytics, campaign management, multi-remote scenarios.

**Phase 4:** Offline support, progressive enhancement.

## Ownership & Escalation

- **Technical Lead:** Architecture decisions, MF2 policy, bundle budget approval
- **DevOps:** Deployment strategy, CDN setup, env variable management
- **Security:** Auth flow review, API endpoint vetting, CORS policy

Escalate:
- Breaking changes to shared-types → affects all remotes
- MF config changes (shared singletons) → requires rebuild of shell + all remotes
- API endpoint changes (auth-store calls) → requires API team sync

## Open Questions (Resolved)

All key decisions locked for Phase 1. Monitor in Phase 2+:
- Should remotes share state beyond Pinia singleton? (Current: no, independent fetch)
- When to split shell further (layout wrapper, auth dialog, etc.)? (Current: monolithic is fine for <30KB of components)

---

**Document Version:** 1.3  
**Last Updated:** 2026-06-27  
**Status:** Phase 1 in progress — adaccounts workspace-tab refactor complete; BM + Page 30-minute extension-storage cache; shared-ui Table toolbarTarget + icon-only toolbar; shell startup sequence complete with trackLastVisit + SessionSelectionDialog (Teleport-based blocking modal)
