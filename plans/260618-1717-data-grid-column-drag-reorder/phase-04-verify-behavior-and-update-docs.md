---
phase: 4
title: "Verify behavior and update docs"
status: pending
priority: P1
effort: "1.5h"
dependencies: [3]
---

# Phase 4: Verify behavior and update docs

## Overview

Run the smallest reliable automated checks, update mandatory feature documentation, and perform/record manual UI verification for drag reorder edge cases.

## Requirements

- Functional: verify reorder behavior does not break adjacent table interactions.
- Functional: update `.claude/features/shared-ui-data-grid-table.md` to document header drag reorder.
- Non-functional: report any skipped manual browser checks honestly.

## Architecture

Verification combines automated project guards and manual interaction checks because native header drag behavior is DOM-heavy.

Automated:
- TypeScript compile via shared-ui typecheck.
- AI memory/feature docs guards via `pnpm verify:all`.

Manual:
- Browser test of frozen/non-frozen drag, invalid cross-zone drag, reload persistence, resize/dropdown/range-select after reorder.

## Related Code Files

- Modify: `.claude/features/shared-ui-data-grid-table.md`
- Read/verify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read/verify: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Update feature doc files list and decisions/gotchas with header drag reorder behavior.
2. Run `pnpm --filter @mf2/shared-ui typecheck`.
3. Run `pnpm verify:all`.
4. If app can be launched in scope, manually verify the checklist in a browser.
5. Record results in final implementation summary.

## Success Criteria

- [ ] Shared-ui typecheck passes.
- [ ] `pnpm verify:all` passes.
- [ ] Feature doc reflects the new behavior and touched files.
- [ ] Manual checklist is completed or explicitly marked skipped with reason.

## Risk Assessment

- Risk: automated tests pass but drag UX is off by pixels.
  - Mitigation: manual browser verification is required before calling feature complete.
- Risk: feature docs drift.
  - Mitigation: run `pnpm verify:all` after doc update.
