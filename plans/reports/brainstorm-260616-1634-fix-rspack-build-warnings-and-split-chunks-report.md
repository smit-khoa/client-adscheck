# Brainstorm Report — Fix Rspack build warnings + split remote chunks

---
type: brainstorm-report
date: 2026-06-16
scope: rspack-build-warnings-css-order-asset-size
status: design-approved
approved_approach: config-plus-narrow-shared-ui-entrypoints
---

## Summary

Sếp muốn khắc phục build warnings trong MF2 remotes và split chunk để tối ưu load.

Đã scout codebase và chốt hướng **B**:

1. Thêm split chunks + performance budget 300KB cho remote apps.
2. Giảm root `@mf2/shared-ui` imports bằng narrow entrypoints khi rõ ràng.
3. Xử lý CSS order warning bằng entrypoint/import structure nếu đơn giản; fallback `ignoreWarnings` scoped nếu Rspack native CSS vẫn báo conflict vô hại.
4. Cập nhật feature docs/catalog/lesson nếu thay đổi shared-ui hoặc build behavior.

## Codebase findings

- Repo: Vue 3 + TypeScript + Rspack + Module Federation 2.0 monorepo, pnpm + Turbo.
- `shell` already has `optimization.splitChunks`, `runtimeChunk`, `performance.maxAssetSize = 300_000` in `apps/shell/rspack.config.ts`.
- `adaccounts` and `ads-manager` currently lack splitChunks/performance budget; they use Rspack default asset warning threshold (~244KiB).
- `adaccounts` CSS order warning comes from shared-ui CSS side effects:
  - `packages/shared-ui/src/components/ui/dialog/DialogContent.vue` imports `./style.css`.
  - `packages/shared-ui/src/components/ui/table/Table.vue` imports `./style.css`.
  - `packages/shared-ui/src/components/ui/sonner/Sonner.vue` imports `vue-sonner/style.css`.
- Root barrel `@mf2/shared-ui` is still used in apps for `Toaster`, `toast`, form components. Docs prefer narrow subpath imports to avoid pulling too much shared-ui into chunks.
- MF manifest warning for `publicPath='auto'` should be left alone: it matches remote production behavior.

## Requirements captured

### Expected output

Build config/import/CSS structure changed so:

- `adaccounts` no longer emits `Conflicting order` CSS warnings.
- `adaccounts` and `ads-manager` have split chunks for non-singleton vendor groups.
- Asset size warnings align with repo policy: **300KB per asset**.
- Related feature docs updated.

### Acceptance criteria

- `pnpm build --apps adaccounts,ads-manager` passes.
- No `Conflicting order` warning remains.
- No asset size warning remains under 300KB policy, or any remaining warning is documented with exact asset/module reason.
- Typecheck for touched workspaces passes.
- `pnpm verify:all` passes if `.claude/features`/shared boundaries are touched.
- No public API break in `packages/shared-*`; new shared-ui entrypoints are additive only.

### Scope boundary

Out of scope:

- Do not fix/suppress MF manifest `publicPath='auto'` warning unless it becomes a real runtime issue.
- Do not refactor remote feature pages beyond imports needed for narrow entrypoints.
- Do not remove shared-ui components or change existing public exports.
- Do not chase total byte reduction deeply unless chunk split still leaves >300KB assets.

### Non-negotiable constraints

- Follow MF governance: shared changes are additive.
- Avoid over-engineering; surgical changes only.
- If shared-ui and app changes both happen, be careful with PR/commit split policy.
- Update matching `.claude/features/*` docs after logic/build/import changes.
- Keep Rspack production behavior compatible with current same-origin deployment flow.

## Approaches evaluated

| Approach | What | Pros | Cons | Decision |
|---|---|---|---|---|
| A — Config-only | Add remote splitChunks, 300KB budget, scoped ignoreWarnings | Lowest risk, fastest | Does not reduce root barrel pull; CSS conflict suppressed not structurally improved | Not enough |
| B — Config + narrow entrypoints | A + add/use narrow shared-ui entrypoints for sonner/form imports | Best balance; reduces accidental dependency pull; aligns docs | Touches shared-ui + apps; must update docs | **Chosen** |
| C — Deep audit + CSS restructure | B + Rsdoctor/analyzer + central CSS order design | Most precise | Too large for current warning; may over-engineer CSS | Defer |

## Recommended design

### 1. Remote Rspack config alignment

Apply shell's proven production pattern to remotes where appropriate:

- `optimization.splitChunks.chunks = 'all'`.
- Cache groups for heavy non-singleton dependencies, e.g. `reka-ui`, table/drag deps, form validation deps, generic vendor.
- `performance.hints = is_dev ? false : 'warning'`.
- `maxAssetSize = 300_000`, `maxEntrypointSize = 300_000`.
- Keep `publicPath: 'auto'` for production remotes.

### 2. Narrow shared-ui entrypoints

Additive only:

- Prefer existing `@mf2/shared-ui/icons`, `@mf2/shared-ui/table`, `@mf2/shared-ui/core`, `@mf2/shared-ui/remote`.
- Add focused entrypoints only if needed, likely:
  - `@mf2/shared-ui/sonner` for `Toaster`/`toast`.
  - Possibly `@mf2/shared-ui/form` or component-specific subpaths for `Input`, `Label`, etc. only if current imports clearly pull excessive root barrel.

Then update app imports from root barrel where practical.

### 3. CSS order handling

Preferred order:

1. See if narrow imports naturally remove order conflict.
2. If Rspack native CSS still reports conflict between isolated selectors, add scoped `ignoreWarnings` for the known `Conflicting order` warning in the affected remote config.

Rationale: `experiments.css: true` uses native CSS extraction; `CssExtractRspackPlugin.ignoreOrder` is not applicable. Existing selectors are separate enough that order warning is likely harmless.

### 4. Verification

Run minimal + relevant checks:

- `pnpm --filter @mf2/shared-ui typecheck` if shared-ui exports change.
- `pnpm --filter @mf2/adaccounts typecheck` and `pnpm --filter @mf2/ads-manager typecheck` if app imports change.
- `pnpm build --apps adaccounts,ads-manager` with cache bypass/changed inputs to avoid replayed stale warnings.
- `pnpm verify:all` after docs/feature changes.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| SplitChunks conflicts with MF runtime/shared singleton behavior | Remote chunks fail at runtime | Keep singleton shared config unchanged; split only non-singleton deps; build and smoke verify |
| More chunks increase request count | Slight overhead | HTTP/2/modern CDN handles this; improves per-asset cacheability |
| Root barrel changes accidentally break consumers | Compile/runtime break | Add entrypoints without removing old root exports; update only app imports |
| Turbo cache replays old build warnings | False negative/positive | Use changed config or force build during verification |
| Shared + app changes violate PR split policy | Governance issue | Either split commits/PRs or explicitly stage as separate changes if shipping |

## Success metrics

- Largest emitted JS asset for each remote <= 300KB uncompressed.
- CSS order warning count: 0.
- Build warning count excludes accepted MF manifest info-warn only.
- Typecheck pass for touched workspaces.
- Feature docs reflect new build/import entrypoint behavior.

## Next steps

Recommended next command: `/ck:plan` with this report as context.

## Unresolved questions

None — Sếp approved Approach B.
