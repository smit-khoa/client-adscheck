---
type: brainstorm-report
topic: apply-tkqc-ui-pattern-to-bm-page
created_at: 2026-06-25 15:30 +07:00
status: ready-for-plan
---

# Brainstorm — Apply TKQC UI Pattern To BM And Page Tabs

## Summary

Sếp muốn áp dụng giao diện pattern đang làm cho tab TKQC sang 2 tab BM và Page trong `adaccounts` remote.

Quyết định đã chốt:

- BM/Page dùng **UI pattern đầy đủ** giống TKQC.
- BM giữ runner/tool behavior hiện tại.
- Page giữ UI-only warning, chưa đấu API thật.
- Không refactor shared-ui, không đổi table/cache/loading logic.

## Codebase Findings

| Area | Finding |
|---|---|
| Stack | Vue 3 + TypeScript + Tailwind v4 + Module Federation 2.0 |
| Workspace owner | `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue` |
| TKQC pattern | Panel 1 catalog (`ToolPanel`) → Panel 2 workflow/detail (`TkqcDetailPanel` + `ToolDetailPanel`) |
| BM current state | `BmFunctionPanel` wraps old `BmActionPanel/BmActionList/BmActionForm`; runner exists in `businesses/tools` |
| Page current state | `PageFunctionPanel` wraps `PageToolPanel`; Page tools are UI-only by feature doc |
| Docs required | Update `adaccounts-bm-tab.md`, `adaccounts-page-tab.md`, likely `adaccounts-workspace-tabs.md` and tool docs if contracts change |

## Problem Statement

BM and Page tabs currently do not match the newly redesigned TKQC function workflow. This causes inconsistent UX across workspace tabs: TKQC uses a clearer two-panel flow, while BM/Page still use older panel interactions or placeholders.

Success means user can switch between TKQC, BM, Page and see the same mental model:

1. Panel 1 = choose functions from a catalog.
2. Panel 2 = configure selected steps / run workflow.
3. Existing data tables and loading behavior stay unchanged.

## Requirements

### Expected Output

- BM tab:
  - Function panel 1 shows BM tool catalog in TKQC-like pattern.
  - Function panel 2 shows selected BM workflow/detail steps.
  - Running uses existing BM runner/composable behavior.

- Page tab:
  - Function panel 1 shows Page tool catalog in TKQC-like pattern.
  - Function panel 2 shows selected Page workflow/detail steps.
  - Running remains truthful UI-only warning / no fake API success.

### Acceptance Criteria

- `/app/adaccounts` tab switch keeps main table behavior unchanged.
- TKQC behavior does not regress.
- BM selected rows still drive BM tools.
- Page selected rows still drive Page tool UI state where applicable.
- Pixel still uses placeholder; no Pixel feature added.
- Typecheck passes for `@mf2/adaccounts`.
- Feature docs match changed files/flow.

### Out Of Scope

- No real Page runner/API wiring.
- No changes to Facebook data loading/cache semantics.
- No shared-ui refactor.
- No broad generic abstraction unless a small local helper clearly reduces duplication.
- No redesign of Pixel.

## Evaluated Approaches

### Option 1 — UI pattern full, keep logic local (Chosen)

Apply TKQC-style Panel 1/Panel 2 flow to BM/Page while preserving existing BM runner and Page UI-only behavior.

**Pros**

- Best fit to request.
- Low-to-medium risk.
- Keeps business logic stable.
- Avoids premature generic abstraction.

**Cons**

- Some duplicate UI structure may remain across TKQC/BM/Page.
- A later cleanup may be useful after pattern stabilizes.

### Option 2 — Generic shared app-local workflow panel

Create generic workflow components used by TKQC/BM/Page.

**Pros**

- More DRY long-term.
- One pattern contract.

**Cons**

- Higher regression risk against TKQC code still in active diff.
- Harder to preserve BM runner and Page UI-only quirks without over-abstracting.
- Larger scope than requested.

### Option 3 — Style-only update

Keep old BM/Page panels and only restyle surfaces.

**Pros**

- Fastest.
- Least code movement.

**Cons**

- Does not achieve real TKQC pattern.
- BM/Page still behave differently from TKQC.

## Recommended Design

Use **Option 1**.

### BM Design

- Keep BM domain under `apps/adaccounts/src/features/businesses`.
- Add a BM detail panel for Function panel 2.
- Adapt BM actions state minimally so selected functions can appear as ordered workflow steps.
- Keep BM runner registry/composable as source of truth for execution.
- Do not rewrite BM APIs or table selection.

### Page Design

- Keep Page domain under `apps/adaccounts/src/features/page`.
- Add a Page detail panel for Function panel 2.
- Reuse Page catalog and existing Page tool-action state.
- Run action remains UI-only warning: no fake success, no API call.

### Workspace Wiring

`AdAccountsWorkspace.vue` should map Panel 2 by tab:

| Tab | Panel 2 |
|---|---|
| TKQC | `TkqcDetailPanel` |
| BM | `BmDetailPanel` |
| Page | `PageDetailPanel` |
| Pixel | placeholder |

## Risks

| Risk | Mitigation |
|---|---|
| BM old action state may not support workflow steps | Add smallest selected-step state locally; avoid full rewrite |
| Page UI-only can be mistaken as real runner | Keep warning copy and docs explicit |
| TKQC regression | Do not edit TKQC components unless needed for a tiny shared helper |
| Docs drift | Update feature docs immediately after code |
| Shared/app PR split already dirty | Avoid further shared-ui edits in this task |

## Validation Plan

1. `pnpm --filter @mf2/adaccounts typecheck`
2. `pnpm verify:features`
3. Manual smoke:
   - TKQC still shows existing catalog/detail workflow.
   - BM shows catalog/detail; selected BM rows count/run behavior still works.
   - Page shows catalog/detail; run reports tools are not wired.
   - Pixel remains placeholder.

## Next Steps

Recommended next command: `/ck:plan` with this report as context, then implementation.

## Unresolved Questions

None.
