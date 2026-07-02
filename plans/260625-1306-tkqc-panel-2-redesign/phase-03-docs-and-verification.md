---
phase: 3
title: "Docs and Verification"
status: completed
priority: P1
dependencies: [2]
---

# Phase 3: Docs and Verification

## Overview

Update required feature docs and run focused verification after Panel 2 visual changes.

## Requirements

- Functional: feature docs describe the new Panel 2 visual/field-skin behavior accurately.
- Functional: focused checks pass or failures are reported honestly.
- Non-functional: no unrelated documentation churn.

## Architecture

Docs affected by code behavior/UI description:

```text
.claude/features/adaccounts-tool-actions.md
  # Panel 2 selected workflow and schema form styling notes

.claude/features/adaccounts-workspace-tabs.md
  # TKQC Panel 2 slot behavior if wording needs update
```

## Related Code Files

- Modify: `.claude/features/adaccounts-tool-actions.md`
- Modify if needed: `.claude/features/adaccounts-workspace-tabs.md`
- Run checks from repo root.

## Implementation Steps

1. Update `adaccounts-tool-actions.md` for Panel 2 frame/field skin if code changed UI behavior/structure.
2. Update `adaccounts-workspace-tabs.md` only if Panel 2 slot/workspace wording changed.
3. Run:
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts build`
   - `pnpm verify:features`
4. If app/shared boundaries changed unexpectedly, also run `pnpm verify:all`.
5. Manual smoke if a dev server is available; otherwise report not run.

## Success Criteria

- [x] Required feature docs updated.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes or failure reported.
- [x] `pnpm --filter @mf2/adaccounts build` passes or failure reported.
- [x] `pnpm verify:features` passes or failure reported.
- [x] Manual smoke status reported.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Docs claim more than implementation did | Keep docs factual and scoped to final code. |
| Build warnings mistaken for failures | Report warnings separately from blocking failures. |
| Manual smoke skipped silently | State explicitly if not run. |
