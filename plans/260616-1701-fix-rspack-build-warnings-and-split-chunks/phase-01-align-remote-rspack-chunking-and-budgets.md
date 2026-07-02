---
phase: 1
title: "Align remote Rspack chunking and budgets"
status: completed
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Align remote Rspack chunking and budgets

## Overview

Add production chunk splitting and performance budget config to the two remote apps so they match the repo's documented 300KB per-asset policy and stop relying on Rspack's default 244KiB warning threshold.

## Requirements

- Functional: `adaccounts` and `ads-manager` production builds split heavy non-singleton dependencies into separate chunks.
- Functional: performance budget uses `300_000` bytes per asset/entrypoint in production, disabled in dev.
- Non-functional: keep MF `shared` singleton config unchanged.
- Non-functional: keep production `publicPath: 'auto'` unchanged.

## Architecture

Remote apps currently expose MF containers and route modules. Their shared singleton dependencies (`vue`, `vue-router`, `pinia`, `@mf2/shared-*`, `vue-sonner`) must remain under `ModuleFederationPlugin.shared`. `splitChunks` should target **non-singleton vendor dependencies** only, such as reka-ui/form/table helper libraries, so MF runtime contracts stay stable.

Recommended cache groups:

```ts
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      rekaUi: { test: /[\\/]node_modules[\\/]reka-ui[\\/]/, name: 'reka-ui', priority: 30, reuseExistingChunk: true },
      tableDeps: { test: /[\\/]node_modules[\\/](@tanstack[\\/]vue-table|vuedraggable)[\\/]/, name: 'table-deps', priority: 25, reuseExistingChunk: true },
      formDeps: { test: /[\\/]node_modules[\\/](@vee-validate[\\/]zod|vee-validate|zod)[\\/]/, name: 'form-deps', priority: 20, reuseExistingChunk: true },
      vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendor', priority: 10, reuseExistingChunk: true },
    },
  },
},
performance: {
  hints: is_dev ? false : 'warning',
  maxAssetSize: 300_000,
  maxEntrypointSize: 300_000,
  assetFilter: (filename: string) => !/\.map$/.test(filename),
},
```

Keep exact regex simple and verify against emitted chunks.

## Related Code Files

- Modify: `apps/adaccounts/rspack.config.ts`
- Modify: `apps/ads-manager/rspack.config.ts`
- Read/reference: `apps/shell/rspack.config.ts`
- Read/reference: `README.md` bundle budget section

## Implementation Steps

1. Add `optimization.splitChunks` to `apps/adaccounts/rspack.config.ts` after `lazyCompilation` or before `experiments` following shell style.
2. Add matching config to `apps/ads-manager/rspack.config.ts`.
3. Add `performance` config to both remotes with 300KB budget.
4. Do not add `runtimeChunk` to remotes unless build output shows a clear need; MF remote runtime can be sensitive, so avoid extra change first.
5. Run build for both remotes and capture before/after asset sizes.

## Success Criteria

- [ ] Both remote configs compile under TypeScript/Rspack.
- [ ] Build emits multiple vendor chunks instead of one large vendor-like asset.
- [ ] No asset size warning for chunks under 300KB.
- [ ] MF manifest/publicPath warning remains accepted and not treated as failure.

## Risk Assessment

- Risk: over-splitting creates too many requests. Mitigation: only 3-4 coarse cache groups.
- Risk: MF singleton packages duplicated into vendor. Mitigation: keep `shared` config untouched and inspect emitted assets/build logs.
- Risk: Turbo cache replays old warnings. Mitigation: use changed config as cache input; if still replaying, run with force/clean during verification.
