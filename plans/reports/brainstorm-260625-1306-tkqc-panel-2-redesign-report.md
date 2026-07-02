---
type: brainstorm-report
topic: tkqc-panel-2-redesign
status: approved-for-planning
created: 2026-06-25
modes: [markdown]
---

# TKQC Panel 2 Redesign Brainstorm Report

## Summary

Approved direction: redesign TKQC Function Panel 2 only.

- Scope: khung Panel 2 + field skin.
- Preserve current multi-step workflow.
- Follow Figma node `938:16899` in spirit, responsive to actual resizable panel.
- Keep schema-driven fields: different functions render different fields from catalog.
- Do not rewrite runners, templates, Panel 1, BM/Page/Pixel, or shared frame.

## Codebase Context

Project stack:

- Vue 3 Composition API + TypeScript.
- Tailwind CSS v4 + shadcn-vue/shared-ui controls.
- Module Federation monorepo.
- Target remote: `apps/adaccounts`.

Relevant files:

| Area | File | Role |
|---|---|---|
| Panel 2 UI | `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue` | Current selected workflow step list, run footer, runner wiring. |
| Dynamic fields | `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue` | Schema-driven renderer for text/number/textarea/select/switch/file fields. |
| TKQC wrapper | `apps/adaccounts/src/features/adaccounts/components/TkqcDetailPanel.vue` | Resolves selected accounts and renders Panel 2. |
| Workspace slot | `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue` | Provides `panel-two` slot/fallback. |
| Tool state | `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts` | Owns selected functions, expanded steps, per-tool values. |
| Tool catalog | `apps/adaccounts/src/features/adaccounts/tools/data/adaccount-tool-catalog.ts` | Function definitions and field schemas. |
| Runners | `apps/adaccounts/src/api/tools/index.ts` | Tool runner registry. |

Related docs to update after implementation:

- `.claude/features/adaccounts-tool-actions.md`
- `.claude/features/adaccounts-workspace-tabs.md`

Figma evidence:

- Node: `938:16899`.
- Size: 268 x 236 frame.
- Visual: rounded/cutout panel, close icon, `Bước 1` pill/dropdown, function header row (`Share Admin`), divider, stacked fields (`Hạn mức`) with soft pill input and `VND` suffix.
- `get_design_context` dropped twice; metadata + screenshot were available. Implementation should retry design context if pixel details are needed.

## Requirements

### Expected Output

A planned implementation for redesigning TKQC Panel 2 UI so it renders:

- responsive Figma-inspired panel frame/step cards;
- multi-step workflow unchanged;
- field skin matching Figma spirit;
- function-specific fields from existing schema.

### Acceptance Criteria

- TKQC Panel 2 still shows multiple selected steps in click order.
- Each step can expand/collapse as today.
- Each expanded step renders `ToolFunctionForm` fields.
- Field UI uses Figma-like label/input styling: compact label, pill input, soft surface, clean spacing.
- Different functions still show different fields from `fn.fields`.
- Delay chip/footer run behavior remains truthful and unchanged.
- Unwired tools still warn/disable truthfully; no fake success.
- BM/Page/Pixel remain unchanged.
- Feature docs updated after code change.

### Scope Boundary

In scope:

- `ToolDetailPanel.vue` UI redesign.
- `ToolFunctionForm.vue` field skin changes or minimal variant support.
- Small style-only helper extraction if needed to keep files readable.
- Feature docs update after implementation.

Out of scope:

- No runner API changes.
- No new Facebook tools/runners.
- No saved-template persistence.
- No Panel 1 redesign in this round.
- No BM/Page/Pixel detail workflow redesign.
- No shared `WorkspacePathFrame` contract/style changes.

### Non-Negotiable Constraints

- Use existing Vue 3 + TypeScript patterns.
- Use shared-ui form controls; no hand-rolled inputs/buttons where shared-ui exists.
- Keep app-only changes; avoid `packages/shared-ui` to preserve shared/app split.
- Keep behavior compatible unless explicitly scoped.
- Update matching feature docs after implementation.

## Evaluated Approaches

### Approach A — Redesign Panel 2 frame + field skin, keep behavior

Selected.

Behavior:

- Keep `selectedFunctions` multi-step list.
- Restyle each step card to match Figma spirit.
- Restyle field rows through `ToolFunctionForm`.
- Keep existing runner settings/footer.

Pros:

- Lowest risk.
- Matches user-approved scope.
- Reuses schema-driven field renderer.
- Keeps current workflow and runner behavior.
- Avoids shared package churn.

Cons:

- Not exact pixel-perfect Figma because real panel is resizable.
- Figma shows one compact step; app can show many steps.

### Approach B — Extract `ToolStepFrame.vue`

Behavior:

- Create a small component for one step card.
- `ToolDetailPanel` maps selected functions to `ToolStepFrame`.

Pros:

- Cleaner if `ToolDetailPanel.vue` grows too large.
- Makes step shell reusable inside adaccounts app.

Cons:

- Extra abstraction if current file stays manageable.
- Should only be done if it reduces real complexity.

Decision: allowed only if needed for file size/readability.

### Approach C — Modify shared `WorkspacePathFrame`

Behavior:

- Move panel skin into shared-ui frame.

Pros:

- Shared visual consistency if many apps need it.

Cons:

- Touches `packages/shared-ui` and `apps/*` in same feature scope.
- Higher regression risk for every workspace consumer.
- Violates current need; YAGNI.

Decision: rejected for this round.

## Final Recommended Design

### Panel 2 Shell

Keep one vertical panel:

- Header:
  - title: `Quy trình` + selected step count;
  - compact disabled `Template` action or keep existing truthful template state;
  - collapse button.
- Scroll body:
  - multi-step list;
  - Figma-inspired step cards;
  - delay chip between steps.
- Footer:
  - thread select;
  - disabled `Lưu Template`;
  - run button with current selected step/account count.

### Step Card

Each selected function renders:

- compact card with rounded corners and soft light surface;
- header row:
  - grip icon;
  - function icon;
  - function label;
  - `Bước N` pill with chevron;
- divider when expanded;
- body with dynamic fields from `ToolFunctionForm`;
- warning block if no runner exists.

### Field Skin

`ToolFunctionForm` remains schema-driven.

Target styling:

- label: small, muted green/gray, slightly inset;
- input/select: rounded-full/pill where sensible, light surface;
- textarea: rounded large but not full pill;
- switch: one compact row;
- file input: keep truthful native behavior unless a shared file picker exists;
- no custom per-function hard-coded forms.

### Behavior

Keep current logic:

- selected function ids are ordered by Panel 1 selection.
- `expandedStepIds` controls expanded cards.
- `valuesFor(fn)` owns field values per function.
- `runSelectedWorkflow()` runs selected functions in order.
- `TOOL_RUNNERS[fn.id]` controls actual runner availability.
- `runBatch` and `applyPatches` unchanged.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pixel mismatch due to resizable panel | Use responsive Figma-inspired styling, not fixed 268px. |
| File grows past readability | Extract `ToolStepFrame.vue` only if it clearly reduces complexity. |
| Field skin affects other contexts | If `ToolFunctionForm` is reused elsewhere, add a scoped/variant prop rather than globally changing every context blindly. |
| Shared/app PR split issue | Do not touch `packages/shared-ui` in this round. |
| Unwired tools look runnable | Preserve existing warning/disabled copy. |

## Success Metrics & Validation

Implementation validation should run:

- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`

Manual smoke:

- Open `/app/adaccounts`.
- Select multiple TKQC tools in Panel 1.
- Panel 2 shows Bước 1, Bước 2, ... in order.
- Expand each step; fields match each selected function.
- Field UI visually follows Figma spirit.
- Run button still executes wired tools; unwired tools warn truthfully.
- BM/Page/Pixel unchanged.

## Next Steps

Recommended next step: `/ck:plan` using this report as context, then implement only after plan approval.

## Unresolved Questions

None blocking.

Flexible implementation detail:

- Whether to extract `ToolStepFrame.vue` depends on final `ToolDetailPanel.vue` size/readability during planning.
