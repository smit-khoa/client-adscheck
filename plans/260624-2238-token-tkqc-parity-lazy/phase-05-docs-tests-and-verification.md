---
phase: 5
title: "Docs tests and verification"
status: completed-with-concerns
priority: P1
dependencies: [1, 2, 3, 4]
---

# Phase 5: Docs, Tests, and Verification

## Overview

Lock the token/TKQC parity work with feature docs, focused tests, and the smallest useful verification suite. This phase also records any live-Facebook gaps that cannot be verified without Sếp's extension/session.

## Requirements

- Functional: update feature docs touched by token, TKQC, and BM behavior.
- Functional: add or update focused tests for token cache/policy and pure mappers/builders.
- Functional: run relevant project checks and report failures honestly.
- Non-functional: no docs drift; no shared/app boundary violation; no AI memory drift.

## Architecture

Docs impacted:

- `.claude/features/adaccounts-account-list.md`
- `.claude/features/adaccounts-tkqc-tab.md`
- `.claude/features/adaccounts-bm-data-loading.md`
- `.claude/features/adaccounts-bm-tab.md`
- `.claude/features/README.md` if new docs/features are added

Potential lesson:

- Add a lesson only if implementation uncovers a memorable footgun, e.g. token cache/user mismatch causing stale account data.

Tests should stay pure and local:

- Token cache/policy tests mock extension storage and fetch boundary.
- TKQC field builder/mapper tests do not hit Facebook.
- BM legacy mapper tests do not hit Facebook.

## Related Code Files

- Modify: `.claude/features/adaccounts-account-list.md`
- Modify: `.claude/features/adaccounts-bm-data-loading.md`
- Modify: `.claude/features/adaccounts-tkqc-tab.md` if load behavior wording changes
- Modify: `.claude/features/adaccounts-bm-tab.md` if BM tool/load behavior wording changes
- Maybe create: `.claude/lessons/<slug>.md` only if a real footgun is found
- Tests under relevant `__tests__/` folders beside source files

## Implementation Steps

1. Re-read affected feature docs before editing.
2. Update docs to describe:
   - token family and token policy;
   - `token_b` persistent cache;
   - user-scoped row cache;
   - TKQC spend/full-load groups;
   - BM legacy enrichment groups if implemented.
3. Add focused tests:
   - cache TTL and user mismatch;
   - token policy fallback order;
   - no infinite retry;
   - TKQC spend field builder/mapper;
   - BM legacy mapper/group gating.
4. Run focused tests first.
5. Run typecheck/build for `@mf2/adaccounts`.
6. Run `pnpm verify:features` and `pnpm verify:all` because feature docs/cache architecture changed.
7. Manual verification checklist with extension + FB login:
   - full TKQC load all groups;
   - reload cache;
   - switch FB account cache safety;
   - BM default all groups reload;
   - legacy group failure isolation.
8. If manual verification cannot be performed in-session, state it clearly and list exact steps for Sếp.

## Success Criteria

- [ ] Feature docs match code paths and behavior.
- [ ] Focused tests pass or failures are documented.
- [ ] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [ ] `pnpm --filter @mf2/adaccounts build` passes or only known non-blocking warnings remain.
- [ ] `pnpm verify:features` passes.
- [ ] `pnpm verify:all` passes.
- [ ] Manual verification status is reported honestly.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Tests become too coupled to Facebook HTML | Test parse helpers with small fixtures, not live requests |
| Docs overpromise legacy fields | Document only implemented and verified groups |
| Manual verification unavailable | Provide exact smoke steps and mark as skipped, not passed |
