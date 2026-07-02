---
type: journal
created: 2026-06-24
scope: token-tkqc-parity-lazy
---

# Token/TKQC Parity Lazy Implementation

## Context

Implemented approved plan `plans/260624-2238-token-tkqc-parity-lazy/plan.md` for the adaccounts remote.

## What happened

- Added persistent `token_b` cache under `adscheck_data`, sharing the 6h TTL style already used by `token_g`.
- Added lazy token resolvers for `token_i` and `token_graphql`.
- Added `fb-token-policy` so Graph helpers can request semantic token purposes instead of scraping details directly.
- Scoped TKQC/BM row caches by Facebook `user_id`; legacy raw cache is ignored when current user is known.
- Split TKQC spend insights into its own option while keeping default behavior compatible.
- Added optional BM legacy type/quality enrichment groups without replacing current BM status.
- Updated feature docs and plan status.

## Review fixes

Code review caught two real issues:

1. BM `admin` group was accidentally removed while adding legacy groups.
   - Fixed by restoring `config.adv.admin -> fetchBmAdmins` through `runFamily`.
2. `token_i` and `token_graphql` reset paths only cleared memory cache.
   - Fixed by invalidating extension storage and awaiting those reset functions in policy.

Second review passed with no new blocker.

## Decisions

- Keep current read Graph behavior defaulting to existing `token_b`; `token_i` is available through endpoint-level policy but not globally forced.
- Keep legacy BM enrichment optional and isolated; do not overwrite current BM status.
- Keep `businessID = "1347771445924940"` as inherited behavior, but mark live universality as still unconfirmed.

## Verification

- `pnpm --filter @mf2/adaccounts typecheck`: pass.
- `pnpm --filter @mf2/adaccounts build`: pass with CSS order / asset size warnings.
- `pnpm verify:features`: pass.
- `pnpm verify:all`: fails at `verify-pr-split` due to pre-existing shared/shell mixed changes outside this task.
- Unit tests: skipped because `@mf2/adaccounts` has no `test` script.
- Manual FB smoke: skipped because it needs SMIT Connect + Facebook session.

## Next

- Resolve unrelated shared/shell PR split before expecting `pnpm verify:all` to pass.
- Add a real `@mf2/adaccounts test` script before expanding token/cache tests.
- Live smoke with Sếp's extension and Facebook session: cache reload, FB user switch, TKQC all groups, BM legacy group failure isolation.
