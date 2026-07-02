---
type: brainstorm-report
topic: workspace-path-frame-svg-gradient-extraction
created: 2026-06-24 15:45 Asia/Saigon
status: agreed
chosen_option: svg-composite-gradient
---

# SVG Gradient Extraction for WorkspacePathFrame

## Summary

Sếp provided SVG background design for the tab path surface. The useful gradient is a vertical green overlay on top of a mostly white base.

Chosen direction: use SVG composite model, not flattened opaque colors.

## Findings

### Source SVG layers

```svg
<path fill="white" fill-opacity="0.95" />
<path fill="url(#paint0_linear_1033_21765)" fill-opacity="0.2" />
```

Gradient definition:

```svg
<linearGradient x1="763.659" y1="-0.00195313" x2="763.659" y2="1014.28">
  <stop stop-color="#4DFF7F" stop-opacity="0.3" />
  <stop offset="0.519231" stop-color="#4DFF7F" stop-opacity="0.1" />
  <stop offset="1" stop-color="#4DFF7F" stop-opacity="0.3" />
</linearGradient>
```

### Effective opacity

Because the gradient path also has `fill-opacity="0.2"`, effective green alpha is:

| Position | Stop color | Stop opacity | Fill opacity | Effective alpha |
|---|---:|---:|---:|---:|
| 0% | `#4DFF7F` | 0.3 | 0.2 | 0.06 |
| 51.9231% | `#4DFF7F` | 0.1 | 0.2 | 0.02 |
| 100% | `#4DFF7F` | 0.3 | 0.2 | 0.06 |

The design is therefore: white glass base + very light neon-green vertical overlay. Stronger at top/bottom, nearly white in middle.

## Recommended Gradient

Use the same composite background for content tab path and both function panels:

```css
background:
  linear-gradient(
    180deg,
    rgba(77, 255, 127, 0.06) 0%,
    rgba(77, 255, 127, 0.02) 51.9231%,
    rgba(77, 255, 127, 0.06) 100%
  ),
  rgba(255, 255, 255, 0.95);
```

For SVG `<linearGradient>`, use stop opacities directly as effective alpha:

```svg
<linearGradient x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#4DFF7F" stop-opacity="0.06" />
  <stop offset="51.9231%" stop-color="#4DFF7F" stop-opacity="0.02" />
  <stop offset="100%" stop-color="#4DFF7F" stop-opacity="0.06" />
</linearGradient>
```

Pair it with the path base fill concept via layered SVG paths or equivalent CSS background.

## Alternatives Considered

### SVG composite gradient

Pros:
- Closest to provided SVG/Figma design.
- Keeps white glass + green overlay semantics.
- Best match for `WorkspacePathFrame`, which already renders a path surface.

Cons:
- Slightly affected by whatever sits behind the 95% white base.

### Opaque flattened gradient

```css
background: linear-gradient(
  180deg,
  #f4fff7 0%,
  #fbfffc 51.9231%,
  #f4fff7 100%
);
```

Pros:
- Stable color regardless of background behind it.
- Simpler if exact layer model is not needed.

Cons:
- Less faithful to SVG.
- Loses glass/transparency behavior.

## Touchpoints

Likely code touchpoints if implemented:

- `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue`
  - SVG path gradient for content/tab background.
  - CSS background for panel one.
  - CSS background for panel two.
- `.claude/features/shared-ui-workspace-path-frame.md`
  - Update gradient decision/gotcha after code change.
- `.claude/components-catalog.md`
  - Update only if catalog wording needs color detail change.

## Acceptance Criteria

- Main tab content path and both function panels use the same SVG-derived composite green overlay.
- Existing rounded path/frame behavior unchanged.
- No business logic changes.
- Shared-ui feature doc updated if code changes.

## Unresolved Questions

- None. Sếp selected SVG composite gradient.
