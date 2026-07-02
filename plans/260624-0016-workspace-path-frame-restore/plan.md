---
title: "Workspace path frame restore"
status: completed
created: 260624-0016
source: plans/reports/brainstorm-260624-0016-workspace-path-frame-restore-report.md
mode: tdd
blockedBy: []
blocks: [260623-2242-adaccounts-feature-domain-refactor]
---

# Plan: Workspace Path Frame Restore

## Overview

Restore the SVG path-based workspace tab frame for `/app/adaccounts` without losing the real tab logic already wired in the remote. The plan adds an additive shared-ui `WorkspacePathFrame` component first, then adapts `adaccounts` to render its existing table/tool slots inside that frame.

This plan intentionally blocks the remaining adaccounts domain cleanup plan because it changes the shared/app UI boundary that phase 6 docs/verification must reflect.

## Context Links

- Brainstorm report: `plans/reports/brainstorm-260624-0016-workspace-path-frame-restore-report.md`
- Current shell path prototype: `apps/shell/src/components/WorkspaceContent.vue`
- Current adaccounts frame: `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
- Current adaccounts slot adapter: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Workspace feature doc: `.claude/features/adaccounts-workspace-tabs.md`
- Shared-ui catalog: `.claude/components-catalog.md`
- Existing overlapping plan: `plans/260623-2242-adaccounts-feature-domain-refactor/plan.md`

## Fixed Decisions

- Add the reusable path frame to `packages/shared-ui`.
- Keep `apps/shell/src/components/WorkspaceContent.vue` as a placeholder for now; do not integrate shell in this plan.
- Keep `AdAccountsWorkspace.vue` as the domain adapter that chooses table/tool components by active tab.
- Do not change domain APIs, stores, composables, data loading, or tool runner semantics.
- Do not add Pixel API/data or fake rows.
- Respect shared/app split: shared-ui changes and app integration must be separable into focused commits/PRs.

## Target Architecture

```text
packages/shared-ui/src/
  components/ui/workspace-path-frame/
    WorkspacePathFrame.vue
    index.ts
  workspace-path-frame.ts
  index.ts                         # additive export only if consistent with package pattern

apps/adaccounts/src/features/workspace/
  components/WorkspaceTabFrame.vue # app adapter using WorkspacePathFrame
  pages/AdAccountsWorkspace.vue    # unchanged data/tool slot owner unless minimal prop wiring is needed
```

## Phases

| # | Phase | Status | Purpose |
|---|-------|--------|---------|
| 1 | [Baseline and shared-ui contract](phase-01-baseline-and-shared-ui-contract.md) | completed | Lock current behavior and define the reusable frame API before editing shared-ui |
| 2 | [Add shared-ui WorkspacePathFrame](phase-02-add-shared-ui-workspace-path-frame.md) | completed | Add the path SVG frame, toolbar slot, panel shells, exports, and catalog docs |
| 3 | [Integrate adaccounts workspace frame](phase-03-integrate-adaccounts-workspace-frame.md) | completed | Render existing adaccounts table/tool slots inside the shared path frame |
| 4 | [Docs, verification, and handoff](phase-04-docs-verification-and-handoff.md) | completed | Update feature docs, run final guards, and document split-commit requirements |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
```

Keep phases linear. Phase 2 touches `packages/shared-ui`; Phase 3 touches `apps/adaccounts`. Do not stage them together when preparing commits.

## TDD / Verification Strategy

There is no useful render-test setup for Vue workspace frame behavior in this repo. Use regression-safe gates:

1. Baseline checks before changes:
   ```bash
   pnpm --filter @mf2/shared-ui typecheck
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   ```
2. Shared-ui phase checks:
   ```bash
   pnpm --filter @mf2/shared-ui typecheck
   pnpm verify:catalog
   ```
3. App integration checks:
   ```bash
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   pnpm verify:features
   ```
4. Final guard:
   ```bash
   pnpm verify:all
   ```

Manual smoke remains required because the critical behavior is visual and cross-component slot rendering:

- `/app/adaccounts` shows the SVG path tab frame.
- Toolbar remains visible.
- Panel 1/2 open/close behavior is present.
- Switching TKQC/BM/Page/Pixel changes table content and Function panel 1.
- Pixel remains truthful empty and does not call APIs.

## Acceptance Criteria

- [ ] `WorkspacePathFrame` exists in `packages/shared-ui` and is exported through a narrow entrypoint.
- [ ] The shared component is generic: no TKQC/BM/Page/Pixel labels or adaccounts imports.
- [ ] The frame ports the SVG path/measurement behavior from `WorkspaceContent.vue` without copying placeholder data ownership.
- [ ] `WorkspaceTabFrame.vue` uses `WorkspacePathFrame` while preserving its public props/emits and slots.
- [ ] `AdAccountsWorkspace.vue` still owns active-tab table/tool selection.
- [ ] Toolbar remains visible and override-friendly for future table actions.
- [ ] Panel 1/2 state is preserved or controlled by the adaccounts frame adapter.
- [ ] Shell placeholder remains unchanged, aside from any already-existing unrelated diff.
- [ ] `.claude/components-catalog.md` documents the new shared-ui component group.
- [ ] `.claude/features/adaccounts-workspace-tabs.md` documents the new frame dependency and behavior.
- [ ] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [ ] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [ ] `pnpm --filter @mf2/adaccounts build` passes, allowing only existing non-blocking warnings.
- [ ] `pnpm verify:catalog`, `pnpm verify:features`, and `pnpm verify:all` pass.

## Out of Scope

- Migrating shell `WorkspaceContent.vue` to the shared component.
- Adding new toolbar actions.
- Adding Page tool API runners.
- Adding Pixel implementation.
- Changing domain localStorage keys or Pinia store ids.
- Moving more feature folders for the domain refactor plan.

## Cross-Plan Dependencies

- This plan blocks `260623-2242-adaccounts-feature-domain-refactor` because the domain refactor's final docs/verification phase must account for the shared frame integration.
- The domain refactor plan has been marked `blockedBy: [260624-0016-workspace-path-frame-restore]`.

## Risks

| Risk | Mitigation |
|---|---|
| Shared component grows app-specific assumptions | Use generic props/slots and no domain labels |
| Slotted tab trigger measurement fails | Require `data-tab-value` on triggers; document this in catalog and phase notes |
| Shared/app mixed commit violates repo rule | Keep phase 2 and phase 3 changes separable; stage/commit separately |
| Visual restore regresses table/tool slots | Do not touch domain components; only move frame shell around existing slots |
| Toolbar future actions require rewrite | Provide a `toolbar` slot and keep default toolbar minimal |
| Existing unfinished refactor conflicts | Mark dependency and avoid moving domain folders in this plan |

## Notes

- `ck` CLI was unavailable in this shell (`ck-missing`), so this plan was created manually in the project `plans/` directory.
- This plan uses `--tdd` style gates even though the project currently relies on typecheck/build/manual smoke for Vue frame behavior.
