---
phase: 5
title: "Feature docs + verification"
status: pending
priority: P1
effort: "2h"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Feature Docs + Verification

## Overview
Update AI feature documentation to match the new BM data loading code and run the smallest relevant checks plus feature-doc verification.

## Requirements
- Functional: `.claude/features` maps the new BM feature with real paths.
- Functional: existing adaccounts docs stay accurate if advanced-mode file names/flow change.
- Non-functional: do not skip docs; feature docs are mandatory after logic/file/API changes.
- Non-functional: report exact verification output; do not claim pass if command fails or script missing.

## Architecture
Docs remain in `.claude/features/` as the AI navigation map. New feature doc should describe flow and APIs, not duplicate all TypeScript types.

## Related Code Files
- Modify: `.claude/features/README.md`
- Create: `.claude/features/adaccounts-bm-data-loading.md`
- Modify: `.claude/features/adaccounts-basic-mode.md` if advanced placeholder/path/flow changes.
- Optional modify: `.claude/lessons/README.md` and new lesson only if a memorable footgun is discovered.
- Read: `.claude/features/_TEMPLATE.md`

## Implementation Steps
1. Read `.claude/features/_TEMPLATE.md` before writing the new doc.
2. Create `adaccounts-bm-data-loading.md` with required sections:
   - Purpose
   - Flow
   - Entry points / Routes
   - Files
   - APIs used
   - State
   - Permissions / Flags
   - Verification
   - Related
   - Decisions / Gotchas
3. Add a row to `.claude/features/README.md` for “AdAccounts — BM data loading”.
4. Update `adaccounts-basic-mode.md` only for changed advanced-mode paths/behavior.
5. If implementation uncovers a non-obvious runtime/build footgun, add/update a lesson; otherwise explicitly report “Lesson: n/a”.
6. Run checks:
   - `pnpm verify:features`
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts build`
   - `pnpm verify:all` if feature docs/shared/app boundary guard should be fully checked.
7. Fix any failures caused by the implementation. If a failure is unrelated/pre-existing, report evidence and do not hide it.

## Success Criteria
- [ ] New feature doc exists and lists verified real file paths.
- [ ] Feature README index includes the new BM data loading row.
- [ ] Existing docs no longer say advanced mode is only placeholder if changed.
- [ ] `pnpm verify:features` passes.
- [ ] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [ ] `pnpm --filter @mf2/adaccounts build` passes or exact blocker is reported.

## Risk Assessment
- Risk: feature-doc verify fails because docs list speculative paths. Mitigation: list only files actually created.
- Risk: implementation touches shared packages accidentally. Mitigation: run `pnpm verify:all` and keep PR split discipline.
- Risk: no real FB login for manual verification. Mitigation: report manual verification as skipped/blocked; still run static/build checks.
