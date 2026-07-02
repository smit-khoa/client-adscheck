---
phase: 2
title: "Document and verify shared-ui table change"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Document and verify shared-ui table change

## Overview

Update AI feature documentation and run focused verification for the shared-ui table visual default change.

## Requirements

- Functional: feature doc reflects that Table defaults to transparent surfaces.
- Non-functional: verification commands pass; report any skipped manual browser checks honestly.

## Architecture

This phase does not add code. It syncs `.claude/features/shared-ui-data-grid-table.md` with the final implementation and runs guards that protect shared-ui/app boundaries.

## Related Code Files

- Modify: `.claude/features/shared-ui-data-grid-table.md`
- Read/verify: `.claude/features/README.md`

## Implementation Steps

1. Update `shared-ui-data-grid-table.md` Decisions/Gotchas or Theming notes with the transparent default behavior.
2. Run `pnpm --filter @mf2/shared-ui typecheck`.
3. Run `pnpm verify:features`.
4. Prefer `pnpm verify:all` because a `packages/shared-*` path changed and docs must stay consistent.
5. If app can be run, manually smoke adaccounts tables; otherwise report manual smoke skipped.

## Success Criteria

- [x] Feature doc is updated and points to real touched files.
- [x] `pnpm --filter @mf2/shared-ui typecheck` passes.
- [x] `pnpm verify:features` passes.
- [x] `pnpm verify:all` attempted; failed only at `verify-pr-split` because the working tree already mixes `packages/shared-*` and `apps/*` changes.
- [x] Manual smoke status is reported.

## Risk Assessment

- Risk: docs understate global blast radius. Mitigation: explicitly mention `shared-ui` singleton/global Table default.
- Risk: verify:all catches shared/app split issue from existing working tree. Mitigation: report exact result; do not hide failures.
