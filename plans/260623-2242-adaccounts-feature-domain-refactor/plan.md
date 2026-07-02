---
title: "AdAccounts feature domain refactor"
status: pending
created: 260623-2242
source: plans/reports/adaccounts-feature-domain-refactor-260623-2242-report.md
mode: tdd
blockedBy: [260624-0016-workspace-path-frame-restore]
blocks: []
---

# Plan: AdAccounts Feature Domain Refactor

## Overview

Refactor `apps/adaccounts/src/features` from historical implementation-owner folders into explicit domain folders while preserving current behavior. The target keeps `features/workspace` and consolidates all domain code into `features/adaccounts`, `features/businesses`, `features/page`, and `features/pixel`.

This builds on the completed prototype port in `plans/260623-1857-adaccounts-prototype-merge/plan.md`. It is a path/architecture refactor, not a feature expansion.

## Context Links

- Brainstorm report: `plans/reports/adaccounts-feature-domain-refactor-260623-2242-report.md`
- Current architecture doc: `docs/adaccounts-feature-architecture.md`
- Feature map: `.claude/features/README.md`
- Workspace page: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Workspace tabs store: `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
- Prior prototype merge plan: `plans/260623-1857-adaccounts-prototype-merge/plan.md`

## Fixed Decisions

- Keep `features/workspace` inside `features`.
- Rename code/domain keys:
  - `tkqc` -> `adaccounts`
  - `bm` -> `businesses`
- Move all domain implementation, not just wrapper folders.
- Preserve UI labels `TKQC` and `BM` unless a later product decision changes copy.
- Preserve existing persisted localStorage/store keys unless a phase explicitly adds a safe migration.
- Keep low-level FB/extension infra under `apps/adaccounts/src/api`.
- Do not touch `packages/shared-*` in this refactor.
- Do not add Pixel API/data or fake rows.
- Update matching `.claude/features` docs as part of the work.

## Target Architecture

```text
apps/adaccounts/src/features/
  workspace/
    components/
    pages/
    stores/
    types/
    index.ts
  adaccounts/
    api/
    components/
    composables/
    stores/
    tools/
    types/
    index.ts
  businesses/
    api/
    components/
    composables/
    stores/
    tools/
    utils/
    types/
    index.ts
  page/
    api/
    components/
    composables/
    stores/
    tools/
    types/
    index.ts
  pixel/
    components/
    index.ts
```

After completion, old folders should be removed:

```text
features/tkqc
features/bm
features/account-list
features/account-selection
features/tool-actions
features/bm-data-loading
features/bm-actions
features/bm-tool-types
features/page-manager
features/page-selection
features/page-tool-actions
```

## Phases

| # | Phase | Status | Purpose |
|---|-------|--------|---------|
| 1 | [Baseline and move map](phase-01-baseline-and-move-map.md) | completed | Prove current checks and document exact old-to-new file mapping before moving code |
| 2 | [Workspace domain key rename](phase-02-workspace-domain-key-rename.md) | completed | Rename tab code keys from `tkqc/bm` to `adaccounts/businesses` while preserving UI labels |
| 3 | [Adaccounts domain consolidation](phase-03-adaccounts-domain-consolidation.md) | completed | Move TKQC/ad account table, selection, and tools into `features/adaccounts` |
| 4 | [Businesses domain consolidation](phase-04-businesses-domain-consolidation.md) | completed | Move BM/business data loading, selection, action panel, tool types, and utilities into `features/businesses` |
| 5 | [Page and pixel consolidation](phase-05-page-and-pixel-consolidation.md) | pending | Move Page manager/selection/tools into `features/page` and keep Pixel truthful-empty |
| 6 | [Docs, verification, and cleanup](phase-06-docs-verification-and-cleanup.md) | pending | Remove stale folders, update docs, run final architecture guards |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
```

Keep phases linear. Parallelizing this refactor is not worth the path churn and import conflict risk.

## TDD / Verification Strategy

There is no `@mf2/adaccounts` test script currently. Use regression-safe TDD gates by checking before and after each move:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
```

Final guards:

```bash
pnpm verify:features
pnpm verify:all
```

Manual smoke after implementation:

- `/app/adaccounts` renders from shell.
- Tabs still show TKQC/BM/Page/Pixel labels.
- Function panel 1 switches with active tab.
- Adaccounts/TKQC table and tools render.
- Businesses/BM data loading and tools render.
- Page table/tools render with current UI-only warnings where applicable.
- Pixel remains empty and does not call APIs.

## Acceptance Criteria

- [ ] `apps/adaccounts/src/features` contains only `workspace`, `adaccounts`, `businesses`, `page`, and `pixel`.
- [ ] Workspace tab code keys are `adaccounts | businesses | page | pixel`.
- [ ] UI labels remain stable unless separately approved.
- [ ] No imports reference removed old feature folders.
- [ ] Low-level FB infra remains in `apps/adaccounts/src/api`.
- [ ] No `packages/shared-*` changes are introduced.
- [ ] Pixel stays truthful empty with no fake data/API.
- [ ] `.claude/features` docs match real paths.
- [ ] `docs/adaccounts-feature-architecture.md` matches final structure.
- [ ] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [ ] `pnpm --filter @mf2/adaccounts build` passes, allowing existing non-blocking warnings only.
- [ ] `pnpm verify:features` passes.
- [ ] `pnpm verify:all` passes.

## Out of Scope

- New Pixel implementation.
- New tool behavior or runner semantics.
- Renaming user-facing labels from `TKQC`/`BM`.
- Shared package refactors.
- Runtime verification of Facebook mutations without SMIT Connect + logged-in FB session.
- Rewriting design system or table UX.

## Risks

| Risk | Mitigation |
|---|---|
| Large import churn breaks build | Move one domain per phase and run typecheck/build each phase |
| Persisted state breaks after rename | Preserve localStorage keys/store ids unless a safe migration is explicit |
| Common tool UI becomes junk drawer | Extract only after 2+ real usages remain; avoid `features/common` |
| Docs drift blocks verify | Update docs alongside domain moves and run `pnpm verify:features` |
| Runtime FB issues hidden by static checks | Final manual smoke notes session requirements |

## Validation Log

### Phase 1 — Baseline and move map — 2026-06-23

- Status: completed.
- Created move map: `plans/260623-2242-adaccounts-feature-domain-refactor/research/move-map.md`.
- Persisted keys/store ids inventoried and marked preserve-by-default.
- Verification:
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; existing CSS order warnings and asset-size warnings only.
- Source app files changed: none.

### Phase 2 — Workspace domain key rename — 2026-06-23

- Status: completed.
- Changed internal workspace tab keys from `tkqc`/`bm` to `adaccounts`/`businesses`.
- Kept UI labels `TKQC` and `BM` unchanged.
- Updated workspace, TKQC, and BM feature docs to mention new internal keys.
- Code review: `DONE_WITH_CONCERNS`; stale `tkqc` doc line fixed and `pnpm verify:features` rerun.
- Verification:
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; existing CSS order warnings and asset-size warnings only.
  - `pnpm verify:features`: PASS after reviewer doc fix.
- Source app files changed:
  - `apps/adaccounts/src/features/workspace/types/workspace.types.ts`
  - `apps/adaccounts/src/features/workspace/stores/workspace-tab-store.ts`
  - `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`

### Phase 3 — Adaccounts domain consolidation — 2026-06-23

- Status: completed.
- Consolidated old `features/tkqc`, `features/account-list`, `features/account-selection`, and adaccount-specific `features/tool-actions` code into `features/adaccounts`.
- Extracted generic tool-action building blocks used by both Adaccounts and Page into app-local common paths:
  - `apps/adaccounts/src/components/tool-actions/**`
  - `apps/adaccounts/src/composables/tool-actions/**`
  - `apps/adaccounts/src/types/tool-action.types.ts`
- Preserved localStorage keys: `adaccounts.tool-order.v1`, `adaccounts.tool-enabled.v1`, `adaccounts.tool-runner-settings.v1`, and Page tool keys.
- Code review: `DONE_WITH_CONCERNS`; stale TKQC doc gotcha fixed and file-field runner gap documented in `adaccounts-tool-actions.md`.
- Verification:
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; existing CSS order warnings and asset-size warnings only.
  - `pnpm verify:features`: PASS after reviewer doc fixes.
- Removed old source folders from `apps/adaccounts/src/features`: `tkqc`, `account-list`, `account-selection`, `tool-actions`.

### Phase 4 — Businesses domain consolidation — 2026-06-23

- Status: completed.
- Consolidated old `features/bm`, `features/bm-data-loading`, `features/bm-actions`, and `features/bm-tool-types` into `features/businesses`.
- Kept low-level BM runners under `apps/adaccounts/src/api/tools/bm/**`.
- Preserved `bm-selection` store id and BM runner semantics.
- Fixed review-found race: `use-bm-data-loader` now tracks `isLoadingAdvanced`, exposes combined `isLoading`, blocks new load/refresh while base or advanced loading is active, and disables the BM load dialog controls during loading.
- Updated live docs for new `features/businesses` paths, including `.claude/features`, `docs/adaccounts-feature-architecture.md`, `docs/codebase-summary.md`, and `docs/system-architecture.md`.
- Code review: initial `DONE_WITH_CONCERNS`; H1 loading race fixed; follow-up review `DONE` with no blockers.
- Verification:
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; existing CSS order warnings and asset-size warnings only.
  - `pnpm verify:features`: PASS after reviewer fixes.
- Removed old source folders from `apps/adaccounts/src/features`: `bm`, `bm-data-loading`, `bm-actions`, `bm-tool-types`.

## Notes

- `ck plan create` was unavailable in this shell (`ck: command not found`), so this plan was created manually in the project `plans/` directory.
- Relevant unfinished historical plans were scanned. No active blocker is attached because the prototype merge has completed content and this plan is a follow-up cleanup.
