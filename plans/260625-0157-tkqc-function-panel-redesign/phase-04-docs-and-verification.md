---
phase: 4
title: "Docs and verification"
status: completed
priority: P1
dependencies: [1, 2, 3]
---

# Phase 4: Docs and Verification

## Overview

Update mandatory feature documentation and verify the TKQC panel redesign through focused type/build checks plus manual smoke testing.

This phase is not optional. Project rules require feature docs to match code after any feature logic/file/route/API change.

## Requirements

- Functional: feature docs describe new TKQC Panel 1/Panel 2 behavior.
- Functional: docs no longer claim TKQC uses switch + inline expand as the current model.
- Functional: docs state BM/Page/Pixel are unchanged.
- Non-functional: run focused verification and report exact results.
- Non-functional: do not hide failing checks.

## Architecture

Documentation updates should reflect actual implementation, not planned behavior. Read docs before editing.

Required docs to inspect/update:

- `.claude/features/adaccounts-workspace-tabs.md`
- `.claude/features/adaccounts-tool-actions.md`
- `docs/adaccounts-feature-architecture.md` if it describes the old tool panel behavior

Optional docs:

- `.claude/components-catalog.md` only if shared-ui/catalog behavior changed. Expected: no update needed.
- `.claude/lessons/README.md` only if implementation exposes a memorable footgun.

## Related Code Files

- Modify: `.claude/features/adaccounts-workspace-tabs.md`
- Modify: `.claude/features/adaccounts-tool-actions.md`
- Modify: `docs/adaccounts-feature-architecture.md` if stale
- Read: `.claude/features/README.md`
- Read: `.claude/lessons/README.md`

## Implementation Steps

1. Read all relevant feature docs after code changes.
2. Update `adaccounts-tool-actions.md`:
   - panel 1 grouped catalog
   - selected function state
   - panel 2 form/workflow
   - runner behavior now selected-function-first
   - removed switch/inline expansion from TKQC UI
3. Update `adaccounts-workspace-tabs.md`:
   - Panel 2 is no longer always placeholder for TKQC
   - TKQC active tab provides selected tool detail in Panel 2
   - BM/Page/Pixel behavior remains unchanged if true
4. Inspect `docs/adaccounts-feature-architecture.md`; update only stale claims about current panel/tool behavior.
5. Run focused checks:
   ```bash
   pnpm --filter @mf2/adaccounts typecheck
   pnpm --filter @mf2/adaccounts build
   pnpm verify:features
   ```
6. If feature docs or shared/app boundary guards changed broadly, run:
   ```bash
   pnpm verify:all
   ```
7. Manual smoke checklist:
   - TKQC 4 groups render
   - group expand/collapse works
   - selecting function updates Panel 2
   - Panel 1 has no switch/inline form
   - Panel 2 run behavior truthful
   - BM/Page/Pixel unchanged
8. Report all verification results honestly.

## Success Criteria

- [x] Feature docs updated to match code.
- [x] Architecture doc updated if stale.
- [x] No unrelated docs churn.
- [x] `pnpm --filter @mf2/adaccounts typecheck` result recorded.
- [x] `pnpm --filter @mf2/adaccounts build` result recorded.
- [x] `pnpm verify:features` result recorded.
- [x] Manual smoke result recorded.
- [x] Any skipped verification is explicitly reported with reason.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Feature docs drift from actual files | Read docs after implementation and list real paths only. |
| Verification fails due existing unrelated issue | Report exact output; do not mark done until scoped regressions are understood. |
| Over-documenting temporary group mapping | State mapping is temporary by product decision, do not imply final taxonomy. |
