---
title: "Router redesign root product routes"
status: completed
created: 2026-06-25
mode: tdd
source: ../reports/brainstorm-260625-router-redesign-root-product-routes-report.md
blockedBy: []
blocks: []
---

# Router redesign root product routes

## Overview

Đổi routing từ prototype `/app/*` sang product routes cấp root. `/app/*` và mọi path không hợp lệ redirect về `/home`. Adscheck Pro có URL riêng cho từng tab để reload/deep-link active đúng tab.

## Context

- Brainstorm approved: `plans/reports/brainstorm-260625-router-redesign-root-product-routes-report.md`
- Current shell routes: `apps/shell/src/router/index.ts`
- Current remote lazy registration: `apps/shell/src/router/remote-routes.ts`
- Current sidebar URL builder: `apps/shell/src/components/ArcSidebar.vue`
- Current adaccounts tab state: `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
- Current adaccounts remote routes: `apps/adaccounts/src/router/index.ts`

## Scope

### In scope

- Root-level routes: `/home`, `/adscheck-pro`, `/ads-save`, `/super-target`, `/support`, `/settings`, `/account`.
- `/` -> `/home`.
- `/app/*` -> `/home`.
- `/:pathMatch(.*)*` -> `/home`.
- `/adscheck-pro` -> `/adscheck-pro/adaccounts`.
- Adscheck Pro tab routes: `adaccounts`, `businesses`, `page`, `pixel`.
- Placeholder shell pages for non-implemented route targets.
- Feature docs / README route references impacted by this routing change.

### Out of scope

- Real Ads Save / Super Target / Support / Settings feature implementation.
- New shared package APIs/components.
- Legacy `/app/*` smart mapping to new paths.
- Browser e2e framework setup unless already present.

## Phases

| Phase | Status | Purpose | Dependencies |
|---|---|---|---|
| 1. Route contract tests/spec guards | completed | Add focused test/spec guardrails for route tables and tab path mapping before implementation | none |
| 2. Shell root routes and sidebar placeholders | completed | Replace `/app` route tree with root product routes and placeholder pages | Phase 1 |
| 3. Remote registration and Adscheck tab deep-links | completed | Update MF remote route matching plus adaccounts child routes/store sync | Phase 2 |
| 4. Docs and verification | completed | Update feature docs/README and run focused verification | Phase 3 |

## Success criteria

- [x] `/` redirects to `/home`.
- [x] `/app/adaccounts` redirects to `/home`.
- [x] Unknown paths redirect to `/home`.
- [x] Sidebar Adscheck Pro opens `/adscheck-pro/adaccounts`.
- [x] `/adscheck-pro` redirects to `/adscheck-pro/adaccounts`.
- [x] `/adscheck-pro/adaccounts` reload keeps TKQC tab active.
- [x] `/adscheck-pro/businesses` reload keeps BM tab active.
- [x] `/adscheck-pro/page` reload keeps Page tab active.
- [x] `/adscheck-pro/pixel` reload keeps Pixel tab active.
- [x] `/ads-save`, `/super-target`, `/support`, `/settings`, `/account` render placeholder, not 404.
- [x] No shared package changes are required.
- [x] Feature docs match changed routes/files.

## Verification commands

Run the narrowest useful checks first:

```bash
pnpm --filter @mf2/shell typecheck
pnpm --filter @mf2/adaccounts typecheck
pnpm verify:features
```

If implementation touches route contracts broadly or docs/shared boundaries unexpectedly, broaden to:

```bash
pnpm verify:all
```

## Dependencies and overlaps

Relevant old/pending plans exist around shell/MF/adaccounts, but this plan is independent because it changes current router contracts after those feature refactors. No blocking dependency is required. Do not edit older completed plans.

## Notes for implementation

- Keep `WorkspaceTabFrame` router-agnostic. It should emit tab changes only.
- URL is source of truth for initial tab on load.
- Avoid preserving legacy `/app/*` except explicit redirect to `/home`.
- Do not place tab business logic into shared-ui.
- Read and update feature docs as part of implementation.
