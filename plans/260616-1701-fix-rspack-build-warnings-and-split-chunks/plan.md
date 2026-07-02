---
title: "Fix Rspack build warnings and split remote chunks"
status: completed
created: 260616-1701
source: ck-plan
brainstorm_report: ../reports/brainstorm-260616-1634-fix-rspack-build-warnings-and-split-chunks-report.md
blockedBy: []
blocks: []
cli_scaffold: unavailable_ck_command_not_found
---

# Fix Rspack build warnings and split remote chunks

## Overview

Khắc phục build warnings hiện tại cho `adaccounts` + `ads-manager`, đồng thời thêm split chunks để remote bundles nhỏ hơn theo budget repo **300KB per asset**. Giữ MF2 runtime/publicPath hiện tại; không xử lý warning `publicPath='auto'` vì đó là thiết kế remote production.

**Design source:** [brainstorm report](../reports/brainstorm-260616-1634-fix-rspack-build-warnings-and-split-chunks-report.md)

> Note: `ck plan create` không chạy được vì `ck` CLI không có trong PATH (`command not found: ck`), nên plan này được tạo thủ công theo template của skill.

## Scope

### In scope
- Align remote Rspack optimization/performance config for:
  - `apps/adaccounts/rspack.config.ts`
  - `apps/ads-manager/rspack.config.ts`
- Add additive shared-ui narrow entrypoints only when needed.
- Replace root `@mf2/shared-ui` imports in app code where clear and low-risk.
- Resolve/suppress verified harmless CSS order warnings.
- Update `.claude/features/*` docs and component catalog if entrypoints/import guidance changes.

### Out of scope
- Do not change production remote `publicPath: 'auto'`.
- Do not remove existing root `@mf2/shared-ui` exports.
- Do not refactor `ComponentShowcasePage.vue` or feature UI beyond import paths.
- Do not attempt deep dependency replacement unless chunks remain >300KB after minimal split.

## Phases

| # | Phase | Status | Priority | File |
|---|---|---|---|---|
| 1 | Align remote Rspack chunking and budgets | completed | P1 | [phase-01-align-remote-rspack-chunking-and-budgets.md](phase-01-align-remote-rspack-chunking-and-budgets.md) |
| 2 | Add narrow shared-ui entrypoints and imports | completed | P1 | [phase-02-add-narrow-shared-ui-entrypoints-and-imports.md](phase-02-add-narrow-shared-ui-entrypoints-and-imports.md) |
| 3 | Resolve CSS order warnings and verify builds | completed | P1 | [phase-03-resolve-css-order-warnings-and-verify-builds.md](phase-03-resolve-css-order-warnings-and-verify-builds.md) |
| 4 | Update docs and lessons | completed | P2 | [phase-04-update-docs-and-lessons.md](phase-04-update-docs-and-lessons.md) |

## Key dependencies

- Phase 2 should run after Phase 1 baseline/split config so bundle impact is easier to compare.
- Phase 3 depends on Phases 1-2 because CSS warning may disappear after import graph changes.
- Phase 4 depends on final files changed and verification results.

## Success criteria

- [x] `pnpm build --apps adaccounts,ads-manager` passes.
- [x] No `Conflicting order` CSS warning remains.
- [x] No asset size warning remains under 300KB per-asset policy, or any remaining warning has exact asset/module rationale.
- [x] Relevant typechecks pass (`@mf2/shared-ui`, `@mf2/adaccounts`, `@mf2/ads-manager` as touched).
- [x] `pnpm verify:all` passes after feature docs/catalog updates.
- [x] Shared-ui changes, if any, are additive only.

## Implementation guardrails

- Keep edits surgical. Do not reformat unrelated config.
- Do not break MF singleton declarations.
- Prefer app config changes over shared package changes when both solve the same problem.
- Shared-ui entrypoints and app import updates may be implemented in the same worktree for verification, but shipping must split commits: shared-ui additive exports first, app import/config changes second.
- If CSS order warnings remain after split/import changes and runtime/build behavior is OK, use a scoped suppress only for verified harmless `Conflicting order` CSS warnings.
- Build logs may be Turbo cache replay; force/clean only if needed to confirm warnings changed.

## Verification commands

```bash
pnpm --filter @mf2/shared-ui typecheck
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/ads-manager typecheck
pnpm build --apps adaccounts,ads-manager
pnpm verify:all
```

## Next steps

After Sếp approves this plan, execute with `/ck:cook /Volumes/Workspace/smit/worktree/client/feat-custom-component/plans/260616-1701-fix-rspack-build-warnings-and-split-chunks/plan.md`.

## Review follow-up

- Code reviewer H1 resolved by evidence, not suppression: tester and main session both ran forced builds after narrow entrypoints; CSS order warnings disappeared naturally, so no `ignoreWarnings` was added.
- Code reviewer H2 resolved: lesson added at `.claude/lessons/rspack-native-css-order-and-mf-split-chunks.md`.
- Code reviewer M1 resolved: `adaccounts-tool-actions.md` now documents `@mf2/shared-ui/sonner` and `@mf2/shared-ui/form-controls`.
- Code reviewer M2 resolved: both remote `performance.maxEntrypointSize` settings now explain entrypoint sum vs per-asset budget.

## Unresolved questions

None.

