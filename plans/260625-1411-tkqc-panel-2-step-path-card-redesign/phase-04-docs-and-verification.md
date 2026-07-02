---
phase: 4
title: "Docs and Verification"
status: completed
priority: P1
dependencies: [3]
---

# Phase 4: Docs and Verification

## Overview

Update required feature documentation and run focused checks for the Panel 2 path-card, remove, and workflow-only reorder behavior.

## Requirements

- Functional: feature docs describe step remove/reorder behavior accurately.
- Functional: focused verification passes or failures are reported honestly.
- Non-functional: no unrelated docs churn.

## Architecture

Docs affected:

```text
.claude/features/adaccounts-tool-actions.md
  # selected workflow reorder, remove X, ToolStepFrame path-card

.claude/features/adaccounts-workspace-tabs.md
  # update only if Panel 2 wording changes
```

## Related Code Files

- Modify: `.claude/features/adaccounts-tool-actions.md`
- Modify if needed: `.claude/features/adaccounts-workspace-tabs.md`
- Run checks from repo root.

## Implementation Steps

1. Update `adaccounts-tool-actions.md` Purpose/Flow/Files/State/Gotchas for:
   - `ToolStepFrame.vue`;
   - Panel 2 drag handle;
   - workflow-only reorder;
   - X remove keeps form values.
2. Update `adaccounts-workspace-tabs.md` only if final Panel 2 slot wording changes.
3. Run `pnpm --filter @mf2/adaccounts typecheck`.
4. Run `pnpm --filter @mf2/adaccounts build`.
5. Run `pnpm verify:features`.
6. Manual smoke if dev server/browser is available; otherwise report not run.
7. If app/shared boundary changed unexpectedly, also run `pnpm verify:all`.

## Success Criteria

- [x] Required feature docs updated.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes or failure reported.
- [x] `pnpm --filter @mf2/adaccounts build` passes or failure reported.
- [x] `pnpm verify:features` passes or failure reported.
- [x] Manual smoke status reported.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Docs overclaim pixel-perfect match | Describe Figma-inspired/path-card direction, not exact pixel dimensions |
| Docs miss state behavior | Explicitly document workflow-only reorder and value preservation |
| Build warnings mistaken for failures | Report warnings separately from blocking failures |
