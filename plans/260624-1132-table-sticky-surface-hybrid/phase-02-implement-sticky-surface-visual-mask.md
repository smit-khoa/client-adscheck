---
phase: 2
title: "Implement sticky surface visual mask"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Implement Sticky Surface Visual Mask

## Overview

Add the translucent sticky surface/mask for header and frozen columns while preserving the existing table layout and behavior.

## Requirements

- Functional: header blocks vertical scroll bleed-through.
- Functional: frozen columns block horizontal scroll bleed-through.
- Functional: footer frozen cells use the same surface when `showTotal` is active.
- Functional: explicit cell colors and range/highlight states remain visible.
- Non-functional: no new public API, no dependency, no pane refactor.

## Architecture

Preferred implementation:

- Add CSS variables on the table container for sticky surface color.
- Use **alpha-only translucent surface by default**; do not enable `backdrop-filter`/blur unless Sếp approves a follow-up.
- Apply surface to sticky header/frozen/footer zones.
- Prefer pseudo-element or background-layer approach so cell content and highlight classes remain predictable.
- Keep normal body cells transparent.

Fallback if CSS-only is blocked:

- Minimal `Table.vue` adjustment to distinguish sticky-default backgrounds from normal-default transparent backgrounds.
- Still keep explicit `cell_format` and color rules highest priority.
- Do not change DOM architecture, scroll container structure, props, emits, or public import paths.

## Related Code Files

- Modify: `packages/shared-ui/src/components/ui/table/style.css`
- Modify if needed: `packages/shared-ui/src/components/ui/table/Table.vue`
- Do not modify: `apps/*`

## Implementation Steps

1. Add sticky surface CSS tokens near existing table CSS variables/container rules.
2. Apply the surface to `.header-row` / `.header-cell` without making the entire table opaque.
3. Apply the surface to `.header-cell.frozen-column`, `.row-cell.frozen-column`, and `.footer-cell.frozen-column`.
4. Preserve z-index behavior for header, frozen cells, dropdowns, resize preview, range actions, and last frozen shadow.
5. Ensure `.range-cell`, `.range-col`, `.highlight-*`, and explicit inline color-rule backgrounds remain visible.
6. If pseudo-element is used, ensure pointer events are disabled and content stays above the surface.
7. Keep diff minimal; avoid unrelated formatting/refactor.

## Success Criteria

- [x] CSS introduces one clear sticky surface concept.
- [x] Normal body/default cells remain transparent.
- [x] Header and frozen surfaces visually cover scroll bleed-through by code path; browser smoke still pending in Phase 3.
- [x] No public API changes.
- [x] TypeScript remains valid if `Table.vue` is touched.

## Risk Assessment

Risk: pseudo-elements interfere with resize handles/dropdowns.
Mitigation: use `pointer-events: none`, careful stacking, and verify interactions in Phase 3.

Risk: highlight specificity fights sticky surface.
Mitigation: keep highlight classes explicit and test selected/range/color-rule cases.
