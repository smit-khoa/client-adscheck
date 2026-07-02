---
phase: 3
title: "Browser verify visual priority"
status: pending
priority: P1
dependencies: [2]
---

# Phase 3: Browser Verify Visual Priority

## Overview

Verify the pane split in the real app. Visual correctness is the priority for this round per Sếp.

## Requirements

- Functional: screenshot issue is fixed.
- Functional: no header/frozen bleed-through during scroll.
- Functional: rows/headers align in the normal table case.
- Non-functional: interaction regressions are reported honestly instead of hidden.

## Related Code Files

- Verify behavior: `apps/adaccounts/src/features/adaccounts/components/AdAccountTable.vue`
- Verify behavior: `apps/adaccounts/src/features/businesses/components/BmTable.vue` if available
- Verify behavior: `apps/adaccounts/src/features/page/components/PageTable.vue` if available
- Modify if tuning needed: `packages/shared-ui/src/components/ui/table/Table.vue`
- Modify if tuning needed: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Start the relevant dev app using the project's normal command.
2. Open `/app/adaccounts`.
3. Check TKQC table against the provided screenshot issue.
4. Scroll vertically and horizontally.
5. Confirm frozen pane/header are visually solid without alpha-mask mismatch.
6. Check standard row alignment across panes.
7. Spot-check checkbox column, frozen divider/shadow, header dropdown, resize, header drag-reorder, range-select, and footer sum if available.
8. Record any interaction regressions as follow-up if visual result is acceptable.

## Success Criteria

- [ ] Header has no readable scroll bleed-through.
- [ ] Frozen columns have no readable horizontal bleed-through.
- [ ] No mismatched translucent block like the screenshot.
- [ ] Rows align across frozen and scrollable panes in standard tables.
- [ ] Visual result is acceptable to continue.
- [ ] Any unverified/regressed interaction is reported honestly.

## Risk Assessment

Risk: local app setup blocks browser verification.
Mitigation: report exact blocker; run static checks; do not claim browser verified.
