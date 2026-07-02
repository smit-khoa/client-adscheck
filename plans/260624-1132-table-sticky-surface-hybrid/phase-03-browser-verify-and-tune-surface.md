---
phase: 3
title: "Browser verify and tune surface"
status: in-progress
priority: P1
dependencies: [2]
---

# Phase 3: Browser Verify and Tune Surface

## Overview

Run the app and tune the translucent surface values against real table scrolling. This phase decides whether Hybrid C is sufficient or whether pane refactor must become a follow-up plan.

## Requirements

- Functional: verify both vertical and horizontal scroll bleed-through are fixed.
- Functional: verify table interactions still work.
- Non-functional: preserve visual feel of workspace gradient.
- Non-functional: avoid backdrop blur by default; keep tuning limited to alpha-only values.

## Architecture

The browser check validates the CSS-first architecture from Phase 2. Tuning is limited to alpha-only translucent surface values. If Hybrid C still cannot hide bleed-through while preserving the gradient feel, stop and report; do not escalate into pane refactor inside this implementation.

## Related Code Files

- Read/verify behavior: `apps/adaccounts/src/features/adaccounts/components/AdAccountTable.vue`
- Read/verify behavior: `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`
- Read/verify behavior: `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue`
- Modify if tuning needed: `packages/shared-ui/src/components/ui/table/style.css`

## Implementation Steps

1. Start the relevant dev app using the project's normal command.
2. Open `/app/adaccounts` in browser.
3. Verify sticky header during vertical scroll.
4. Verify frozen columns during horizontal scroll.
5. Freeze/unfreeze a column from header dropdown if needed.
6. Check checkbox frozen column, last frozen shadow, resize handle, header dropdown, and range-select if enabled.
7. Tune alpha values until the background remains visible but scroll bleed is hidden.
8. If alpha-only Hybrid C cannot meet the visual criteria, stop and report with evidence; do not refactor pane/layer architecture.
9. If `showTotal` table is available, verify frozen footer surface.
10. Record final browser result for documentation and final response.

## Success Criteria

- [ ] Header has no readable scroll bleed-through. Browser smoke pending.
- [ ] Frozen columns have no readable scroll bleed-through. Browser smoke pending.
- [ ] Gradient background still feels present. Browser smoke pending.
- [x] Scroll remains smooth by implementation approach; no backdrop blur is used by default.
- [x] If alpha-only cannot satisfy the visual criteria, implementation stops and reports instead of escalating scope.
- [ ] Key table interactions still work. Browser smoke pending.
- [x] Any unverified interaction is reported honestly.

## Risk Assessment

Risk: local app setup blocks browser verification.
Mitigation: report exact blocker; still run static/type/doc checks, but do not claim browser verified.

Risk: no table has `showTotal` available.
Mitigation: mark footer sum as not browser-verified and keep CSS symmetric with frozen footer rules.
