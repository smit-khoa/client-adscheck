---
phase: 4
title: "Document Scrollbar Follow-up and Verify Guards"
status: completed
priority: P1
dependencies: [1, 2, 3]
---

# Phase 4: Document Scrollbar Follow-up and Verify Guards

## Overview

Update feature documentation and record verification results. Document fake scrollbar as a follow-up direction without implementing it in this bugfix plan.

## Requirements

- Functional: feature doc reflects range action coordinate fix, dropdown active reset, frozen pane seam, and scrollbar follow-up decision.
- Functional: focused tests and docs guards are run and results recorded.
- Non-functional: no new markdown outside approved `plans/` or feature-doc location; no app changes.

## Architecture

Feature docs are mandatory for shared-ui table changes. The fake scrollbar outcome should be captured as a decision/gotcha:

- Native scrollbar belongs to `.table-pane-scroll-body`, so it naturally starts after frozen pane.
- Do not replace the body scroller with shadcn/reka ScrollArea in this fix because it risks virtualization and range geometry.
- Follow-up should use an overlay synced scrollbar if product wants a visual scrollbar spanning from the frozen/table edge.

## Related Code Files

- Modify: `.claude/features/shared-ui-data-grid-table.md`
- Read/verify: `packages/shared-ui/src/components/ui/table/Table.vue`
- Read/verify: `packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts`
- Read/verify: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Update `.claude/features/shared-ui-data-grid-table.md` in the Decisions/Gotchas or relevant range-select/pane-split sections.
2. Record the fake scrollbar follow-up direction: overlay synced scrollbar, not shadcn ScrollArea replacement.
3. Run focused checks:
   - `pnpm --filter @mf2/shared-ui test`
   - `pnpm --filter @mf2/shared-ui typecheck`
   - `pnpm verify:features`
   - `pnpm verify:all` when feasible.
4. If a command fails, report exact output and whether failure is caused by this change or pre-existing mixed shared/app state.
5. Complete manual browser smoke checklist or explicitly report if not run.

## Success Criteria

- [ ] Feature doc updated and passes `pnpm verify:features`.
- [ ] Test/typecheck results recorded.
- [ ] `pnpm verify:all` result recorded, including known `verify-pr-split` mixed-change blocker if it appears.
- [ ] Manual browser smoke status recorded honestly.
- [ ] Fake scrollbar is documented as follow-up only; no fake scrollbar code added.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Docs drift from code | Update doc after implementation, not before final behavior is known. |
| `verify:all` fails due existing mixed `packages/shared-*` + `apps/*` changes | Report exact guard output; do not hide failure. |
| Browser smoke unavailable | State not run; do not claim visual verification. |
