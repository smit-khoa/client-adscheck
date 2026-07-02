# Project Roadmap

Tracking progress from Phase 1 (base platform) through Phase 4 (advanced features).

## Executive Summary

**Current Status:** Phase 1 complete. Adaccounts remote extended beyond placeholder: real FB ad-account list + FB-over-extension API layer + bulk tool actions (2 tools wired: rename, open/close) plus advanced BM data loading. vue-sonner shared as MF singleton for cross-shell toasts.

**Next:** Phase 2 (wire remaining TKQC tools, asset sync, real onboarding).

**Timeline:** 2 weeks per phase (Phase 2 starts immediately after Phase 1 verification).

---

## Phase 1: Base Platform ✓ COMPLETE

**Duration:** Weeks 1–2 (Done)  
**Status:** Shipped, verified in production sandbox

### Goals

- [x] Shell host (Vue 3 + Pinia + vue-router)
- [x] Module Federation 2.0 (MF2) setup (host + 2 remotes)
- [x] Auth flow (gateway.smit.team integration)
- [x] Role/feature gating (RemoteHost)
- [x] Shared libraries (types, store, UI)
- [x] Icon sprite system (96 lucide icons, generated from per-icon `.svg` sources)
- [x] Bundle optimization (< 300KB)
- [x] Turborepo (task caching, affected-graph builds)
- [x] CI gate (GitHub Actions, Turbo typecheck + build on affected, branch protection)
- [x] CODEOWNERS (tech-lead review on shared packages)
- [x] Governance model (5-layer isolation, per-app deploy, PR-split discipline)
- [x] Documentation (README, architecture, standards, PDR, governance, deployment)

### Deliverables

| Component | Status | Notes |
|-----------|--------|-------|
| **Shell** | ✓ Done | Router + startup auth hydrate + layout components |
| **Adaccounts Remote** | ✓ Done | Lazy-loads correctly. Since extended (Phase 2-early): real FB ad-account list + bulk tool actions (rename, open/close) + advanced BM data loading via the SMIT Connect extension — see codebase-summary / adaccounts-feature-architecture |
| **Ads Manager Remote** | ✓ Done | Coming-soon placeholder |
| **Shared Store** | ✓ Done | auth-store.ts (startup hydrate + logout), layout-store.ts |
| **Shared UI** | ✓ Done | Icon.vue, Button.vue, Card.vue, RemoteErrorBoundary.vue, SmitLoading.vue |
| **Shared Types** | ✓ Done | User, AuthenticationResponse, RemoteStatus |
| **Bundle** | ✓ Done | shell initial JS ~297KB across chunks; largest shell JS asset ~167KB; shared-ui imports use narrow subpaths |
| **Dev Server** | ✓ Done | Shell HTTPS, remotes HTTP; host/port centralized in owners.json at repo root (gitignored; copy owners.example.json) |
| **Turborepo** | ✓ Done | turbo.json, build caching, affected-graph, shared packages no build step |
| **CI Gate** | ✓ Done | .github/workflows/ci.yml, affected-only on PR, full verify on main push, branch protection |
| **CODEOWNERS** | ✓ Done | .github/CODEOWNERS, tech-lead review on shared packages |
| **Governance** | ✓ Done | CLAUDE.md (5 layers), micro-frontend-governance.md (rationale), git baseline established |
| **Docs** | ✓ Done | README.md, project-overview-pdr.md, codebase-summary.md, code-standards.md, system-architecture.md, project-roadmap.md, deployment-guide.md, micro-frontend-governance.md |

### Test Results

- TypeScript: ✓ 6/6 files pass `pnpm typecheck`
- Build: ✓ 3 apps build successfully via Turbo, mf-manifest.json + remoteEntry.js generated
- Bundle: ✓ Shell initial JS ~297KB across chunks (largest shell JS asset ~167KB), 0 shell warnings; adaccounts data-grid route chunk ~271KB remains tracked
- Dev Runtime: ✓ Shell mounts, splash hidden, auth flow executes, 0 console errors
- CI: ✓ PR gate blocks broken code, main push full verify, branch protection enforced
- Git: ✓ 6 commits on main, per-app deploy tags supported, per-path rollback ready

### Known Limitations

- Unit tests live across shared-store + shared-ui + adaccounts (116 tests, `turbo run test`); CI gate + Playwright e2e still pending
- No i18n (hardcoded English)
- No dark mode (tokens prepared, design pending)
- Remotes are placeholders (real features Phase 2+)
- Limited error UI (security: generic messages)

---

## Phase 2: Asset Sync & Real Features

**Duration:** Weeks 3–4 (Planned start: 2026-06-17)  
**Status:** Scope locked, waiting phase 1 sign-off

### Goals

- [ ] Port asset-sync from React baseline (Facebook Ads Manager integration)
- [ ] Real CreateBusiness flow (form validation, API submission)
- [x] Data-grid `Table` in shared-ui (virtualized, frozen, resize, header drag-reorder, sort, pagination, pivot, Excel-like range-copy)
- [~] Test suite — Vitest unit tests across shared-store + shared-ui + adaccounts (116 tests, per-package config + turbo aggregation); remaining: CI gate + Playwright e2e
- [ ] Error UI improvements (user-facing error messages + retry UX)

### Detailed Tasks

#### 2.1 Asset Sync (Adaccounts Remote)

**Scope:**
- Fetch campaigns from gateway.smit.team
- Lazy-load Facebook SDK (FB.init + FB.login if new OAuth needed)
- Display campaign list with sync status
- Handle FB OAuth flow (browser popup → token exchange → API save)

**API Endpoints:**
- `GET /gate/:bid/campaigns` — list user campaigns
- `POST /gate/:bid/campaigns/:cid/sync` — trigger asset sync job
- `GET /gate/:bid/sync-status/:job_id` — poll sync progress

**Components:**
- `CampaignList.vue` (table, <200 LOC)
- `SyncStatusBadge.vue` (status indicator, <50 LOC)
- `FacebookLoginButton.vue` (OAuth flow, <100 LOC)

**Store Updates:**
- `campaign-store.ts` (new, ~150 LOC: fetchCampaigns, syncCampaign, pollStatus)
- `auth-store.ts` (current: startup `hydrateUser`; future Facebook config should live in a feature-owned store/API, not auth business roles)

**API Client:**
- `fb-sdk-loader.ts` (new, ~50 LOC: dynamic script injection + FB.init)

**Timeline:** 5 days (3 days dev + 2 days testing + FB SDK integration)

#### 2.2 Real CreateBusiness Flow

**Scope:**
- Replace placeholder form with real inputs (business name, timezone, industry)
- Form validation (Zod or Yup integration, <100 LOC)
- Submit to `POST /gate/register/business`
- On success: redirect to /adscheck-pro/adaccounts

**Components:**
- `CreateBusinessForm.vue` (form, <150 LOC)
- `IndustrySelect.vue` (dropdown, <50 LOC)

**Store Updates:**
- `auth-store.ts` (add createBusiness action, ~50 LOC)

**Timeline:** 3 days (2 days dev + 1 day testing)

#### 2.3 Data-table-v2 Component

**Scope:**
- Reusable table component (sortable columns, pagination, row selection)
- Built on shadcn-vue TableHeader + TableBody (Primitive, not pre-built)
- Example: Campaign list table (mock data)
- No virtualization yet (Phase 3 if needed for 1000+ rows)

**Components:**
- `DataTable.vue` (table wrapper, <200 LOC)
- `DataTableColumn.vue` (slot-based, <100 LOC)
- `TablePagination.vue` (prev/next buttons, <80 LOC)

**Utilities:**
- `use-table-sort.ts` (sorting logic, <80 LOC)
- `use-table-pagination.ts` (page state, <60 LOC)

**Timeline:** 4 days (3 days dev + 1 day example + testing)

#### 2.4 Test Suite Setup

> **Done (2026-06-20; refreshed 2026-06-24):** Vitest unit tests live across three packages — 116 tests aggregated via
> `pnpm turbo run test`. Per-package config (no central root config), pure-logic only (no `.vue`
> render tests — `@vue/test-utils` intentionally NOT added). Remaining: CI gate + Playwright e2e.

**Done:**
- [x] `@mf2/shared-store` (jsdom): `api-client`, `auth-store`, `layout-store` — 32 tests
- [x] `@mf2/shared-ui` (jsdom): data-grid table composables (range coords/copy, checkbox row-range selection, export) — 46 tests
- [ ] `@mf2/adaccounts`: test suite removed after workspace-tab port; restore pure runner/composable tests (run-batch, tool workers, fb-token, use-bm-data-loader, use-page-manager)
- [x] Turbo `test` task aggregates all suites; `*.test.ts` excluded from each `tsconfig.json`

**Remaining:**
- [ ] CI gate — `turbo run test --filter=...[origin/main]` in GitHub Actions (`.github/workflows/` to be created), required check before merge
- [ ] 1–2 Playwright e2e happy paths (shell→remote load + one tool flow)

**Test layout:** `__tests__/` beside source in each package (e.g. `packages/shared-store/src/__tests__/`,
`apps/adaccounts/src/api/__tests__/`) — NOT a central `tests/` dir.

**Timeline:** unit tests done; CI + e2e ~1 day remaining

#### 2.5 Error UI & Recovery

**Scope:**
- `ErrorAlert.vue` (user-facing error component, <80 LOC)
- Remote error messages (distinguish network vs code errors)
- Auto-dismiss error after 5s with manual dismiss button
- Docs update for error handling patterns

**Timeline:** 2 days (1 day dev + 1 day testing + docs)

### Acceptance Criteria

- [ ] Asset sync displays campaign list, can trigger sync
- [ ] CreateBusiness form validates input, creates business, redirects
- [ ] DataTable component sortable and paginated (works in Adaccounts Remote example)
- [ ] 20+ unit tests pass, 3 e2e tests pass
- [ ] TypeCheck passes (pnpm typecheck)
- [ ] Build succeeds with 0 warnings (bundle size tracked)
- [ ] All docs updated (README, architecture, standards)

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| FB SDK async load race | Medium | High (auth flow blocks) | Use lazy-load directive + Suspense |
| Campaign API schema change | Low | Medium (re-map response) | API team gives schema upfront |
| Data-table complexity | Medium | Low (phase back if needed) | Start with basic sort/page, add features iteratively |
| Test setup delays | Low | Low (can skip Phase 2 tests) | Pre-install deps, use scaffold template |

---

## Phase 3: Analytics & Multi-Remote Scaling

**Duration:** Weeks 5–6 (Planned start: 2026-07-01)  
**Status:** Concept, detailed scope TBD

### Goals

- [ ] Analytics remote (campaign performance dashboard)
- [ ] Settings remote (business settings, user management)
- [ ] Multi-business switching (account picker in header)
- [ ] Event tracking (Posthog/Mixpanel integration)
- [ ] Advanced data-table (virtualization for 1000+ rows)

### Estimated Scope

- 2 new remotes (analytics, settings)
- 3 new stores (analytics-store, settings-store)
- Shared event emitter for cross-remote communication
- Shared logger for structured logging

### Timeline

- 2 weeks (5 remotes total = shell + adaccounts + ads-manager + analytics + settings)

---

## Phase 4: Offline & Progressive Enhancement

**Duration:** Weeks 7–8 (Planned start: 2026-07-15)  
**Status:** Exploratory, scope TBD

### Goals

- [ ] Service Worker for offline fallback
- [ ] IndexedDB cache for read-heavy data
- [ ] Sync queue for offline mutations
- [ ] PWA manifest + installability
- [ ] i18n (multi-language support)

### Timeline

- 2 weeks (infrastructure heavy)

---

## Feature Timeline (Gantt Overview)

```
Phase 1 (Weeks 1–2):    [████████████] ✓ COMPLETE
Phase 2 (Weeks 3–4):    [████████████░░░░░░░░░░░░░░░░] Next
Phase 3 (Weeks 5–6):    [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] Future
Phase 4 (Weeks 7–8):    [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] Future

Dependency Chain:
Phase 1 (base) → Phase 2 (asset sync) → Phase 3 (analytics) → Phase 4 (offline)
     ✓              Planned             Future              Future
```

---

## Release Schedule

| Release | Phase | Date | Artifacts |
|---------|-------|------|-----------|
| v0.1.0-alpha | Phase 1 | 2026-06-04 | Shell + 2 remotes (placeholders), docs |
| v0.2.0-beta | Phase 2 | 2026-06-18 | Asset sync, real onboarding, data-table, tests |
| v0.3.0 | Phase 3 | 2026-07-02 | Analytics, settings, multi-remote |
| v0.4.0 | Phase 4 | 2026-07-16 | Offline, PWA, i18n |
| v1.0.0 | General Availability | 2026-08-01 | Stable, documented, production-ready |

---

## Key Metrics & Success Indicators

### Bundle Size

| Phase | Shell initial JS | Adaccounts largest JS | Ads Manager largest JS | Per-asset target |
|-------|------------------|------------------------|------------------------|------------------|
| 1 | ~297KB total, largest ~167KB | ~271KB data-grid chunk | ~419KB showcase/demo chunk | Shell < 300KB/asset ✓; remote warnings tracked |
| 2 | < 330KB | < 300KB | < 300KB route chunk | < 400KB |
| 3 | < 340KB | < 300KB | < 300KB | < 500KB |
| 4 | < 350KB | < 300KB | < 300KB | < 600KB |

Target: Keep initial shell < 350KB, each remote < 150KB (lazy-load 2 remotes = ~250KB additional).

### Performance

| Metric | Target | Phase 1 | Phase 2 | Notes |
|--------|--------|---------|---------|-------|
| First Paint (shell) | < 1s | ~800ms | ~850ms | HTTPS preconnect helps |
| First Contentful Paint (with remote) | < 2s | ~1.2s (lazy) | ~1.5s | Network-dependent |
| Auth Flow (login→dashboard) | < 500ms | ~450ms | ~450ms | API latency included |
| TypeCheck | < 10s | ~6s | ~8s | Parallel workspaces |
| Build | < 30s | ~22s | ~25s | Incremental on change |

### Code Quality

| Metric | Target | Phase 1 | Phase 2 | Notes |
|--------|--------|---------|---------|-------|
| TypeScript Errors | 0 | 0 | 0 | Strict mode enforced |
| Linting Warnings | 0 | 0 | 0 | No console.log in prod |
| Unit Tests | grow with risk | shared-ui only | 116 tests (3 pkgs) | Pure-logic focus; not coverage-%-driven |
| Bundle Warnings | 0 | 0 | 0 | Performance budget strict |

---

## Dependency Updates

### Locked for Phase 1

- Vue 3.5 (^3.5.0)
- vue-router 4 (^4.0.0)
- Pinia 3 (^3.0.0)
- Rspack 1.0 (^1.0.0)
- TypeScript 5.6 (^5.6.3)

### Phase 2 Additions (Candidate)

- Vitest (^2.1.8) — unit testing (live in shared-ui, shared-store, adaccounts)
- ~~@vue/test-utils~~ — NOT adopted: pure-logic test strategy, no `.vue` render tests
- Playwright (^1.40.0) — e2e testing (still pending)
- Zod (^3.22.0) — schema validation (or Yup)

### Future (Phase 3+)

- Posthog (^3.0.0) — event tracking
- Service Worker library (TBD)
- i18n library (vue-i18n or format-js)

---

## Documentation Updates (By Phase)

| Document | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|----------|---------|---------|---------|---------|
| README.md | ✓ Create | Update | Update | Update |
| project-overview-pdr.md | ✓ Create | Update scope | Expand | Finalize |
| codebase-summary.md | ✓ Create | Extend (new stores) | Extend | Extend |
| code-standards.md | ✓ Create | Add testing section | Add event patterns | Add offline patterns |
| system-architecture.md | ✓ Create | Add data-table arch | Add multi-remote patterns | Add SW arch |
| project-roadmap.md | ✓ Create | Update progress | Update timeline | Final status |
| deployment-guide.md | ✓ Create | Add analytics setup | Add cache strategy | Add PWA config |

---

## Open Questions (Phase 2+)

1. ~~**Vitest vs Jest?**~~ **Resolved:** Vitest (jsdom) — adopted in `@mf2/shared-ui`.
2. **Zod vs Yup?** (Candidate: Zod, smaller bundle, better TS support)
3. **Posthog vs Mixpanel?** (TBD: depends on backend choice)
4. **Service Worker framework?** (TBD: Workbox or custom)
5. **i18n library?** (TBD: vue-i18n or format-js)

## Settled Decisions (Phase 1)

- ✓ **Turborepo** for build orchestration (vs make, Nx, pnpm --filter alone)
- ✓ **GitHub Actions** for CI gate (vs GitLab, Circle CI)
- ✓ **Monorepo + pnpm workspaces** for repo layout (vs multi-repo, git submodules)
- ✓ **5-layer governance** for MFE isolation (additive + PR-split + per-app deploy + CI gate + git restore)
- ✓ **Per-app deploy tags** for rollback targeting (adaccounts-deploy-YYYY.MM.DD convention)

---

## Escalation Path

**Phase 1 Sign-Off Required Before Phase 2 Start:**
- [ ] Bundle size verified in production sandbox
- [ ] Auth flow tested with real gateway.smit.team
- [ ] All docs reviewed and approved
- [ ] Team trained on code standards

**Phase 2 Decision Gate (2026-06-17):**
- [ ] Phase 1 metrics acceptable?
- [ ] Team capacity for Phase 2 work?
- [ ] Asset Sync API stable?

**Scope Changes:** Any new feature request deferred to next phase (YAGNI principle enforced).

---

**Document Version:** 1.1  
**Last Updated:** 2026-06-11  
**Next Review:** 2026-06-17 (Phase 2 kickoff)  
**Owner:** Technical Lead + Product Manager
