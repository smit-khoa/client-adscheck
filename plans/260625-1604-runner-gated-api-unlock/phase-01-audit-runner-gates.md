---
phase: 1
title: "Audit runner gates"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Audit runner gates

## Overview

Confirm the current runner gates for TKQC, BM, and Page before changing UI/copy. The goal is to prove which code paths already call real runners and which paths are intentionally unavailable.

## Requirements

- Functional: identify runner source-of-truth for each tab.
- Functional: list exact places that need tiny edits, if any.
- Non-functional: no code behavior changes in this phase unless implementation is merged into a later small edit.

## Architecture

Current intended gate model:

```text
TKQC -> TOOL_RUNNERS[fn.id]
BM   -> useBmRunner().getRunner(fn.id)
Page -> no action runner registry exists
```

This phase prevents treating Page row-loading API as Page action runner.

## Related Code Files

- Read: `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- Read: `apps/adaccounts/src/api/tools/index.ts`
- Read: `apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue`
- Read: `apps/adaccounts/src/features/businesses/tools/composables/use-bm-runner.ts`
- Read: `apps/adaccounts/src/features/page/tools/components/PageToolDetailPanel.vue`
- Read: `apps/adaccounts/src/features/page/api/page-fetch.ts`
- Read: `apps/adaccounts/src/features/page/tools/data/page-tool-catalog.ts`

## Implementation Steps

1. Re-read TKQC detail panel and `TOOL_RUNNERS` registry.
2. Re-read BM detail panel and `use-bm-runner.ts` registry.
3. Re-read Page detail panel, Page catalog, and Page fetch API to confirm no action runner exists.
4. Record minimal edit list for Phase 2.

## Success Criteria

- [x] TKQC runnable tool ids are confirmed.
- [x] BM registry-backed behavior is confirmed.
- [x] Page action runner absence is confirmed.
- [x] No speculative runner work is added to scope.

## Risk Assessment

Risk: missing hidden Page runner.
Mitigation: search current `apps/adaccounts/src` for Page action runner terms before editing.
