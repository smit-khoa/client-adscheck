---
phase: 1
title: "Measure bundle baseline"
status: completed
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Measure bundle baseline

## Overview
Measure current production build output and identify the largest chunks before changing code.

## Requirements
- Functional: collect current JS/CSS sizes from each app `dist`.
- Non-functional: use real build output only; no guessed bundle data.

## Architecture
No architecture change. This phase only reads `dist` files and build config.

## Related Code Files
- Read: `apps/shell/rspack.config.ts`
- Read: `apps/adaccounts/rspack.config.ts`
- Read: `apps/ads-manager/rspack.config.ts`
- Read: `packages/shared-ui/src/index.ts`

## Implementation Steps
1. Inspect `apps/*/dist` JS/CSS sizes.
2. Search large chunk contents for dependency markers.
3. Map markers back to source imports.

## Success Criteria
- [x] Largest shell asset identified.
- [x] Largest remote assets identified.
- [x] Probable dependency source identified.

## Risk Assessment
Low. Read-only measurement.
