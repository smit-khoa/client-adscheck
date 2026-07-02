---
slug: new-remote-missing-postcss-tailwind
scope: ui
status: active
---

## Symptom
A newly added Module Federation remote builds and typechecks, but its UI renders like a raw wireframe in dev/standalone: Tailwind utilities such as `flex`, `grid`, `text-[24px]`, `rounded-xl`, `border-[#...]`, padding, and colors do not apply. Shared-ui primitives may still render partially, so the DOM has text/icons but layout/card styling is missing.

Useful probes:
- Browser computed style shows utility classes present in `className` but not applied (for example `h1.text-[24px]` still computes to `16px`, `main.rounded-xl.border.px-*` computes to no radius/border/padding).
- Built CSS lacks app utility selectors such as `text-\[24px\]`, `rounded-xl`, or `border-\[\#...\]`.

## Root cause
The remote app is missing its local `postcss.config.cjs`, so Rspack's `postcss-loader` does not run `@tailwindcss/postcss` for that app. The CSS import may still emit a bundle, and Rspack can compile successfully, but Tailwind v4 never scans the remote's `.vue`/`.ts` sources and therefore does not generate the utility classes used by the SFC templates.

## How to avoid
When creating any new SMIT client remote app, copy the app-level PostCSS config used by existing remotes:

```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

Then verify both build output and runtime style:
1. `pnpm --filter @mf2/<remote> build`
2. Inspect emitted CSS for one app-specific utility selector from the new SFC.
3. In browser, check computed style for a known Tailwind arbitrary utility from the page.

Do not accept typecheck/build success alone as proof that Tailwind styles were generated.

## Related
[[extended-payment]] [[shadcn-form-components-reuse-and-theme-tokens]] [[google-sans-flex-font-loading]]
