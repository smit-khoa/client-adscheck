---
type: brainstorm-report
created: 260625-1411
slug: tkqc-panel-2-step-path-card-redesign
status: completed
---

# Brainstorm — TKQC Panel 2 Step Path Card Redesign

## Summary

Sếp muốn chỉnh TKQC Panel 2 theo ảnh thiết kế: step card nền trắng có path/notch cong ôm pill `Bước N`, có nút `X` để bỏ chọn chức năng, và có icon 6 chấm để kéo thả thứ tự bước.

Khuyến nghị cuối: triển khai app-local bằng `ToolStepFrame.vue` + `reorderSelectedFunctions()` + `vuedraggable`, chỉ reorder selected workflow, không đổi catalog Panel 1, không sửa shared-ui.

## Scout Findings

| Area | Finding |
|---|---|
| Stack | Vue 3 + TypeScript + Module Federation 2.0 + Rspack, package manager pnpm |
| Main UI file | `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue` owns TKQC Panel 2 shell, selected step list, footer run controls |
| Form file | `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue` renders schema-driven fields and already supports `variant="panel-two"` |
| State file | `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts` owns `selectedFunctionIds`, `selectedFunctions`, `expandedStepIds`, `removeSelectedFunction(id)` |
| Existing drag pattern | `vuedraggable` already exists in `apps/adaccounts/package.json`; Panel 1 already uses drag concepts and docs warn not to nest drag handle inside a button |
| Path pattern | `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue` uses responsive SVG path for tab shape, but this step-card shape should stay app-local |
| Docs | `.claude/features/adaccounts-tool-actions.md` is the feature doc to update after implementation |

## Problem-First Framing

### 1. Solution-jumping diagnosis

Requested solution: draw a white path card, add remove button, add drag handle.

Underlying signal: Panel 2 now works functionally but does not yet visually communicate “ordered workflow steps” strongly enough, and users need direct step-level editing.

### 2. Underlying problem

Users configuring TKQC workflows need each selected function to feel like a distinct, reorderable, removable step, while keeping configuration fields readable inside a narrow resizable panel.

### 3. Assumption challenges

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Path card improves clarity | Shape may consume too much panel space | Manual UI smoke at common panel widths |
| Drag should affect workflow only | Users may expect Panel 1 catalog order to change too | Product decision captured: workflow only |
| Remove should keep values | Stale config may surprise users after reselect | Product decision captured: keep value to avoid data loss |
| App-local component enough | Shape might be reused later | YAGNI: promote to shared-ui only after 2+ real consumers |

### 4. Problem statement

- Users/context: TKQC users building multi-step account workflows.
- Struggle: selected functions need clearer step hierarchy and direct manipulation.
- Cause: current card is generic soft card; no remove action and no Panel 2 reorder.
- Consequence: workflow editing requires going back to Panel 1 or is impossible for ordering/removal.
- Success: user sees clear step cards, drags steps to reorder run order, removes a step with X, and form/runner behavior stays unchanged.

### 5. Alternative framings

| Frame | Interpretation | Solution space |
|---|---|---|
| Visual hierarchy problem | Step card does not look like designed workflow | SVG path background + step pill |
| Workflow editing problem | Users need direct manipulation of selected steps | Drag reorder + remove X |
| Component maintainability problem | ToolDetailPanel can become too large | Extract app-local `ToolStepFrame.vue` |

### 6. Evidence status

Medium. Evidence includes direct design image, existing functional Panel 2 implementation, and explicit product-owner decisions from Sếp.

### 7. Validation plan

- Run `pnpm --filter @mf2/adaccounts typecheck`.
- Run `pnpm --filter @mf2/adaccounts build`.
- Run `pnpm verify:features` after docs update.
- Manual smoke:
  - Select multiple tools in Panel 1.
  - Panel 2 shows path-card steps.
  - Drag handle changes step order only in Panel 2.
  - Run button follows reordered sequence.
  - X removes step and selecting it again keeps prior form values.
  - Expand/collapse still works.

### 8. Draft stakeholder message

“We can match the visual direction without turning this into shared-ui work. I recommend keeping the shape/card local to TKQC Panel 2, because it is tied to workflow-step UX. We add direct remove/reorder controls while preserving existing runner logic.”

## Requirements Captured

| Requirement | Decision |
|---|---|
| Expected output | TKQC Panel 2 step card matches provided image direction: white path/notch background, green `Bước N` pill, X remove, 6-dot drag handle |
| Acceptance criteria | Reorder changes workflow order only; remove keeps form values; runner uses reordered selected steps; expand/collapse/form schema unchanged |
| Scope boundary | No Panel 1 catalog redesign, no runner/API change, no template persistence, no shared-ui change |
| Non-negotiable constraints | Vue 3/TS; use existing `vuedraggable`; app-local `ToolStepFrame.vue`; update feature docs |
| Touchpoints | `ToolDetailPanel.vue`, new `ToolStepFrame.vue`, `create-tool-actions.ts`, `.claude/features/adaccounts-tool-actions.md` |

## Approaches Evaluated

### Approach A — Inline SVG/CSS inside `ToolDetailPanel.vue`

Pros:
- Fewest files.
- Fast to implement.
- No new component boundary.

Cons:
- `ToolDetailPanel.vue` already owns runner/footer/workflow logic; adding path SVG + drag + remove makes it harder to maintain.
- Future visual tweaks to the card will be mixed with workflow logic.

Verdict: viable, but not preferred.

### Approach B — App-local `ToolStepFrame.vue` (Recommended)

Pros:
- Keeps `ToolDetailPanel.vue` focused on workflow and runner orchestration.
- Isolates responsive SVG path, title row, drag handle, step pill, and X button.
- App-only, no shared-ui singleton risk.
- Easier to visually iterate against the screenshot.

Cons:
- Adds one new component file.
- Requires prop/emit boundary.

Verdict: best balance of KISS + maintainability.

### Approach C — Shared-ui path card component

Pros:
- Potentially reusable later.
- Could align with `WorkspacePathFrame` pattern.

Cons:
- Premature abstraction; no second consumer yet.
- Shared-ui changes affect all remotes at runtime.
- Violates current task’s app-only direction.

Verdict: reject for this round.

## Recommended Design

### 1. Add workflow-only reorder method

Add to `ToolActionsInstance` in `create-tool-actions.ts`:

```ts
reorderSelectedFunctions(nextIds: string[]): void
```

Behavior:
- Only reorders `selectedFunctionIds`.
- Filters ids to currently selected ids.
- Does not modify `orderedFunctions` or Panel 1 catalog order.
- Keeps `expandedStepIds`, `selectedFunctionId`, and form values.
- Does not write catalog localStorage.

### 2. Create app-local `ToolStepFrame.vue`

Path:

```text
apps/adaccounts/src/features/adaccounts/tools/components/ToolStepFrame.vue
```

Responsibilities:
- Render responsive SVG white path background.
- Render 6-dot drag handle using shared-ui `Icon`.
- Render function icon/title.
- Render green pill `Bước N` with chevron.
- Render X remove button.
- Expose slot for `ToolFunctionForm` and warning.

Events:
- `toggle`
- `remove`

Important:
- Use `@click.stop` for X.
- Drag handle must not be nested inside the title toggle button.
- Keep shape responsive, not fixed pixel-perfect.

### 3. Use `vuedraggable` in `ToolDetailPanel.vue`

Use computed model:

```ts
const selectedStepItems = computed({
  get: () => selectedFunctions.value,
  set: (next) => reorderSelectedFunctions(next.map((fn) => fn.id)),
});
```

Draggable config:
- `item-key="id"`
- `handle=".tool-step-drag-handle"`
- light ghost/chosen classes

### 4. Wire remove

`ToolStepFrame` emits remove. `ToolDetailPanel` calls:

```ts
removeSelectedFunction(fn.id)
```

Expected behavior: step leaves workflow, form values stay in memory; selecting same function again restores prior config.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SVG path breaks on narrow panel | Use responsive `viewBox` + conservative notch dimensions |
| Drag changes Panel 1 order accidentally | Add separate `reorderSelectedFunctions`, do not call existing `reorder()` |
| Expanded state lost on reorder | Reorder ids only; do not clear `expandedStepIds` |
| Remove X triggers expand/collapse | Use `@click.stop` |
| Invalid interactive nesting | Drag handle and remove button are siblings, not inside title button |
| Runner order stale | Runner loops `selectedFunctions`; computed reads reordered `selectedFunctionIds` |

## Success Metrics

- Step card visually follows screenshot direction.
- User can remove any selected step with X.
- User can drag selected steps to change run order.
- Reorder does not affect Panel 1 catalog.
- Re-selecting removed function keeps old form values.
- Typecheck/build/features verification pass.

## Next Step Recommendation

Create an implementation plan with `/ck:plan` using this report as input, then implement via `/ck:cook`.

Recommended plan mode: `/ck:plan` default. TDD is not necessary because this is mostly UI/state wiring in a Vue component with no existing focused tests for drag behavior.

## Unresolved Questions

None. Product decisions captured from Sếp:
- Drag reorder only changes selected workflow.
- X remove keeps form values.
- Use local `ToolStepFrame.vue`.
