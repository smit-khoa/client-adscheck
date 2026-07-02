---
phase: 3
title: "Update feature docs and verify"
status: completed
priority: P1
dependencies: [2]
---

# Phase 3: Update feature docs and verify

## Overview

Sync feature documentation with the runner-gated behavior and run focused verification commands.

## Requirements

- Functional: feature docs describe current runner availability truthfully.
- Non-functional: verification is narrow but sufficient for touched files.

## Architecture

Docs should distinguish three concepts:

1. Data loading API.
2. Tool action runner registry.
3. UI-only unavailable tools.

This avoids future confusion where Page row loading is mistaken for Page action runner support.

## Related Code Files

- Modify: `.claude/features/adaccounts-tkqc-tab.md`
- Modify: `.claude/features/adaccounts-bm-tab.md`
- Modify: `.claude/features/adaccounts-page-tab.md`
- Modify if needed: `.claude/features/adaccounts-tool-actions.md`
- Read if needed: `.claude/features/README.md`

## Implementation Steps

1. Update TKQC feature doc with partial runner coverage if wording is stale.
2. Update BM feature doc if runner registry status or missing-runner behavior changed.
3. Update Page feature doc to state Page loading API is real but action runners are unavailable.
4. Update tool-actions doc if shared runner-gated workflow wording changed.
5. Run focused verification.

## Success Criteria

- [x] Feature docs match changed UI/runner behavior.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes or failure is reported.
- [x] `pnpm verify:features` passes or failure is reported.
- [x] Optional `pnpm verify:all` is run if shared/catalog/doc boundaries changed.

## Risk Assessment

Risk: docs claim more than code supports.
Mitigation: docs must name exact runner support and state Page action runner absence.
