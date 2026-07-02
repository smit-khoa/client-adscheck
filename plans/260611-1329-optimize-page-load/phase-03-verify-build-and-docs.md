---
phase: 3
title: "Verify build and docs"
status: completed
priority: P1
effort: "30m"
dependencies: [2]
---

# Phase 3: Verify build and docs

## Overview
Prove the optimization works and update feature/docs memory for changed shared-ui/remote loading behavior.

## Requirements
- Functional: app builds still pass.
- Non-functional: docs reflect changed import surfaces and verification data.

## Architecture
No new architecture. Verification compares before/after build outputs.

## Related Code Files
- Modify: `.claude/features/remote-loading-recovery.md` if shell remote imports change.
- Modify: `.claude/features/shared-ui-data-grid-table.md` if table public entrypoint changes.
- Possibly modify: `.claude/features/adaccounts-basic-mode.md` if adaccounts import/route behavior changes.
- Possibly modify: `docs/code-standards.md` if new shared-ui import convention should be documented.

## Implementation Steps
1. Run `pnpm verify:all`.
2. Run relevant typecheck commands.
3. Run relevant build commands.
4. Re-measure `dist` JS/CSS sizes and compare with baseline.
5. Update feature docs for changed public import paths/behavior.

## Success Criteria
- [x] `pnpm verify:all` passes.
- [x] `pnpm --filter @mf2/shared-ui typecheck` passes if shared-ui changed.
- [x] App builds pass.
- [x] Final report includes before/after sizes.

## Risk Assessment
Build may still warn due remaining vendor size. That is acceptable only if measured initial route payload improves; do not claim warning solved unless the warning disappears.
