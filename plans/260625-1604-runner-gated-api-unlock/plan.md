---
title: "Runner-gated API Unlock For Adaccounts Tools"
status: completed
priority: P1
effort: small
branch: smit-khoa/feat-dev-features-2
tags: [adaccounts, tkqc, bm, page, runners, api]
created: 260625-1604
source: plans/reports/runner-gated-api-unlock-260625-1604-adaccounts-real-runner-report.md
mode: default-manual-fallback
blockedBy: []
blocks: []
---

# Plan: Runner-gated API Unlock For Adaccounts Tools

## Overview

Open the adaccounts tool workflow for real API testing by making runner registries the source of truth: tools with real runners execute, tools without runners stay truthful warnings. Scope covers TKQC, BM, and Page tabs without writing new runners.

## Context Links

- Brainstorm report: `plans/reports/runner-gated-api-unlock-260625-1604-adaccounts-real-runner-report.md`
- Existing BM/Page pattern plan: `plans/260625-1530-apply-tkqc-pattern-to-bm-page/plan.md`
- Feature map: `.claude/features/README.md`
- TKQC feature doc: `.claude/features/adaccounts-tkqc-tab.md`
- BM feature doc: `.claude/features/adaccounts-bm-tab.md`
- Page feature doc: `.claude/features/adaccounts-page-tab.md`
- Tool actions feature doc: `.claude/features/adaccounts-tool-actions.md`

## Fixed Decisions

- Do not write new runner/API logic in this round.
- Do not fake success for unavailable tools.
- TKQC runner source of truth is `TOOL_RUNNERS` in `apps/adaccounts/src/api/tools/index.ts`.
- BM runner source of truth is `useBmRunner().getRunner()` / registry in `use-bm-runner.ts`.
- Page action tools remain unavailable for real actions because no Page action runner exists in current code.
- Page load/list API remains real and separate from Page action runners.
- Do not edit `packages/shared-*`.

## Scope Challenge

- The desired behavior is not “turn on all APIs”; it is “run only existing real runners”.
- Page has real load APIs but no action runner. Treating `page-fetch.ts` as an action runner would be wrong.
- BM already appears mostly unlocked; changes should be minimal and mostly copy/docs if current behavior already matches runner-gated execution.
- TKQC already runs registered tools; update any misleading UI/comment/doc only if needed.
- Selected mode: HOLD SCOPE.

## Target Architecture

```text
TKQC ToolDetailPanel.vue
  selected workflow -> TOOL_RUNNERS[fn.id]
  runner exists -> runBatch(real runner)
  runner missing -> warning/skip, no fake success

BM BmActionDetailPanel.vue
  selected workflow -> useBmRunner().getRunner(fn.id)
  runner exists/viewer/appeal -> run existing path
  runner missing -> warning/skip, no fake success

Page PageToolDetailPanel.vue
  selected workflow -> no action runner registry exists
  run -> explicit unavailable-runner warning
  no action API call attempted
```

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [Audit runner gates](phase-01-audit-runner-gates.md) | completed | Confirm current TKQC/BM/Page execution gates and identify minimal edits |
| 2 | [Apply truthful runner-gated UI copy](phase-02-apply-truthful-runner-gated-ui-copy.md) | completed | Make UI/copy behavior explicit without adding runners |
| 3 | [Update feature docs and verify](phase-03-update-feature-docs-and-verify.md) | completed | Sync feature docs and run focused verification |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3
```

## Scope Boundaries

In scope:

- Runner availability checks for TKQC/BM/Page tool workflows.
- Warning/copy adjustments that clarify unavailable runners.
- Feature docs updates for runner status.
- Focused typecheck/docs verification.

Out of scope:

- New Page action runners.
- New TKQC/BM runners.
- Reusing BM Page-related runners from the Page tab via bridge logic.
- Shared-ui changes.
- Table loading/cache changes.
- UI redesign beyond tiny copy/state changes.
- New tests unless a narrow existing test already covers touched pure logic.

## Verification Strategy

Focused checks:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm verify:features
```

Optional if docs/catalog/shared boundaries changed unexpectedly:

```bash
pnpm verify:all
```

Manual smoke:

- TKQC selected rows + registered tool calls real runner.
- TKQC unregistered tool warns and does not fake success.
- BM registered tool calls existing BM runner.
- BM unregistered/missing runner path warns and does not fake success.
- Page action workflow says no real Page action runner exists yet and does not call an action API.

## Acceptance Criteria

- [x] TKQC still executes only `TOOL_RUNNERS` entries.
- [x] BM still executes only `useBmRunner` registry entries plus existing viewer/appeal paths.
- [x] Page action run remains blocked because no Page action runner exists, with copy clear enough for manual testing.
- [x] No new runner/API implementation is added.
- [x] No fake success path is introduced.
- [x] Feature docs reflect runner status accurately.
- [x] Focused verification passes or failures are reported honestly.

## Risks

| Risk | Mitigation |
|---|---|
| Page “API thật” expectation conflicts with missing action runner | State explicitly in UI/docs: Page loading API is real; Page actions have no runner yet |
| Accidentally weakening BM runner behavior | Preserve existing `useBmRunner().run(id, ctx)` path |
| Over-refactor across three domains | Use local, explicit checks; no shared abstraction |
| Docs drift | Update feature docs in same task |
| `ck` CLI unavailable | Manual plan scaffold; keep template-compatible files |

## Next Step Recommendation

After review, implement with:

```bash
/ck:cook /Volumes/Workspace/smit/worktree/client/feat-dev-features-2/plans/260625-1604-runner-gated-api-unlock/plan.md
```

Use `/ck:plan validate` first only if Sếp wants another gate before coding.
