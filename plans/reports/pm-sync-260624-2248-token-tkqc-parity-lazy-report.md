---
type: pm-sync-report
plan: token-tkqc-parity-lazy
status: completed-with-concerns
created: 2026-06-24
---

# PM Sync — Token/TKQC Parity Lazy

## Summary

Implemented full approved plan scope for adaccounts token/TKQC/BM parity lazy.

## Completed

- Phase 1: token cache + session safety
  - `token_b` persisted in `adscheck_data` with 6h TTL.
  - TKQC/BM row caches now user-scoped with legacy-cache guard.
- Phase 2: token policy + family resolvers
  - Added lazy `token_i`, `token_graphql`, existing `token_b`, `token_g` slots.
  - Added semantic `fb-token-policy` and policy-based `fb-graph` support.
  - Auth retry remains bounded.
- Phase 3: TKQC full-load enrichment
  - Added `spendInsights` option while keeping default behavior compatible.
  - Existing source modes and isolated payment/hidden/check-hold flow preserved.
- Phase 4: BM legacy enrichment + reload safety
  - Added optional `legacyType` and `legacyQuality` groups.
  - Current status/admin/default groups remain compatible after code-review fix.
- Phase 5: docs + verification
  - Updated feature docs for TKQC account list, BM data loading, BM tab.
  - Code-review found 2 issues; both fixed and re-review passed.

## Verification

| Check | Result | Notes |
|---|---|---|
| `pnpm --filter @mf2/adaccounts typecheck` | PASS | Re-run after review fixes |
| `pnpm --filter @mf2/adaccounts build` | PASS with warnings | CSS order + asset size warnings |
| `pnpm verify:features` | PASS | no doc drift |
| `pnpm verify:all` | FAIL | `verify-pr-split` fails due to pre-existing shared/shell mixed changes outside this task |
| `pnpm --filter @mf2/adaccounts test` | SKIPPED | package has no `test` script |
| Manual FB/session smoke | SKIPPED | needs SMIT Connect + Facebook session |

## Review

- Initial code-review: DONE_WITH_CONCERNS.
- Fixed:
  - restored BM `admin` group call in `runBmDetails`;
  - `resetAutoToken` / `resetLegacyGraphqlToken` now invalidate extension storage and are awaited by policy.
- Re-review: DONE, no new blocker.

## Unresolved Questions

1. `verify-pr-split` currently blocked by unrelated shared/shell changes already present in working tree.
2. Live confirmation still needed for `businessID = "1347771445924940"` universality.
3. Manual smoke needs Sếp's SMIT Connect extension + Facebook login.
