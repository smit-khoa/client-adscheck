---
title: "TKQC Function Panel Redesign"
status: completed
created: 260625-0157
source: plans/reports/brainstorm-260625-0157-tkqc-function-panel-redesign-report.md
mode: default
blockedBy: []
blocks: []
---

# Plan: TKQC Function Panel Redesign

## Overview

Redesign the TKQC function panels in the `adaccounts` remote to match the approved design direction: Panel 1 becomes a grouped function catalog, and Panel 2 becomes the selected function detail/workflow area.

This plan intentionally changes TKQC away from the old flat list + switch + inline-expanded form model. It does not touch BM/Page/Pixel, does not add new Facebook API runners, and does not build a full multi-step template engine in this round.

## Context Links

- Brainstorm report: `plans/reports/brainstorm-260625-0157-tkqc-function-panel-redesign-report.md`
- Feature map: `.claude/features/README.md`
- Workspace feature doc: `.claude/features/adaccounts-workspace-tabs.md`
- Tool actions feature doc: `.claude/features/adaccounts-tool-actions.md`
- Architecture doc: `docs/adaccounts-feature-architecture.md`
- Existing overlap to watch: `plans/260623-2242-adaccounts-feature-domain-refactor/plan.md`

## Fixed Decisions

- Apply the redesign to **TKQC only** in this round.
- Panel 1 groups are temporary and product-editable later:
  - `Super Share`
  - `Kháng TKQC`
  - `Đổi Info`
  - `Xoá QTV ẩn`
- Function-to-group mapping may be arbitrary but should stay easy to edit.
- Selecting a function in Panel 1 updates Panel 2.
- Remove the current TKQC switch and inline-expanded form from Panel 1.
- Panel 2 owns selected function fields, step card, delay display/control, and footer actions.
- Existing wired runners should still run; unwired tools must not fake execution.
- `Lưu Template` is visual/disabled/no-op unless a later plan explicitly scopes template persistence.
- Do not change BM/Page/Pixel behavior.
- Do not change shared-ui frame contract unless implementation proves it unavoidable.

## Target Architecture

```text
apps/adaccounts/src/features/adaccounts/
  components/TkqcFunctionPanel.vue              # still resolves selected accounts, now wires panel 1 + selected state
  tools/
    components/ToolPanel.vue                    # TKQC panel 1 container, grouped catalog only
    components/ToolGroupList.vue                # new grouped function list / accordion UI
    components/ToolDetailPanel.vue              # new selected function panel 2 detail/workflow
    composables/use-tool-actions.ts             # TKQC instance exposes selected function state
    data/adaccount-tool-catalog.ts              # add/edit 4 temporary UI groups

apps/adaccounts/src/composables/tool-actions/
  create-tool-actions.ts                        # add selectedFunctionId/selectFunction computed helpers
  tool-actions-context.ts                       # expose selected state only if shared child components need injection

apps/adaccounts/src/components/tool-actions/
  ToolFunctionForm.vue                          # reuse schema-driven form; adapt only if needed for panel 2 styling/props

apps/adaccounts/src/features/workspace/
  pages/AdAccountsWorkspace.vue                 # route TKQC panel 2 slot to ToolDetailPanel
  components/WorkspaceTabFrame.vue              # make panel-two slot caller-overridable without losing placeholder fallback
```

Keep the final file split simple. If `ToolPanel.vue` stays under 150 LOC after a clean split, do not add extra abstraction. If panel 2 detail grows, keep it in `ToolDetailPanel.vue` and reuse `ToolFunctionForm.vue` rather than duplicating field rendering.

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [State and catalog model](phase-01-state-and-catalog-model.md) | completed | Add selected-function state and temporary 4-group catalog mapping without changing UI yet |
| 2 | [Panel one grouped catalog](phase-02-panel-one-grouped-catalog.md) | completed | Replace TKQC flat switch/inline list with grouped selectable function catalog |
| 3 | [Panel two selected detail workflow](phase-03-panel-two-selected-detail-workflow.md) | completed | Render selected function detail/form/steps in Panel 2 and run selected tool truthfully |
| 4 | [Docs and verification](phase-04-docs-and-verification.md) | completed | Update required feature docs and run focused checks/manual smoke |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
```

Keep phases linear. Panel 2 depends on selected-function state and Panel 1 selection behavior.

## Scope Boundaries

In scope:

- TKQC function catalog visual redesign.
- TKQC selected-function detail workflow in Panel 2.
- Current field schema reuse.
- Current runner registry reuse.
- Feature docs update.

Out of scope:

- BM/Page/Pixel redesign.
- Full template persistence.
- Multi-tool workflow builder.
- Reordering steps inside Panel 2.
- New Facebook API runners.
- Shared package changes, unless a tiny additive slot contract fix becomes unavoidable.

## Verification Strategy

Focused checks:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
pnpm verify:features
```

Broader guard if docs/shared boundaries changed unexpectedly:

```bash
pnpm verify:all
```

Manual smoke:

- Open `/app/adaccounts` and TKQC tab.
- Panel 1 shows `Kho chức năng` and 4 groups.
- Expand/collapse group shows/hides functions.
- Click a function: row highlights and Panel 2 updates.
- Panel 1 has no switch and no inline expanded form.
- Panel 2 shows selected tool fields/step/delay/footer.
- Wired tool can run selected accounts.
- Unwired tool reports disabled/warning truthfully.
- BM/Page/Pixel panels behave as before.

## Acceptance Criteria

- [x] TKQC Panel 1 uses the new grouped catalog model.
- [x] The four approved group labels render.
- [x] Group open/close state is independent from selected function state.
- [x] Selecting a function updates Panel 2.
- [x] Current TKQC switch UI is removed from Panel 1.
- [x] Current inline expanded form is removed from Panel 1.
- [x] Panel 2 renders selected function title, form fields, step UI, delay, and footer actions.
- [x] Existing wired runners still execute through current `runBatch` path.
- [x] Unwired tools do not fake execution.
- [x] BM/Page/Pixel unchanged.
- [x] `.claude/features/adaccounts-workspace-tabs.md` updated.
- [x] `.claude/features/adaccounts-tool-actions.md` updated.
- [x] `docs/adaccounts-feature-architecture.md` updated if current panel behavior is documented there.
- [x] Focused verification passes.

## Cross-Plan Notes

`plans/260623-2242-adaccounts-feature-domain-refactor/plan.md` is still pending for Page/Pixel cleanup, but the TKQC/adaccounts domain consolidation phases are completed. This plan does not need to block on it. During implementation, avoid broad path moves and update docs carefully to avoid stale claims in both scopes.

## Risks

| Risk | Mitigation |
|---|---|
| Old multi-enable behavior disappears unexpectedly | This is an approved behavior shift; call it out in implementation summary. |
| Group mapping feels wrong | Keep mapping in one catalog section and label it temporary. |
| Panel 2 becomes a fake workflow engine | Limit to selected-tool step UI; no template persistence or multi-step orchestration. |
| Runner target becomes ambiguous | Run selected function only; footer copy must say selected function/step count. |
| Shared-ui/app PR split violation | Avoid shared-ui changes. If unavoidable, split work before commit/PR. |

## Completion Notes

Completed in this session.

Verification results:

- `pnpm --filter @mf2/adaccounts typecheck` — passed.
- `pnpm --filter @mf2/adaccounts build` — passed with 3 non-blocking Rspack warnings: CSS order warnings for vue-sonner/dialog/table and asset size warnings for two chunks.
- `pnpm verify:features` — passed.
- `pnpm verify:all` — passed.
- Tester subagent — passed with concerns: no unit tests for adaccounts UI/state and initial selected function defaults to first tool.
- Code-reviewer subagent — core redesign passed; review fixes applied for zero-selection run guard, Template typo, and disabled placeholder buttons.

Manual browser smoke was not run in this session.

## Next Step Recommendation

After reviewing this plan, the fastest safe path is:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-dev-features-2/plans/260625-0157-tkqc-function-panel-redesign/plan.md
```

Optional before implementation:

```bash
/ck:plan validate /Volumes/Workspace/smit/worktree/client/feat-dev-features-2/plans/260625-0157-tkqc-function-panel-redesign/plan.md
```

Use validation if Sếp wants a final critical-question pass on the UI/behavior trade-offs before coding.
