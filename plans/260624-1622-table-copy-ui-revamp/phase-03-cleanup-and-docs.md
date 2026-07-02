---
phase: 3
title: "Remove picker/preset, clean tests, update feature doc"
status: pending
priority: P2
dependencies: [2]
---

# Phase 3: Cleanup + docs

## Overview
Delete the now-unused column-picker + preset system and its tests, remove dangling
references, and update the feature doc to match the simplified copy flow.

## Requirements
- Functional: no behavior change beyond removal of dead code; build + tests green.
- Non-functional: no orphan imports; feature doc accurate.

## Architecture
After Phase 2 the flow no longer imports picker/preset. Safe to delete the files and
the `<RangeCopyPicker>` template block + import in `Table.vue`. The copy-core test file
imports preset helpers — split out the preset-specific describe blocks, keep copy-core tests.

## Related Code Files
- Delete: `packages/shared-ui/src/components/ui/table/RangeCopyPicker.vue`
- Delete: `packages/shared-ui/src/components/ui/table/composables/range-copy-presets.ts`
- Delete: `packages/shared-ui/src/components/ui/table/composables/__tests__/range-copy-presets.test.ts`
- Modify: `packages/shared-ui/src/components/ui/table/composables/__tests__/use-range-copy.test.ts` (remove preset import + preset describe blocks at lines ~4, ~115-138)
- Modify: `packages/shared-ui/src/components/ui/table/Table.vue` (remove `RangeCopyPicker` import ~570 + template block ~534-545)
- Modify: `.claude/features/shared-ui-data-grid-table.md` (remove picker/preset entries, document settings dropdown + global copyHeader)

## Implementation Steps
1. Remove `RangeCopyPicker` import + `<RangeCopyPicker …>` block from `Table.vue`.
2. Delete `RangeCopyPicker.vue`, `range-copy-presets.ts`, `range-copy-presets.test.ts`.
3. In `use-range-copy.test.ts`: drop the `range-copy-presets` import and the preset describe blocks; keep copy-core (`getCopyEntries`, `buildTSV`, etc.) tests.
4. Grep for any remaining references: `grep -rn "range-copy-presets\|RangeCopyPicker\|computePickerDefault\|savePreset" packages/shared-ui` → expect none.
5. Update feature doc: remove RangeCopyPicker + preset bullets; add settings-dropdown + `range_copy_include_header` localStorage note.

## Success Criteria
- [ ] No references to picker/preset anywhere in `packages/shared-ui` (grep clean).
- [ ] `pnpm --filter @mf2/shared-ui test` passes (copy-core tests intact).
- [ ] `pnpm --filter @mf2/shared-ui typecheck` + build green.
- [ ] Feature doc reflects the new flow (no picker/preset, dropdown + global header toggle).

## Risk Assessment
- Risk: `use-range-copy.test.ts` may share setup with preset tests → check imports/helpers before deleting blocks.
- Risk: leftover preset reference in another file → mitigated by the grep gate in step 4.
