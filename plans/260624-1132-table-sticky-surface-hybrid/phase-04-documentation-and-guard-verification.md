---
phase: 4
title: "Documentation and guard verification"
status: pending
priority: P1
dependencies: [3]
---

# Phase 4: Documentation and Guard Verification

## Overview

Update feature documentation and run guard commands after the pane split implementation.

## Requirements

- Functional: feature doc describes full pane split decision.
- Functional: verification results are captured.
- Non-functional: no stale claim that Hybrid C alpha-mask is the accepted final direction.
- Non-functional: respect shared/app PR split guard.

## Related Code Files

- Modify: `.claude/features/shared-ui-data-grid-table.md`
- Run guards: `pnpm --filter @mf2/shared-ui test`, `pnpm --filter @mf2/shared-ui typecheck`, `pnpm verify:features`, `pnpm verify:all`

## Implementation Steps

1. Update `.claude/features/shared-ui-data-grid-table.md` with pane-split behavior and known follow-ups.
2. Remove/replace Hybrid C final-decision wording.
3. Run focused package checks.
4. Run docs/architecture guards.
5. Use code-reviewer and tester gates.
6. Final response must state what passed, failed, skipped, or was not browser-verified.

## Success Criteria

- [ ] Feature doc matches code behavior.
- [ ] `pnpm verify:features` passes.
- [ ] Shared-ui test/typecheck are attempted and results recorded.
- [ ] `pnpm verify:all` attempted or skipped with reason.
- [ ] No undocumented behavior change remains.

## Risk Assessment

Risk: docs still describe Hybrid alpha-mask.
Mitigation: explicitly update decisions/gotchas to pane split and mark alpha-mask as rejected by screenshot validation.
