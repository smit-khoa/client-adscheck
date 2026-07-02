---
phase: 1
title: "Baseline, inventory, and test guardrails"
status: completed
priority: P1
dependencies: []
---

# Phase 01: Baseline, Inventory, and Test Guardrails

## Overview

Prove the current `adaccounts` state before moving files, then build an exact inventory of prototype files to port. This phase reduces blind merge risk.

## Requirements

- Functional: no app behavior changes.
- Non-functional: record current checks and prototype file mapping before migration.
- TDD gate: run existing checks first; if baseline fails, stop and report before refactor.

## Architecture

This phase is read-only except optional report notes inside the plan folder. It compares current branch against `feat-dev-prototype` and groups files into TKQC, BM, Page, Pixel, workspace, shared API infra, and ignored UI leftovers.

## Related Code Files

- Read: `apps/adaccounts/src/**`
- Read: `apps/shell/src/components/WorkspaceContent.vue`
- Read from branch: `feat-dev-prototype:apps/adaccounts/src/**`
- Read: `.claude/features/*.md`
- Read: `docs/adaccounts-feature-architecture.md`
- Optional create: `plans/260623-1857-adaccounts-prototype-merge/research/prototype-file-map.md`

## Implementation Steps

1. Run baseline checks:
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts build`
2. List prototype-only files:
   - `git ls-tree -r --name-only feat-dev-prototype apps/adaccounts/src`
   - compare with current files.
3. Create file map grouped by domain:
   - TKQC existing/current.
   - BM from prototype: `features/bm-actions`, `api/tools/bm`, BM token/cache, BM selection additions.
   - Page from prototype: `features/page-manager`, `page-selection`, `page-tool-actions`.
   - Shared API infra: token/cache/graph/batch.
4. Identify files to port as-is vs adapt.
5. Identify obsolete current files after migration: `basic-mode`, `advanced-mode`, old `account-*`, old `tool-actions` wrappers if replaced.
6. If existing test files cover affected logic, note commands to run. Do not add broad render tests.

## Success Criteria

- [x] Current `adaccounts` typecheck result recorded.
- [x] Current `adaccounts` build result recorded.
- [x] Prototype file map exists or is captured in implementation notes.
- [x] No raw merge strategy remains in implementation notes.
- [x] Any baseline failure is reported before code movement.

## Phase 1 Result — 2026-06-23

- `pnpm --filter @mf2/adaccounts typecheck`: PASS.
- `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS.
  - Existing warnings: shared-ui CSS order conflicts and two asset size warnings.
- Prototype file map: `research/prototype-file-map.md`.
- App code changes: none.

## Risk Assessment

- Risk: baseline already fails due unrelated working tree changes. Mitigation: report exact failure and ask before continuing implementation.
- Risk: prototype has UI old layout. Mitigation: classify old layout files as reference only, not direct merge.
