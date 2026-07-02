---
slug: rspack-native-css-order-and-mf-split-chunks
scope: build
status: active
---

## Symptom

Rspack production build passes but prints warnings like:

- `Conflicting order between ... dialog/style.css and ... table/style.css`
- `Conflicting order between ... vue-sonner/lib/index.css and ... table/style.css`
- asset size warnings for one large remote chunk even though the repo policy is 300KB per emitted asset.

## Root cause

With `experiments.css: true`, Rspack uses native CSS handling. The usual `CssExtractRspackPlugin.ignoreOrder` advice does not apply unless that plugin owns CSS extraction. If CSS enters the graph through broad root-barrel imports, unrelated component styles (`table`, `dialog`, `sonner`) can be bundled into the same CSS chunk and Rspack reports nondeterministic order even when selectors do not overlap.

Module Federation `shared` declarations also affect chunk splitting: singleton packages (`vue`, `vue-router`, `pinia`, `@mf2/shared-*`, `vue-sonner`) are resolved through the MF shared scope, so splitChunks should target only non-singleton transitive deps (`reka-ui`, form deps, table deps, generic vendor). Splitting MF singletons as normal vendors risks duplicate runtime instances.

## How to avoid

1. Prefer narrow shared-ui entrypoints in app code (`@mf2/shared-ui/table`, `/sonner`, `/form-controls`, `/icons`, `/remote`) instead of the root `@mf2/shared-ui` barrel. This often removes CSS-order warnings naturally by keeping unused component CSS out of the chunk.
2. If CSS order warnings remain after verifying selectors are independent and runtime is OK, suppress only the exact native CSS `Conflicting order` warning via Rspack `ignoreWarnings`; do not use `CssExtractRspackPlugin.ignoreOrder` in native CSS mode.
3. For remotes, keep MF singleton deps in `ModuleFederationPlugin.shared` and split only non-singleton deps with coarse cache groups.
4. Treat `maxAssetSize` as the repo's per-emitted-asset budget. If `splitChunks` creates multiple assets, `maxEntrypointSize` may need to be higher because an entrypoint is a sum of chunks, not a single asset.

## Related

[[remote-loading-recovery]] [[shared-ui-data-grid-table]] [[vue-sonner-toast-needs-mf-singleton]]
