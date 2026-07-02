---
phase: 1
title: "Route contract tests and spec guards"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Route contract tests and spec guards

## Overview

Create small, focused route contract guardrails before implementation. Because current app packages do not have app-level Vitest scripts, prefer pure TypeScript route metadata/helpers that `vue-tsc` can typecheck, plus manual acceptance checklist if no test runner is already available.

## Requirements

- Functional: capture canonical route mapping for `/home`, `/adscheck-pro/*`, route phụ placeholders, and legacy `/app/*` fallback.
- Functional: capture Adscheck Pro tab path mapping for `adaccounts`, `businesses`, `page`, `pixel`.
- Non-functional: do not add new testing framework or package dependency in this router-only task.
- Non-functional: keep guards close to route code and type-safe under existing `vue-tsc`.

## Architecture

If needed, extract route constants/helpers from shell and adaccounts route files:

- Shell route paths stay in shell-owned router module or a small shell router constants module.
- Adaccounts tab path mapping stays in adaccounts workspace/router code.
- `WorkspaceTabFrame` remains UI-only and router-agnostic.

TDD interpretation for this repo: write the route contract data/types first, then implement router files against that contract, and validate with `vue-tsc` plus manual route smoke checks.

## Related Code Files

- Modify: `apps/shell/src/router/index.ts`
- Modify: `apps/shell/src/router/remote-routes.ts`
- Modify: `apps/shell/src/components/ArcSidebar.vue`
- Modify: `apps/adaccounts/src/router/index.ts`
- Modify: `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Optional create: `apps/shell/src/router/product-routes.ts`
- Optional create: `apps/adaccounts/src/features/workspace/workspace-tab-routes.ts`

## Implementation Steps

1. Define the exact route contract in code or near-code constants before changing behavior.
2. Ensure route contract covers:
   - `/` -> `/home`
   - `/app/:pathMatch(.*)*` -> `/home`
   - unknown paths -> `/home`
   - `/adscheck-pro` -> `/adscheck-pro/adaccounts`
   - tab path <-> workspace tab mapping.
3. If extracting helpers, import them into router/page code instead of duplicating string literals.
4. Run `pnpm --filter @mf2/shell typecheck` and `pnpm --filter @mf2/adaccounts typecheck` after the contract compiles.

## Success Criteria

- [x] Route/tab mapping exists in one clear place per app boundary.
- [x] No runtime behavior changed yet unless the contract extraction requires it.
- [x] No new dependencies added.
- [x] Shell and adaccounts typecheck still pass or any failure is documented before Phase 2.

## Risk Assessment

- Risk: adding a full test framework expands scope. Mitigation: do not add dependencies; use typed contract/helpers and existing typecheck.
- Risk: route strings duplicated across sidebar/router/remote guard. Mitigation: centralize only when it reduces duplication immediately; avoid broad abstraction.
