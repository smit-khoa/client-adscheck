---
phase: 2
title: "Apply truthful runner-gated UI copy"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Apply truthful runner-gated UI copy

## Overview

Make the UI behavior and messages match the real runner state. Keep existing runner execution paths intact and do not add new action API logic.

## Requirements

- Functional: registered TKQC/BM tools keep calling real runners.
- Functional: missing-runner tools warn/skip clearly.
- Functional: Page action run explains that no real Page action runner exists in current code.
- Non-functional: minimal code changes, no shared-ui changes, no redesign.

## Architecture

Use local domain gates:

- TKQC: `stepRunner(fn)` remains `TOOL_RUNNERS[fn.id]`.
- BM: `getRunner(fn.id)` remains runner source-of-truth.
- Page: no registry; run path stays unavailable and truthful.

Avoid adding a generic runner abstraction until all domains have comparable runner contracts.

## Related Code Files

- Modify if needed: `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- Modify if needed: `apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue`
- Modify: `apps/adaccounts/src/features/page/tools/components/PageToolDetailPanel.vue`
- Modify if misleading: `apps/adaccounts/src/features/adaccounts/tools/data/adaccount-tool-catalog.ts`
- Modify if misleading: `apps/adaccounts/src/features/page/tools/data/page-tool-catalog.ts`

## Implementation Steps

1. TKQC: only adjust copy/comment if current runner-gated behavior already works.
2. BM: keep current registry path; add missing-runner warning only if audit finds a silent path.
3. Page: update warning copy from generic “chưa đấu API” to explicit “chưa có runner thật trong code hiện tại”.
4. Ensure run buttons do not imply Page action success.
5. Keep all changes app-local.

## Success Criteria

- [x] TKQC registered tools still call `runBatch` with real runner.
- [x] BM registered tools still call `useBmRunner().run`.
- [x] Page action run does not attempt fake or row-loading API.
- [x] User-facing copy distinguishes “runner exists” vs “runner missing”.
- [x] No new API/runner files are created.

## Risk Assessment

Risk: changing too much UI while adjusting copy.
Mitigation: touch only strings and tiny guard logic proven by Phase 1.
