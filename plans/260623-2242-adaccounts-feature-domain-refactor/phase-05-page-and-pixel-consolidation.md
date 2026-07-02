---
phase: 5
title: "Page and pixel consolidation"
status: pending
priority: P2
dependencies: [4]
---

# Phase 5: Page and Pixel Consolidation

## Overview

Move Page manager, Page selection, and Page tool action code into `features/page`. Keep Pixel as a truthful empty placeholder.

## Requirements

- Functional: Page tab table/loading UI still renders.
- Functional: Page function panel still renders current Page tools and warnings.
- Functional: Pixel remains empty and stable.
- Non-functional: no fake Pixel API, rows, counts, or tool behavior.

## Architecture

Consolidate Page folders:

```text
features/page/**
features/page-manager/**
features/page-selection/**
features/page-tool-actions/**
```

Into:

```text
features/page/
  api/
  components/
  composables/
  stores/
  tools/
  types/
  index.ts
```

Keep Pixel simple:

```text
features/pixel/
  components/PixelTableView.vue
  components/PixelFunctionPanel.vue
  index.ts
```

## Related Code Files

- Modify: `apps/adaccounts/src/features/page/**`
- Delete after migration: `apps/adaccounts/src/features/page-manager/**`
- Delete after migration: `apps/adaccounts/src/features/page-selection/**`
- Delete after migration: `apps/adaccounts/src/features/page-tool-actions/**`
- Modify: `apps/adaccounts/src/features/pixel/**` only if imports/types need alignment
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`
- Modify: `.claude/features/adaccounts-page-tab.md`
- Modify: `.claude/features/adaccounts-pixel-placeholder.md`
- Modify: `.claude/features/README.md`

## Implementation Steps

1. Move Page manager API/components/composables/types into `features/page`.
2. Move Page selection composable/store into `features/page`.
3. Move Page tool panel/catalog/actions into `features/page/tools`.
4. Resolve shared tool UI dependencies:
   - If only Page uses a helper after Phase 3, keep inside Page.
   - If Page and Adaccounts both use it, extract app-local common outside `features`.
5. Verify Pixel does not import old Page/common paths.
6. Remove old Page folders once typecheck is green.
7. Update feature docs.
8. Run verification.

## Success Criteria

- [ ] `features/page` owns Page table/loading/selection/tools.
- [ ] Removed folders are no longer imported: `page-manager`, `page-selection`, `page-tool-actions`.
- [ ] Pixel remains truthful empty with no new API/data.
- [ ] Any common extraction is app-local and justified by 2+ real usages.
- [ ] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [ ] `pnpm --filter @mf2/adaccounts build` passes or only existing warnings remain.
- [ ] Relevant feature docs pass `pnpm verify:features`.

## Risk Assessment

- Risk: Page tools depend on generic tool components moved in Phase 3.
  - Mitigation: decide common extraction only after actual imports are visible.
- Risk: accidental Pixel scope creep.
  - Mitigation: Pixel files stay placeholder-only; no API folder.
