---
slug: tw-animate-css-missing-dead-overlay-animations
scope: ui
status: active
---

## Symptom

Shadcn-vue/reka overlay components (Dialog, Drawer, Popover, DropdownMenu, Select, Tooltip) mount/unmount instantly instead of fading, zooming, or sliding. Classes like `animate-in`, `animate-out`, `fade-in-0`, `zoom-in-95`, and `slide-in-*` are present in Vue templates, but the built CSS contains no usable animation utilities.

## Root cause

This repo uses Tailwind v4 CSS-first setup. The shadcn animation utility classes are not built into Tailwind itself; they come from `tw-animate-css` in Tailwind v4 projects. If `tw-animate-css` is not installed and imported from each Tailwind entry CSS bundle, Tailwind cannot generate those utilities/keyframes, so overlay animation classes are effectively dead.

Remote standalone and remote-in-shell builds each have their own CSS entry. Importing the package only in the shell is not enough for standalone remote dev/build output.

## How to avoid

- When using shadcn-vue overlay animation classes in Tailwind v4, add `tw-animate-css` to the relevant app package and import it immediately after the Tailwind import.
- Check every Tailwind CSS entry, including remote-specific CSS files such as `remote-styles.css`, not only `styles.css`.
- For shared-ui custom animation upgrades, colocate component-specific keyframes in the shared component folder and import them from the component so the behavior travels with the shared-ui singleton.
- If a dialog is positioned with `translate(-50%, -50%)`, animate CSS individual properties like `scale`/`opacity` instead of overwriting `transform`; otherwise the dialog can jump off center during animation.

## Related

[[shared-ui-data-grid-table]]
