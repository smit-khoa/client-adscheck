---
phase: 3
title: "Resolve CSS order warnings and verify builds"
status: completed
priority: P1
effort: "1h"
dependencies: [1, 2]
---

# Phase 3: Resolve CSS order warnings and verify builds

## Overview

Confirm whether chunking/import changes remove CSS order warnings. If not, apply the smallest safe warning filter for verified harmless CSS ordering conflicts under Rspack native CSS extraction.

## Requirements

- Functional: `adaccounts` build no longer reports `Conflicting order` warnings.
- Functional: build output is verified after Turbo cache is bypassed when needed.
- Non-functional: do not reorder global CSS in a way that changes runtime styles.
- Non-functional: warning suppression must be scoped, not blanket all warnings.

## Architecture

Rspack `experiments.css: true` uses native CSS handling. The commonly suggested `ignoreOrder` belongs to CSS extraction plugins, not this setup. Current conflicts involve separate selector namespaces:

- Dialog animation CSS: dialog data-slot selectors + keyframes.
- Table CSS: `.data-grid-*`, `.row-cell`, `.header-cell`, range selection classes.
- vue-sonner CSS: third-party toast styles.

Because these styles do not intentionally override each other, order conflict is expected to be harmless once verified.

## Related Code Files

- Modify if needed: `apps/adaccounts/rspack.config.ts`
- Possibly modify if warning appears there: `apps/ads-manager/rspack.config.ts`
- Reference: `packages/shared-ui/src/components/ui/dialog/style.css`
- Reference: `packages/shared-ui/src/components/ui/table/style.css`
- Reference: `packages/shared-ui/src/components/ui/sonner/Sonner.vue`

## Implementation Steps

1. Run build after Phases 1-2 and inspect warning output.
2. If `Conflicting order` is gone, do nothing else.
3. If still present and build/runtime behavior is otherwise OK, add `ignoreWarnings` scoped to CSS conflicting-order warnings in the affected remote config only.
4. Do not suppress asset warnings, TypeScript errors, MF runtime errors, or publicPath info-warn globally.
5. Re-run build and save relevant output summary in final report/session response.

Potential scoped pattern:

```ts
ignoreWarnings: [
  (warning) =>
    typeof warning.message === 'string' &&
    warning.message.includes('Conflicting order') &&
    warning.message.includes('.css'),
],
```

If Rspack warning shape differs, use a narrower regex/object pattern supported by actual output.

## Success Criteria

- [ ] `Conflicting order` warning count is 0 in final relevant build output.
- [ ] No unrelated warnings are hidden.
- [ ] CSS runtime behavior is not intentionally changed.
- [ ] Build still emits expected remote artifacts (`remoteEntry.js`, `mf-manifest.json`).

## Risk Assessment

- Risk: warning filter hides future real CSS conflict. Mitigation: filter exact message/type only; document rationale in feature docs/lesson.
- Risk: build cache masks warning state. Mitigation: force or clean only if output shows cache replay.
