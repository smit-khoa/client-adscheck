# PM Sync — Token/TKQC Parity Hardening

Date: 2026-06-25
Plan: `/Users/khoafunnky/.claude/plans/partitioned-cuddling-riddle.md`
Worktree: `/Volumes/Workspace/smit/worktree/client/feat-system-starter`

## Status

Implemented + focused verified.

## Completed

- `token_graphql` parser now accepts legacy `accessToken` camelCase with `EAAHULp` plus current `access_token` shapes.
- `token_i` and `token_graphql` cache writes parse/merge session metadata instead of clearing stored `user_id`/`fb_dtsg`/`lsd`.
- BM legacy type/quality use old-compatible variables and parser:
  - type: `businessID`, `overridePrimaryBusinessLocationEligibility:false`, `ad_account_creation_limit` -> `BM <limit>`.
  - quality/status: `entity_id`, `action:null`, `isRestricted` -> `Restricted`/`Live` and Vietnamese quality label.
- AUTO read fallback is endpoint-owned via `TokenPolicyOptions.autoFallbackSlots`; selected TKQC reads allow only `token_b` fallback.
- TKQC Graph batch uses endpoint-level AUTO policy, retries once after OAuth/session-stale error, then preserves 5xx retry/backoff path.
- Review fixes applied:
  - worker-local `consecutiveErrors` to avoid shared counter race.
  - auth retry no longer returns before 5xx retry evaluation.
  - pagination cursor pages preserve AUTO token policy for ad-account and business pages.
- Feature docs updated:
  - `.claude/features/adaccounts-account-list.md`
  - `.claude/features/adaccounts-bm-data-loading.md`
  - `.claude/features/adaccounts-bm-tab.md`

## Verification

| Check | Result | Notes |
|---|---:|---|
| `pnpm --filter @mf2/adaccounts typecheck` | PASS | `vue-tsc --noEmit` 0 errors |
| `pnpm --filter @mf2/adaccounts build` | PASS | 3 existing Rspack warnings: CSS order + chunk size |
| `pnpm verify:features` | PASS | 17 docs, 163 paths |
| `pnpm verify:all` | FAIL scoped | catalog + feature pass; `verify-pr-split` fails because existing `packages/shared-*` and `apps/shell` changes are mixed outside this task |

## Review/Test Notes

- Code-reviewer status: `DONE_WITH_CONCERNS` first pass, issues fixed; second pass confirmed the 2 previous blockers fixed and identified business pagination token policy, also fixed.
- Tester status: `DONE_WITH_CONCERNS` because `@mf2/adaccounts` has no active test runner / test files for focused parser and batch tests.
- Manual smoke still needed with SMIT Connect + Facebook login.

## Unresolved Questions

- Should `@mf2/adaccounts` get a small Vitest setup for token parser/policy/batch pure tests in a separate task?
- Should pre-existing `verify-pr-split` mixed shared/shell changes be split before commit/PR?
