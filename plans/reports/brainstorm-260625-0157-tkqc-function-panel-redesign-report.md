---
type: brainstorm-report
topic: tkqc-function-panel-redesign
status: approved-for-planning
created: 2026-06-25
modes: [markdown]
---

# TKQC Function Panel Redesign Brainstorm Report

## Summary

Redesign only TKQC function panels for this round.

Decision: use Hướng A.

- Panel 1 = function catalog grouped into 4 accordion groups.
- Panel 2 = selected function detail, form, steps, run footer.
- Remove current switch + inline expanded form in panel 1.
- Do not touch BM/Page/Pixel in this implementation round.
- Do not add new API runners for tools not wired yet.

## Codebase context

Project stack:

- Vue 3 Composition API + TypeScript.
- Tailwind CSS v4 + shared-ui/shadcn-vue controls.
- Module Federation monorepo, target remote: `apps/adaccounts`.

Relevant files:

| Area | File | Role |
|---|---|---|
| Workspace composition | `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue` | Mounts tab main content + function panels. |
| Frame adapter | `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue` | Owns panel open state; panel 2 currently placeholder. |
| Shared frame | `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue` | Existing 3-panel frame. Should not need contract changes. |
| TKQC panel wrapper | `apps/adaccounts/src/features/adaccounts/components/TkqcFunctionPanel.vue` | Resolves selected accounts and renders `ToolPanel`. |
| TKQC panel | `apps/adaccounts/src/features/adaccounts/tools/components/ToolPanel.vue` | Current flat list + header + footer run button. |
| Current function list | `apps/adaccounts/src/components/tool-actions/ToolList.vue` | Current flat draggable list, switch, inline expand. |
| Current inline form | `apps/adaccounts/src/components/tool-actions/ToolFunctionForm.vue` | Schema-driven form to reuse inside panel 2. |
| State factory | `apps/adaccounts/src/composables/tool-actions/create-tool-actions.ts` | Current order/expanded/enabled/form state. |
| Tool catalog | `apps/adaccounts/src/features/adaccounts/tools/data/adaccount-tool-catalog.ts` | Has `TOOL_GROUPS` and flat `TOOL_FUNCTIONS`. |
| Tool runners | `apps/adaccounts/src/api/tools/index.ts` | Runner registry for wired tools. |

Docs to update after implementation:

- `.claude/features/adaccounts-workspace-tabs.md`
- `.claude/features/adaccounts-tool-actions.md`
- `docs/adaccounts-feature-architecture.md` if architecture docs mention current panel behavior.

## Problem-first inversion

### Solution-jumping diagnosis

Requested solution: rebuild panel 1 and panel 2 to match visual design.

Signal behind request:

- Current panel 1 mixes catalog, selection, enable state, inline form, and run action.
- More tools make the panel hard to scan.
- User wants a clearer two-panel workflow: choose function left, configure/run right.

### Underlying problem

Users need to find and configure TKQC tools quickly without losing context in a long flat list with inline forms.

### Assumption challenges

| Assumption | Risk if wrong | Validation |
|---|---|---|
| One selected function at a time is enough for this round | Users may need multi-tool workflows immediately | Ask/observe whether existing multi-enable is critical. Approved: selected detail first. |
| 4 temporary groups are acceptable | Wrong grouping may confuse users | User confirmed temporary grouping is okay; they will reorder later. |
| Panel 2 can reuse existing field schema | Some design fields may not map 1:1 to current schema | During plan, map all current field types to panel 2 UI. |
| Tools without runner can remain visible | Users may expect every visible tool to run | Show disabled/run warning state truthfully. |

### Problem statement

- Users/context: operators running TKQC tools on selected ad accounts.
- Struggle: tool discovery and configuration are mixed in one narrow panel.
- Cause: flat draggable list + switch + inline expand form overloads panel 1.
- Consequence: slower setup, harder scan, visual mismatch with target product design.
- Success: user selects a tool in panel 1, sees full detail/config/steps in panel 2, then runs it with clear selected-account count.

### Alternative framings

| Frame | Interpretation | Matching solution |
|---|---|---|
| Catalog clarity | Main issue is finding tools | Grouped accordion catalog, search, selected highlight. |
| Configuration clarity | Main issue is cramped forms | Move schema-driven form to panel 2. |
| Workflow building | Main issue is multi-step automation | Full workflow engine with add/remove/reorder steps. Not this round. |

### Evidence status

Medium.

Evidence: user-provided visual design + explicit UX requirements; code scout confirms current UI mismatch and panel 2 placeholder.

### Validation plan

- Verify panel 1 shows 4 groups and can expand/collapse.
- Verify selecting function updates panel 2.
- Verify current form fields render in panel 2, not inline under tool row.
- Verify switch is removed from TKQC function rows.
- Verify existing wired runner still works for selected tool.
- Verify unwired tool gives truthful warning/disabled state.

### Stakeholder message

We will convert TKQC to the new two-panel model first: left side catalog, right side selected function workflow. Group mapping is temporary by product decision. Full multi-step template engine is intentionally deferred to avoid overbuilding before the interaction is proven.

## Evaluated approaches

### Approach A — Selected tool detail in panel 2

Approved.

Behavior:

- Panel 1 shows grouped catalog only.
- Click row -> set selected function.
- Panel 2 renders selected function title, fields, steps, delay, footer actions.
- Run action targets selected function only.

Pros:

- Best balance: matches design, low risk.
- Reuses existing catalog/schema/runner contracts.
- No BM/Page/Pixel churn.
- Clean path to future full workflow.

Cons:

- Changes old TKQC multi-enable behavior.
- Template/multi-step engine remains future work.

### Approach B — Full workflow engine

Behavior:

- Panel 1 adds functions to panel 2 workflow.
- Panel 2 manages many steps, per-step config, delays, templates.

Pros:

- Closest to a real workflow builder.
- Strong foundation for saved templates.

Cons:

- Much bigger scope.
- Requires new store, orchestration, step runner model.
- Higher regression risk.

Rejected for this round.

### Approach C — Keep multi-run, move form only

Behavior:

- Keep enabled set/multi-run.
- Active row controls panel 2 detail.

Pros:

- Preserves old behavior.
- Less runner logic change.

Cons:

- Conflicts with request to remove switch.
- Active vs enabled state confusing.
- Less like target design.

Rejected.

## Final recommended design

### Scope

In scope:

- TKQC panel 1 redesign.
- TKQC panel 2 selected function detail/workflow UI.
- Temporary 4-group mapping:
  - Super Share
  - Kháng TKQC
  - Đổi Info
  - Xoá QTV ẩn
- Remove switch and inline expanded form from TKQC panel 1.
- Reuse existing field schema and runner registry.

Out of scope:

- BM/Page/Pixel redesign.
- Full saved-template persistence.
- Full multi-step workflow engine.
- New Facebook API runners for unwired tools.
- Shared-ui frame contract changes unless implementation proves unavoidable.

### Panel 1 target

Header:

- Title: `Kho chức năng`.
- Search input.
- Small action buttons matching design as much as current shared-ui allows.

Body:

- 4 group accordions.
- Expanded group shows function rows.
- Collapsed groups stay as pill/card headers.
- Function row contains icon + name + optional status indicators.
- Selected function highlighted.
- No switch.
- No inline form below row.

State:

- `selectedFunctionId` is explicit state.
- Group open/closed state is separate from selected tool.
- Existing `valuesFor(fn)` remains source for form values.

### Panel 2 target

Header:

- `Quy trình - 1 bước` or equivalent copy for selected tool.
- Selected function name.

Content:

- Step card for selected function.
- Schema-driven fields rendered using shared-ui controls.
- Delay row/chip using existing runner settings.

Footer:

- `Lưu Template` button: UI only/disabled/no-op unless template behavior is explicitly scoped later.
- `Chạy 1 bước/N tài khoản` button.
- If selected function has no runner, show truthful disabled/warning behavior.

### Runner behavior

- For wired tools, run selected function over selected accounts using existing `runBatch` flow.
- For unwired tools, keep existing truthfulness: toast/warning that tool is not wired to API yet.
- Do not silently fake success.

## Implementation considerations

Likely code changes:

1. Add selected function state to TKQC tool-actions instance.
2. Replace TKQC panel 1 list UI with group-aware catalog component.
3. Move `ToolFunctionForm` usage from inline row to panel 2 detail component.
4. Wire `WorkspaceTabFrame` / `AdAccountsWorkspace` so panel 2 can render TKQC selected detail instead of placeholder for TKQC tab.
5. Keep Page/BM/Pixel unchanged.
6. Update feature docs after code change.

Suggested component split:

| Component | Purpose |
|---|---|
| `ToolGroupList.vue` | TKQC grouped panel 1 catalog. |
| `ToolDetailPanel.vue` | TKQC panel 2 selected tool workflow/detail. |
| Existing `ToolFunctionForm.vue` | Reused field renderer, possibly minor prop/style extension. |

Keep simple:

- Avoid a generic workflow engine in this round.
- Avoid rewriting BM/Page to use same component.
- Avoid adding new shared-ui components unless needed.

## Risks

| Risk | Mitigation |
|---|---|
| Breaking old multi-enable workflow | State explicitly: TKQC now runs selected tool. Confirmed by user direction. |
| Group mapping wrong | User approved temporary arbitrary grouping. Keep mapping easy to edit in catalog. |
| Panel 2 form style mismatch | Reuse shared-ui controls and scoped CSS; compare manually with screenshot. |
| Unwired tools look runnable | Disable or warn truthfully. |
| Component grows >150 LOC | Split group list/detail panel if needed. |

## Success criteria

- `/app/adaccounts` TKQC tab shows redesigned panel 1 with 4 groups.
- Groups expand/collapse to show/hide functions.
- Clicking a function selects it and updates panel 2.
- Panel 2 shows selected function detail, form fields, steps/delay, and footer actions.
- TKQC panel 1 no longer renders switch or inline expanded form.
- Existing wired tools still run against selected TKQC accounts.
- Unwired tools do not fake execution.
- BM/Page/Pixel behavior unchanged.
- Feature docs updated.
- Focused verification passes:
  - `pnpm --filter @mf2/adaccounts typecheck`
  - `pnpm --filter @mf2/adaccounts build`
  - `pnpm verify:features`

## Next steps

Recommended: create `/ck:plan` from this brainstorm report, then implement via `/ck:cook` after plan approval.

Recommended plan mode: default `/ck:plan`, not `--tdd`.

Reason:

- This is primarily UI restructuring and state wiring.
- Existing adaccounts pure UI tests are limited.
- Best verification is typecheck/build plus manual smoke against the screenshot.

## Unresolved questions

None blocking.

Known flexible decision:

- Exact function-to-group mapping is temporary by user decision and can be revised later.
