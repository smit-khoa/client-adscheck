---
phase: 4
title: "Update docs and lessons"
status: completed
priority: P2
effort: "45m"
dependencies: [3]
---

# Phase 4: Update docs and lessons

## Overview

Update AI-facing feature docs/catalog and any useful lesson so future work understands the remote splitChunks policy, narrow shared-ui imports, and CSS order warning decision.

## Requirements

- Functional: matching `.claude/features/*` docs reflect changed files/verification.
- Functional: component catalog import guidance stays accurate if new shared-ui entrypoints are added.
- Non-functional: docs record decisions/gotchas, not duplicated code.
- Non-functional: do not create a lesson unless the final fix reveals a reusable footgun.

## Architecture

Relevant docs likely include:

- `.claude/features/remote-loading-recovery.md` because it already documents remote rspack configs and MF loading behavior.
- `.claude/features/shared-ui-data-grid-table.md` if table import/CSS gotchas or entrypoints change.
- `.claude/components-catalog.md` if import guidance should mention narrow entrypoints (`@mf2/shared-ui/sonner`, etc.).
- `.claude/lessons/*` only if the final diagnosis is memorable and not derivable from code.

## Related Code Files

- Modify: `.claude/features/remote-loading-recovery.md`
- Modify if needed: `.claude/features/shared-ui-data-grid-table.md`
- Modify if needed: `.claude/components-catalog.md`
- Create/modify if justified: `.claude/lessons/build-warnings-css-order-and-asset-split.md`
- Reference: `.claude/features/README.md`
- Reference: `.claude/lessons/README.md`

## Implementation Steps

1. Update `remote-loading-recovery.md` Files/Decisions/Verification sections if remote rspack config changes.
2. Update shared-ui data-grid feature doc if table entrypoint/import behavior or CSS warning rationale changes.
3. Update component catalog import guidance if new subpath entrypoints become the preferred path.
4. If creating a lesson, follow `_TEMPLATE.md` and add a row to `.claude/lessons/README.md`.
5. Run `pnpm verify:all`.

## Success Criteria

- [ ] Feature docs list real changed paths and verification commands.
- [ ] Component catalog does not contradict `docs/code-standards.md` narrow import guidance.
- [ ] Lesson created only if it adds non-obvious reusable knowledge.
- [ ] `pnpm verify:all` passes.

## Risk Assessment

- Risk: docs drift by over-documenting speculative behavior. Mitigation: document only verified final changes.
- Risk: lesson duplicates existing optimization plan. Mitigation: check `.claude/lessons/README.md` first and update existing lesson if applicable.
