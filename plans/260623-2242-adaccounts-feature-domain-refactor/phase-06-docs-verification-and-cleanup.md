---
phase: 6
title: "Docs verification and cleanup"
status: pending
priority: P1
dependencies: [5]
---

# Phase 6: Docs, Verification, and Cleanup

## Overview

Remove stale references, update architecture/feature docs, and run final verification guards.

## Requirements

- Functional: no behavior changes beyond completed domain moves.
- Non-functional: docs and feature map match real files; no stale old-folder imports remain.

## Architecture

The final architecture must match:

```text
apps/adaccounts/src/features/
  workspace/
  adaccounts/
  businesses/
  page/
  pixel/
```

Feature docs should describe domain ownership, not historical implementation-owner folders.

## Related Code Files

- Modify: `docs/adaccounts-feature-architecture.md`
- Modify: `.claude/features/README.md`
- Modify: `.claude/features/adaccounts-workspace-tabs.md`
- Modify: `.claude/features/adaccounts-tkqc-tab.md` or renamed successor
- Modify: `.claude/features/adaccounts-bm-tab.md` or renamed successor
- Modify: `.claude/features/adaccounts-page-tab.md`
- Modify: `.claude/features/adaccounts-pixel-placeholder.md`
- Modify/delete/update: old docs referencing removed paths as needed
- Delete: any empty old feature directories left behind

## Implementation Steps

1. Search for stale old folder names across source/docs:
   ```bash
   grep -R "features/\(tkqc\|bm\|account-list\|account-selection\|tool-actions\|bm-data-loading\|bm-actions\|bm-tool-types\|page-manager\|page-selection\|page-tool-actions\)" -n apps/adaccounts .claude/features docs README.md
   ```
2. Update docs to current paths and new domain names.
3. Ensure `.claude/features/README.md` index points to existing docs and real files.
4. Remove empty directories.
5. Run final checks:
   ```bash
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   pnpm verify:features
   pnpm verify:all
   ```
6. Manual smoke if environment is available.
7. Record verification results in `plan.md` validation log or phase completion notes.

## Success Criteria

- [ ] No stale imports or docs point to removed old folders.
- [ ] `docs/adaccounts-feature-architecture.md` documents final structure.
- [ ] `.claude/features` docs pass `pnpm verify:features`.
- [ ] `pnpm verify:all` passes.
- [ ] Manual smoke status is recorded, including skipped reason if not run.
- [ ] Final `features` directory contains only `workspace`, `adaccounts`, `businesses`, `page`, `pixel`.

## Risk Assessment

- Risk: docs become generic and lose gotchas.
  - Mitigation: migrate gotchas from old docs into updated domain docs.
- Risk: `verify:all` flags pre-existing shared/app PR split state.
  - Mitigation: report exact failure honestly; do not hide or weaken guard.
