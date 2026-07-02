---
phase: 1
title: "Feature shell + mode/tab integration"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Feature Shell + Mode/Tab Integration

## Overview
Replace the advanced-mode placeholder with a small real advanced surface that can host the BM data loading view while preserving the current basic TKQC page as-is.

## Requirements
- Functional: user can switch from current basic mode into advanced mode and see an entry for BM data loading.
- Functional: user can return to basic mode with existing behavior intact.
- Non-functional: no direct API call in pages/components; advanced surface only composes feature components.
- Non-functional: keep changes inside `apps/adaccounts` unless docs are updated later.

## Architecture
Keep `mode-store` unchanged (`basic | advanced`). Change advanced mode from text-only placeholder to a presentation feature. Use a local tab/state inside advanced mode if needed:

```text
AdAccountsPage -> AdvancedModeView -> BmDataLoadingView
```

Do not create a separate remote or route for BM. Same `/app/adaccounts` route remains.

## Related Code Files
- Modify: `apps/adaccounts/src/features/advanced-mode/pages/AdvancedModePlaceholder.vue` or rename to `AdvancedModeView.vue` if implementation prefers clearer name.
- Modify: `apps/adaccounts/src/features/advanced-mode/index.ts`.
- Create later/consume: `apps/adaccounts/src/features/bm-data-loading/components/BmDataLoadingView.vue`.
- Read-only safety: `apps/adaccounts/src/pages/AdAccountsPage.vue`, `apps/adaccounts/src/stores/mode-store.ts`.

## Implementation Steps
1. Keep `AdAccountsPage.vue` mode switch contract unchanged.
2. Convert advanced placeholder into a focused advanced surface with:
   - title: BM data loading / Business Manager,
   - back-to-basic button,
   - mount point for `BmDataLoadingView`.
3. Use `@mf2/shared-ui` primitives for buttons/badges if touched; avoid hand-rolled new primitives.
4. Keep current basic-mode imports and selection/tool behavior untouched.

## Success Criteria
- [ ] `/app/adaccounts` still renders basic mode by default.
- [ ] Existing button can switch to advanced mode.
- [ ] Advanced mode shows BM data loading view placeholder/entry point.
- [ ] Back button returns to basic mode.
- [ ] No new API logic exists in advanced-mode page.

## Risk Assessment
- Risk: renaming `AdvancedModePlaceholder.vue` can cause stale feature-doc paths. Mitigation: update `.claude/features/adaccounts-basic-mode.md` in Phase 5.
- Risk: accidental basic-mode behavior drift. Mitigation: avoid touching `BasicModeView.vue` unless import rename requires it.
