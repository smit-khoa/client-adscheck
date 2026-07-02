---
phase: 1
title: "Baseline and move map"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Baseline and Move Map

## Overview

Prove the current `adaccounts` remote is buildable before refactor and create an exact move map. This phase prevents blind path churn.

## Requirements

- Functional: no app behavior changes.
- Non-functional: establish baseline checks and inventory persisted keys/import owners before moving code.

## Architecture

This phase is read-only for source code. The output is a verified map from old implementation-owner folders to target domain folders.

Target top-level folders after the whole plan:

```text
features/workspace
features/adaccounts
features/businesses
features/page
features/pixel
```

## Related Code Files

- Read: `apps/adaccounts/src/features/**`
- Read: `apps/adaccounts/src/pages/AdAccountsPage.vue`
- Read: `apps/adaccounts/src/router/index.ts`
- Read: `.claude/features/README.md`
- Read: `.claude/features/adaccounts-*.md`
- Read: `docs/adaccounts-feature-architecture.md`
- Create: `plans/260623-2242-adaccounts-feature-domain-refactor/research/move-map.md`

## Implementation Steps

1. Run baseline checks:
   ```bash
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   ```
2. List all files under `apps/adaccounts/src/features`.
3. Search for persisted keys and store ids:
   - `localStorage`
   - `extStorage`
   - `defineStore(`
   - string keys like `adaccounts.tool-*`
4. Create `research/move-map.md` with old path -> new path mapping.
5. Mark paths that must preserve names/keys even if folder names change.
6. Identify reusable pieces that may need app-local extraction after domain moves.

## Success Criteria

- [x] Baseline typecheck result is recorded.
- [x] Baseline build result is recorded.
- [x] Move map covers every file in old folders.
- [x] Persisted keys/store ids are inventoried.
- [x] No source files are changed in this phase except plan research output.

## Risk Assessment

- Risk: moving without map causes broken imports and docs drift.
  - Mitigation: no source move until this phase has full mapping.
- Risk: persisted keys get renamed accidentally.
  - Mitigation: inventory keys first and preserve by default.
