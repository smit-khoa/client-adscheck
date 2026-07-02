---
title: "TKQC Panel 2 Step Path Card Redesign"
status: completed
priority: P1
effort: medium
branch: smit-khoa/feat-dev-features-2
tags: [adaccounts, tkqc, ui, workflow]
created: 260625-1411
source: plans/reports/brainstorm-260625-1411-tkqc-panel-2-step-path-card-redesign-report.md
mode: default
blockedBy: []
blocks: []
---

# Plan: TKQC Panel 2 Step Path Card Redesign

## Overview

Update TKQC Function Panel 2 so selected workflow steps match the approved image direction: each step becomes a white responsive path-card with curves around the `Bước N` title pill, a right-side `X` remove action, and a 6-dot drag handle for reordering selected workflow steps.

This plan is a follow-up to the completed Panel 2 visual polish. It changes only selected-step editing and card shell UI; it must not change Panel 1 catalog order, runner behavior, template persistence, or shared-ui contracts.

## Context Links

- Brainstorm report: `plans/reports/brainstorm-260625-1411-tkqc-panel-2-step-path-card-redesign-report.md`
- Previous Panel 2 polish: `plans/260625-1306-tkqc-panel-2-redesign/plan.md`
- Original TKQC panel redesign: `plans/260625-0157-tkqc-function-panel-redesign/plan.md`
- Feature map: `.claude/features/README.md`
- Tool actions feature doc: `.claude/features/adaccounts-tool-actions.md`
- Component catalog: `.claude/components-catalog.md`

## Fixed Decisions

- Dragging steps in Panel 2 changes **selected workflow order only**.
- Dragging steps in Panel 2 does **not** change Panel 1 catalog/group order.
- Pressing `X` removes the function from the selected workflow but keeps its form values in session.
- Use an app-local `ToolStepFrame.vue`; do not add a shared-ui component.
- Keep `ToolFunctionForm.vue` schema-driven and continue using `variant="panel-two"`.
- Keep runner path through `selectedFunctions`, `TOOL_RUNNERS`, `runBatch`, and `applyPatches`.
- No `packages/shared-ui` edits for this task.

## Target Architecture

```text
apps/adaccounts/src/composables/tool-actions/
  create-tool-actions.ts                 # add reorderSelectedFunctions(nextIds)

apps/adaccounts/src/features/adaccounts/tools/components/
  ToolDetailPanel.vue                    # use vuedraggable over selected workflow steps
  ToolStepFrame.vue                      # new app-local responsive path-card frame

.claude/features/
  adaccounts-tool-actions.md             # update workflow remove/reorder docs
  adaccounts-workspace-tabs.md           # update only if wording changes
```

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [State and reorder model](phase-01-state-and-reorder-model.md) | completed | Add workflow-only reorder support without touching catalog order |
| 2 | [Step path frame component](phase-02-step-path-frame-component.md) | completed | Build local path-card shell with drag handle, title pill, X button, and slot |
| 3 | [Panel 2 integration](phase-03-panel-two-integration.md) | completed | Wire vuedraggable, remove action, expanded state, and runner order |
| 4 | [Docs and verification](phase-04-docs-and-verification.md) | completed | Update feature docs and run focused checks/manual smoke |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
```

## Scope Boundaries

In scope:

- TKQC Panel 2 selected-step path-card shell.
- Workflow-only drag reorder for selected steps.
- X remove action for selected steps.
- Preserve form values after remove/reselect.
- Feature docs update.

Out of scope:

- Panel 1 catalog redesign/order changes.
- BM/Page/Pixel panel changes.
- Template persistence.
- New runner/API behavior.
- Shared-ui component/package changes.
- New unit/e2e test infrastructure.

## Verification Strategy

Focused checks:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
pnpm verify:features
```

Manual smoke:

- Open `/app/adaccounts` TKQC tab.
- Select multiple functions in Panel 1.
- Panel 2 renders white path-card steps with green `Bước N` pill.
- Drag 6-dot handle changes Panel 2 order.
- Panel 1 group/catalog order is unchanged by Panel 2 drag.
- Run button executes steps in reordered order.
- `X` removes a selected step.
- Re-selecting removed function keeps previous field values.
- Expand/collapse still works.
- Wired/unwired runner behavior unchanged.

## Acceptance Criteria

- [x] Step card visually follows provided image direction.
- [x] Path/notch is responsive inside resizable Panel 2.
- [x] Each step has a right-side `X` that removes it from workflow.
- [x] Removed step form values are preserved when reselected.
- [x] Each step has a 6-dot drag handle.
- [x] Dragging steps changes selected workflow order only.
- [x] Runner loop uses reordered step order.
- [x] Expand/collapse still uses `expandedStepIds` and `toggleStepExpanded`.
- [x] `ToolFunctionForm` remains schema-driven via `fn.fields`.
- [x] No `packages/shared-ui` changes are introduced.
- [x] `.claude/features/adaccounts-tool-actions.md` updated.
- [x] Focused verification passes or failures are reported honestly.

## Risks

| Risk | Mitigation |
|---|---|
| SVG path breaks at narrow widths | Use responsive SVG `viewBox`, conservative notch dimensions, and no fixed pixel-perfect shell |
| Drag accidentally changes Panel 1 order | Add separate `reorderSelectedFunctions`; never call catalog `reorder()` from Panel 2 |
| Expanded state lost on reorder | Reorder ids only; keep `expandedStepIds` intact |
| Remove X triggers toggle | Use `@click.stop` in the remove button |
| Invalid interactive nesting | Keep drag handle and remove button as siblings, not nested inside toggle button |
| Runner order stale | Keep `selectedFunctions` computed from reordered `selectedFunctionIds` |

## Next Step Recommendation

After reviewing this plan:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-dev-features-2/plans/260625-1411-tkqc-panel-2-step-path-card-redesign/plan.md
```
