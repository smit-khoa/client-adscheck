---
title: "TKQC Panel 2 Redesign"
status: completed
created: 260625-1306
source: plans/reports/brainstorm-260625-1306-tkqc-panel-2-redesign-report.md
mode: default
blockedBy: []
blocks: []
---

# Plan: TKQC Panel 2 Redesign

## Overview

Redesign TKQC Function Panel 2 in the `adaccounts` remote to match the approved Figma-inspired direction: update the panel/step frame and field skin while preserving the current multi-step workflow and runner behavior.

This plan intentionally does not touch Panel 1, BM/Page/Pixel detail flows, Facebook runners, template persistence, or shared-ui frame contracts.

## Context Links

- Brainstorm report: `plans/reports/brainstorm-260625-1306-tkqc-panel-2-redesign-report.md`
- Prior completed related plan: `plans/260625-0157-tkqc-function-panel-redesign/plan.md`
- Feature map: `.claude/features/README.md`
- Tool actions feature doc: `.claude/features/adaccounts-tool-actions.md`
- Workspace tabs feature doc: `.claude/features/adaccounts-workspace-tabs.md`
- Component catalog: `.claude/components-catalog.md`

## Fixed Decisions

- Apply changes to TKQC Panel 2 only.
- Scope is **khung + field skin**.
- Preserve current multi-step behavior: selected functions render as `Bước 1`, `Bước 2`, ... in click order.
- Use Figma node `938:16899` as a visual direction, not fixed 268px pixel-perfect layout.
- Keep fields schema-driven via `ToolFunctionForm.vue` and `fn.fields`.
- Keep existing runner path through `TOOL_RUNNERS`, `runBatch`, and `applyPatches`.
- Do not modify `packages/shared-ui` unless implementation proves impossible without it; current recommendation is app-only changes.

## Target Architecture

```text
apps/adaccounts/src/features/adaccounts/tools/components/
  ToolDetailPanel.vue                 # redesign Panel 2 shell, step cards, delay/footer styling

apps/adaccounts/src/components/tool-actions/
  ToolFunctionForm.vue                # field skin / optional variant support for Panel 2

.claude/features/
  adaccounts-tool-actions.md          # update behavior/design docs after implementation
  adaccounts-workspace-tabs.md        # update Panel 2 UI mention if needed
```

Keep the implementation surgical. If `ToolDetailPanel.vue` becomes hard to read, extract a local app-only `ToolStepFrame.vue`; otherwise avoid new abstraction.

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [Audit current Panel 2](phase-01-audit-current-panel-two.md) | completed | Confirm exact DOM/state/style points to preserve before editing |
| 2 | [Redesign step frame and field skin](phase-02-redesign-step-frame-and-field-skin.md) | completed | Apply Figma-inspired responsive styling while preserving behavior |
| 3 | [Docs and verification](phase-03-docs-and-verification.md) | completed | Update feature docs and run focused checks |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3
```

## Scope Boundaries

In scope:

- TKQC Panel 2 shell/header/body/footer visual polish.
- Step card visual redesign.
- Dynamic field skin in `ToolFunctionForm.vue`.
- Existing warning/empty states restyled if needed.
- Feature docs update.

Out of scope:

- Panel 1 redesign.
- BM/Page/Pixel changes.
- Saved template persistence.
- New step execution model.
- New Facebook API runners.
- Shared-ui frame changes.
- Unit/e2e test infrastructure creation.

## Verification Strategy

Focused checks:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
pnpm verify:features
```

Manual smoke:

- Open `/app/adaccounts` TKQC tab.
- Select multiple tools in Panel 1.
- Panel 2 shows multiple steps in order.
- Expand/collapse steps still works.
- Each function shows its own configured fields.
- Field UI follows Figma spirit: compact label, pill/soft input, clean spacing.
- Wired tools still run; unwired tools warn truthfully.
- BM/Page/Pixel unchanged.

## Acceptance Criteria

- [x] TKQC Panel 2 keeps current multi-step workflow.
- [x] Step cards visually match the approved Figma-inspired direction.
- [x] Field layout/skin matches the approved Figma-inspired direction.
- [x] Different functions still render different field sets from schema.
- [x] Runner behavior is unchanged and truthful.
- [x] No shared-ui package changes are introduced.
- [x] `.claude/features/adaccounts-tool-actions.md` updated.
- [x] `.claude/features/adaccounts-workspace-tabs.md` updated if wording changes.
- [x] Focused verification passes or failures are reported honestly.

## Cross-Plan Notes

The earlier `260625-0157-tkqc-function-panel-redesign` plan is completed and already introduced the current Panel 2 workflow. This plan is a visual polish pass on that completed feature. It should not reopen old Panel 1 scope.

## Risks

| Risk | Mitigation |
|---|---|
| Visual polish accidentally changes run behavior | Keep logic untouched; only move markup/style where needed. |
| `ToolFunctionForm` style affects other contexts | Use a prop/variant or scoped wrapper if global change would leak. |
| Pixel-perfect attempt breaks resizable panel | Use responsive Figma-inspired sizing, no fixed 268px shell. |
| File grows too large | Extract `ToolStepFrame.vue` only if it reduces real complexity. |
| Feature docs drift | Update docs in Phase 3 before finishing. |

## Next Step Recommendation

Recommended after review:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-dev-features-2/plans/260625-1306-tkqc-panel-2-redesign/plan.md
```

Use `/ck:plan validate` first only if Sếp wants one more requirement interview before implementation.
