---
date: 2026-06-16
type: technical-journal
scope: rspack-build-warnings-split-chunks
status: completed
---

# Rspack build warnings + split chunks

## Context

Build remotes had two noisy warning classes:

- asset size warnings from large remote chunks.
- CSS order warnings in `adaccounts` between shared-ui table/dialog/vue-sonner CSS.

Goal: fix warnings and split chunks without changing MF runtime contracts.

## What happened

- Added remote `splitChunks` to `apps/adaccounts/rspack.config.ts` and `apps/ads-manager/rspack.config.ts` for non-singleton deps: `reka-ui`, table deps, form deps, generic vendor.
- Added performance policy: `maxAssetSize: 300_000`; `maxEntrypointSize: 500_000` because entrypoint is chunk sum, not single emitted asset.
- Added shared-ui narrow entrypoints:
  - `@mf2/shared-ui/sonner`
  - `@mf2/shared-ui/form-controls`
- Updated `adaccounts` imports to avoid root shared-ui barrel for toast/form primitives.
- CSS order warning disappeared naturally from the cleaner import graph; no `ignoreWarnings` needed.
- Updated component catalog, feature docs, and lessons.
- Added lesson: `rspack-native-css-order-and-mf-split-chunks.md`.

## Decisions

- Keep `publicPath: 'auto'` warning as accepted MF manifest info-warn.
- Keep MF singleton packages in `ModuleFederationPlugin.shared`; split only non-singleton transitive deps.
- Prefer narrow shared-ui imports for app code; root barrel remains for compatibility/showcase.
- Do not add scoped CSS suppressor unless warning returns after import graph cleanup.

## Verification

- `pnpm --filter @mf2/shared-ui typecheck` — pass.
- `pnpm --filter @mf2/adaccounts typecheck` — pass.
- `pnpm --filter @mf2/ads-manager typecheck` — pass.
- `pnpm turbo run build --filter @mf2/adaccounts --filter @mf2/ads-manager --force` — pass; no CSS order/asset warnings.
- `pnpm verify:all` — pass.
- Tester gate — DONE.
- Code reviewer gate — DONE_WITH_CONCERNS; concerns resolved.

## Next

- If shipping, split commits by governance: shared-ui additive exports/docs first, app config/import changes second.
- Optional later: inspect emitted chunk composition with analyzer/Rsdoctor if actual total bytes becomes a product concern.

## Unresolved questions

None.
