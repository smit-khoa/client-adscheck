---
title: "Apply TKQC UI Pattern To BM And Page Tabs"
status: pending
priority: P1
effort: medium
branch: smit-khoa/feat-dev-features-2
tags: [adaccounts, bm, page, ui, workflow]
created: 260625-1530
source: plans/reports/brainstorm-260625-1530-apply-tkqc-pattern-to-bm-page-report.md
mode: default-manual-fallback
blockedBy: []
blocks: []
---

# Plan: Apply TKQC UI Pattern To BM And Page Tabs

## Overview

Apply the current TKQC two-panel function workflow pattern to the BM and Page tabs in the `adaccounts` remote: Panel 1 becomes a function catalog, Panel 2 becomes selected workflow/detail steps.

This plan preserves BM runner behavior and keeps Page tools UI-only/truthful. It does not change table loading/cache behavior, Pixel, Facebook API contracts, or shared-ui.

## Context Links

- Brainstorm report: `plans/reports/brainstorm-260625-1530-apply-tkqc-pattern-to-bm-page-report.md`
- Existing TKQC pattern plan: `plans/260625-0157-tkqc-function-panel-redesign/plan.md`
- TKQC Panel 2 card plan: `plans/260625-1411-tkqc-panel-2-step-path-card-redesign/plan.md`
- Feature map: `.claude/features/README.md`
- BM feature doc: `.claude/features/adaccounts-bm-tab.md`
- Page feature doc: `.claude/features/adaccounts-page-tab.md`
- Workspace feature doc: `.claude/features/adaccounts-workspace-tabs.md`
- Tool actions feature doc: `.claude/features/adaccounts-tool-actions.md`

## Fixed Decisions

- BM/Page use the **full TKQC UI pattern**: Panel 1 catalog → Panel 2 workflow/detail.
- BM keeps existing runner registry and execution semantics in `use-bm-runner.ts`.
- Page keeps UI-only behavior; running Page tools must warn truthfully, not fake success.
- Pixel remains placeholder.
- Do not edit `packages/shared-ui` in this task.
- Do not change BM/Page table loading, cache hydration, or selection store contracts.
- Prefer app-local reuse only when it is small and obvious; avoid large generic refactor.

## Scope Challenge

- Existing code: TKQC already has `ToolGroupList`, `ToolDetailPanel`, `ToolStepFrame`; Page already uses generic `createToolActions`; BM has a runner registry but old action state only supports one expanded function/form at a time.
- Minimum changes: add BM selected-step state, add BM/Page detail panels, adapt BM/Page Panel 1 to catalog selection, wire workspace Panel 2 by tab, update docs.
- Complexity: touches >8 files because BM/Page each need panel + state + docs. Scope is justified by matching two tabs, but no shared-ui/API work should be added.
- Selected mode: HOLD SCOPE.

## Target Architecture

```text
apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue
  # Panel 2 routes by active tab: TKQC / BM / Page / Pixel placeholder

apps/adaccounts/src/features/businesses/
  components/BmFunctionPanel.vue          # Panel 1 catalog wrapper
  components/BmDetailPanel.vue            # new Panel 2 selected workflow wrapper
  tools/components/BmActionPanel.vue      # adapt to catalog-only or replace with smaller catalog component
  tools/components/BmActionDetailPanel.vue # new selected BM steps + run footer
  tools/composables/use-bm-actions.ts     # add selectedFunctionIds/selectedFunctions/form values per function
  tools/composables/use-bm-runner.ts      # preserve runner registry and run(id, ctx)

apps/adaccounts/src/features/page/
  components/PageFunctionPanel.vue        # Panel 1 catalog wrapper
  components/PageDetailPanel.vue          # new Panel 2 selected workflow wrapper
  tools/components/PageToolPanel.vue      # adapt to catalog-only or split catalog/detail
  tools/components/PageToolDetailPanel.vue # new selected Page steps; run warns UI-only
  tools/composables/use-page-tool-actions.ts # already uses createToolActions; reuse selected workflow state

.claude/features/
  adaccounts-bm-tab.md
  adaccounts-page-tab.md
  adaccounts-workspace-tabs.md
  adaccounts-tool-actions.md              # only if shared tool-action contract wording changes
```

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [BM workflow state and panel split](phase-01-bm-workflow-state-and-panel-split.md) | pending | Add BM selected-step state and adapt BM panels without changing runners |
| 2 | [Page catalog and detail workflow](phase-02-page-catalog-and-detail-workflow.md) | pending | Reuse Page tool-action state for TKQC-like catalog/detail UI while keeping UI-only run |
| 3 | [Workspace docs and verification](phase-03-workspace-docs-and-verification.md) | pending | Wire BM/Page detail slots, update feature docs, run focused checks |

## Dependency Graph

```text
Phase 1 -> Phase 3
Phase 2 -> Phase 3
```

Phase 1 and Phase 2 can be reasoned independently, but implementation should be sequential in this session to avoid overlapping `AdAccountsWorkspace.vue` edits.

## Scope Boundaries

In scope:

- BM Panel 1 catalog and Panel 2 selected workflow/detail.
- Page Panel 1 catalog and Panel 2 selected workflow/detail.
- BM runner preservation.
- Page UI-only warning preservation.
- Workspace Panel 2 tab wiring.
- Feature docs update.

Out of scope:

- New Page API runners.
- New BM runner behavior.
- Pixel implementation.
- Table loading/cache changes.
- Shared-ui/package edits.
- Full reusable workflow-panel library.
- Template persistence.

## Verification Strategy

Focused checks:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm verify:features
```

Optional if time / after larger file movement:

```bash
pnpm --filter @mf2/adaccounts build
pnpm verify:all
```

Manual smoke:

- TKQC still shows existing catalog/detail workflow.
- BM tab table loads as before; selecting BM rows updates selected ids.
- BM Panel 1 shows catalog; selecting multiple tools creates ordered Panel 2 steps.
- BM Panel 2 runs existing BM runner for selected step(s), including session-level tools that do not require BM selection.
- Page tab table loads as before; Page Panel 1/2 show catalog/detail workflow.
- Page run action warns that tools are not wired to API yet.
- Pixel still uses placeholder.

## Acceptance Criteria

- [ ] BM Panel 1 no longer owns old inline-expanded action form as the primary interaction.
- [ ] BM Panel 2 shows selected BM steps in TKQC-like card/form layout.
- [ ] BM form values are stored per selected function, not one global current form that gets overwritten unexpectedly.
- [ ] BM runner path still uses `useBmRunner().run(id, { bmIds, values })`.
- [ ] BM tools with `requiresBm: false` can still run without row selection.
- [ ] Page Panel 1 shows Page catalog in TKQC-like pattern.
- [ ] Page Panel 2 shows selected Page steps/forms.
- [ ] Page run action remains UI-only truthful warning.
- [ ] Workspace routes Panel 2 by tab: TKQC, BM, Page, Pixel placeholder.
- [ ] No shared-ui files are changed for this task.
- [ ] Feature docs are updated.
- [ ] Focused verification passes or failures are reported honestly.

## Risks

| Risk | Mitigation |
|---|---|
| BM state currently supports only one expanded function | Add minimal per-function selected/form state to `use-bm-actions`; do not rewrite runner registry |
| BM multi-step semantics could accidentally change runner behavior | Run each selected function through existing `run(id, ctx)` in order; preserve `requiresBm` checks |
| Page UI-only could look like real automation | Keep run copy/toast explicit: `chưa được đấu API` |
| Duplicate UI code across tabs | Accept small duplication this round; refactor later only after pattern stabilizes |
| TKQC regression | Avoid editing TKQC files unless needed for tiny local reuse |
| Docs drift | Update BM/Page/workspace docs in Phase 3 before finishing |

## Notes

- `ck` CLI was still unavailable in this shell (`ck not found`), so this plan was created manually with user approval.
- Relevant older TKQC plans were scanned. They are completed and used as source pattern, not blockers.
- Historical domain refactor plan still has pending Page cleanup, but current code already has `features/page`; this UI task can proceed without blocking on that plan.

## Next Step Recommendation

After review, implement with:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-dev-features-2/plans/260625-1530-apply-tkqc-pattern-to-bm-page/plan.md
```

Use `/ck:plan validate` first only if Sếp wants another critical-question gate before coding.
