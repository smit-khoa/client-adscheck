# Optimize Page Load and Bundle Size

## Goal
Make initial page load faster by reducing code loaded before the user needs it. Do not hide size warnings by raising limits.

## Verified baseline
- `apps/shell/dist/vendors.*.js`: 585.7 KiB.
- `apps/shell/dist/main.*.js`: 185.8 KiB and contains data-grid/shared-ui code.
- `apps/adaccounts/dist/888.*.js`: 445.3 KiB and contains `vee-validate`, `vaul`, `DialogRoot`, `DropdownMenu`, `SelectRoot`, `draggable`.
- `apps/ads-manager/dist/888.*.js`: 445.2 KiB with the same shared-ui dependency profile.

## Root cause hypothesis
Current `@mf2/shared-ui` has only one public export: `packages/shared-ui/src/index.ts`. That barrel exports every shadcn/reka component plus data-grid Table. Small imports like `Icon` or `RemoteLoadingFallback` can pull the large shared-ui graph into shell/remotes. The `ads-manager` standalone `App.vue` also eagerly imports `ComponentShowcasePage.vue`, which imports nearly all shared-ui components and creates 10,000 demo rows.

## Phases
| # | Phase | Status | Priority |
|---|-------|--------|----------|
| 1 | [Measure bundle baseline](phase-01-measure-bundle-baseline.md) | done | P1 |
| 2 | [Implement minimal load optimization](phase-02-implement-minimal-load-optimization.md) | done | P1 |
| 3 | [Verify build and docs](phase-03-verify-build-and-docs.md) | done | P1 |

## Recommended approach
1. Add additive `@mf2/shared-ui` subpath exports for lightweight entrypoints, e.g. `@mf2/shared-ui/icons`, `@mf2/shared-ui/remote`, `@mf2/shared-ui/table`.
2. Update shell and adaccounts imports to use those narrow entrypoints.
3. Lazy-load or isolate `ads-manager` `ComponentShowcasePage.vue` so normal route load does not pay for full showcase/demo data.
4. Build and compare dist sizes.

## Out of scope
- Do not remove shared-ui components.
- Do not change Module Federation lazyCompilation; it is intentionally disabled.
- Do not tune performance budget until actual bundle contents are optimized.
