---
phase: 2
title: "Implement minimal load optimization"
status: completed
priority: P1
effort: "1-2h"
dependencies: [1]
---

# Phase 2: Implement minimal load optimization

## Overview
Reduce code loaded before it is needed using additive shared-ui entrypoints and lazy route/demo loading.

## Requirements
- Functional: existing routes still render.
- Non-functional: reduce initial JS for shell and remote route load; keep changes additive and surgical.

## Architecture
Keep Module Federation contract unchanged. Add narrow public entrypoints to `@mf2/shared-ui` so apps can import small surfaces without loading the whole shared-ui barrel. Keep the existing `.` export for backward compatibility.

## Related Code Files
- Modify: `packages/shared-ui/package.json`
- Possibly create: `packages/shared-ui/src/icons/index.ts` already exists if verified; otherwise use existing icon export path.
- Possibly create: `packages/shared-ui/src/remote.ts` exporting `RemoteErrorBoundary` and `RemoteLoadingFallback`.
- Possibly create: `packages/shared-ui/src/table.ts` exporting `Table`.
- Modify: shell imports in `apps/shell/src/**/*.vue`.
- Modify: adaccounts imports in `apps/adaccounts/src/**/*.vue|ts`.
- Modify: `apps/ads-manager/src/App.vue` or route structure to avoid eager showcase import on normal host path.

## Implementation Steps
1. Add subpath exports to shared-ui without removing `.`.
2. Update shell imports for `Icon`, `SpriteProvider`, `SmitLogo`, loading/error components to narrow subpaths.
3. Update adaccounts imports: `Table` from table subpath, icons from icon subpath, type-only `IconName` from icon subpath.
4. Review ads-manager standalone showcase import; lazy-load showcase if it is only a standalone/demo surface.
5. Avoid changing `lazyCompilation: false`.

## Success Criteria
- [x] Typecheck passes for changed packages/apps.
- [x] Build passes for shell/adaccounts/ads-manager.
- [x] Dist size comparison shows shell initial assets and adaccounts largest chunk reduced.

## Risk Assessment
- Shared package change affects all apps. Mitigation: additive exports only, keep old barrel export.
- Deep import paths may bypass package exports. Mitigation: expose stable subpaths in `package.json` instead of importing source internals from apps.
