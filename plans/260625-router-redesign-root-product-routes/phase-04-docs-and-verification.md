---
phase: 4
title: "Docs and verification"
status: completed
priority: P2
dependencies: [3]
---

# Phase 4: Docs and verification

## Overview

Update route-related feature docs and README references, then run focused verification. This phase is mandatory because route/file behavior changes affect feature docs.

## Requirements

- Functional: feature docs reflect new root product routes.
- Functional: README no longer documents prototype `/app/<remote>` as current behavior.
- Functional: verification commands run and results are recorded in implementation handoff.
- Non-functional: do not document speculative route behavior beyond what was implemented.

## Architecture

Docs to update should describe the final implemented route contract, not the plan wording. Feature docs remain the AI navigation map and must list real paths.

## Related Code Files

- Modify: `.claude/features/README.md`
- Modify: `.claude/features/shell-workspace-content.md`
- Modify: `.claude/features/remote-loading-recovery.md`
- Modify: `.claude/features/adaccounts-workspace-tabs.md`
- Modify: `README.md`
- Optional modify: `docs/system-architecture.md` if it still states `/app/<remote>` as current route contract.
- Optional modify: `.claude/lessons/README.md` only if a new memorable routing footgun is diagnosed during implementation.

## Implementation Steps

1. Update feature index route rows from `/app...` to the new canonical routes.
2. Update shell workspace doc to describe `/home` and shell placeholders.
3. Update remote loading doc to describe `/adscheck-pro/*` and any retained `/ads-manager` route.
4. Update adaccounts workspace tabs doc with tab-specific URLs and URL-as-source-of-truth behavior.
5. Update README routing section and folder comments that still mention `/app/<remote>` as current contract.
6. Run focused verification:
   - `pnpm --filter @mf2/shell typecheck`
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm verify:features`
7. Run `pnpm verify:all` if feature-doc or app/shared boundary guards indicate broader drift.

## Success Criteria

- [x] Feature docs mention canonical root routes.
- [x] Feature docs list all changed real files.
- [x] README current routing section matches implementation.
- [x] No stale `/app/adaccounts` or `/app/<remote>` references remain as current behavior; historical mentions are clearly marked legacy/prototype if kept.
- [x] Focused typechecks pass.
- [x] `pnpm verify:features` passes.

## Risk Assessment

- Risk: docs overstate manual smoke results. Mitigation: only record checks actually run.
- Risk: stale `/app` references remain in comments/docs. Mitigation: search for `/app` after implementation and classify each reference as removed, legacy, or unrelated.
- Risk: verify:features fails from old unrelated doc drift. Mitigation: report exact failure; fix only docs impacted by this task unless failure blocks feature-doc consistency.
