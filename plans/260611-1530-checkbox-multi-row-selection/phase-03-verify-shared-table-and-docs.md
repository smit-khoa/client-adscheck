---
phase: 3
title: "Verify Shared Table and Docs"
status: completed
priority: P1
effort: "1h"
dependencies: [2]
---

# Phase 3: Verify Shared Table and Docs

## Overview

Validate the shared table change and update required AI feature documentation.

## Requirements

- Functional: test suite and typecheck/build commands prove no obvious regression.
- Functional: feature docs describe checkbox range selection behavior and files.
- Non-functional: report any command failure honestly with output; do not hide failures.

## Architecture

Because this is a `packages/shared-ui` change, verification should focus on shared-ui tests first, then affected consumers. Since behavior is shared globally, docs must update `shared-ui-data-grid-table.md`.

## Related Code Files

- Modify: `.claude/features/shared-ui-data-grid-table.md`
- Maybe read: `.claude/features/adaccounts-account-selection.md` if consumer behavior wording is needed
- Run: `pnpm --filter @mf2/shared-ui test`
- Run: `pnpm --filter @mf2/shared-ui typecheck`
- Run affected/app build or typecheck as practical for this branch
- Run: `pnpm verify:all`

## Implementation Steps

1. Run shared-ui tests.
2. Run shared-ui typecheck.
3. Run feature-doc drift verification.
4. Update `.claude/features/shared-ui-data-grid-table.md`:
   - files list includes new composable/test
   - flow mentions checkbox drag/Shift-click range selection
   - decisions/gotchas mention anchor-state behavior and checkbox/cell range isolation
5. If consumer verification is needed, run adaccounts typecheck/build because it uses `show-checkbox`.
6. Summarize verification results.

## Success Criteria

- [x] `pnpm --filter @mf2/shared-ui test` passes.
- [x] Relevant typecheck/build passes, or failures are reported with exact failing command/output.
- [x] `pnpm verify:all` passes after doc update.
- [x] Feature doc matches real files and behavior.
- [x] No unrelated docs/code are changed.

## Verification

- `pnpm --filter @mf2/shared-ui test` — passed, 42 tests.
- `pnpm --filter @mf2/shared-ui typecheck` — passed.
- `pnpm --filter @mf2/adaccounts typecheck` — passed.
- `pnpm verify:all` — passed.
- Tester subagent validated acceptance criteria; manual browser smoke still recommended before merge.
- Code reviewer found no breaking contracts; recommended cleanups fixed.

## Risk Assessment

- Risk: full repo build is slow.
  - Mitigation: prioritize shared-ui tests/typecheck and affected consumer checks.
- Risk: docs drift hook fails because file paths missing.
  - Mitigation: update docs only after final file paths are known.
