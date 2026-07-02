---
title: "Token/TKQC Parity Lazy"
status: completed-with-concerns
created: 260624-2238
source: ck-plan
brainstorm: plans/reports/token-tkqc-parity-lazy-260624-2230-token-tkqc-parity-lazy-report.md
blockedBy: []
blocks: []
---

# Plan: Token/TKQC Parity Lazy

## Overview

Build a parity-lazy Facebook token layer and full-load enrichment path for the `adaccounts` remote. Keep the new modular TKQC/BM loaders, but bring back the proven token/session/cache capabilities from the old working client.

The implementation must not copy the old mixin/module wholesale. It should add explicit token policy, bounded retry, user-scoped cache safety, `token_graphql`, and optional legacy enrichment groups where source behavior is known.

## Fixed Decisions

- Use **Parity lazy**: support the old token family, but resolve tokens only when a specific API group needs them.
- Keep `businessID = "1347771445924940"` for `token_g` / BM token.
- Add `token_graphql` in this plan, not a later backlog.
- Preserve current TKQC pipeline: seed → detail → payment → hidden limit → check hold → merge/cache.
- Preserve current BM loader behavior: base-first, advanced groups, per-group loading/error, session patch cache.
- Do not bring back infinite retry from the old client.
- Do not copy `Facebook.js` / `LoadInsightData.js` as-is.
- Legacy BM type/status/quality and spend insights are added as explicit enrichment groups only where data source is clear. They must not block base TKQC/BM rows.

## Codebase Findings

- Current TKQC config supports `basic`, `finance`, `payment`, `admin`, `checkHold`; hidden BM is visible as disabled/unwired.
- Current TKQC flow has no spend insights group yet.
- Current BM default config loads all 9 groups when advanced is enabled: `status`, `page`, `limit`, `bmAccount`, `partner`, `admin`, `instagram`, `whatsapp`, `share`.
- Current BM status uses `doc_id=4941582179260904` plus enforcement detail `doc_id=25166016149718566`.
- Current BM implementation does not include old legacy BM type/status/quality doc_ids `32061067960207573` and `3920367411328805`.
- `token_b` exists in storage schema but is not persisted by the current `fb-token.ts` flow.
- `token_g` already has memory + extension-storage TTL cache.

## Context Links

- Brainstorm report: `plans/reports/token-tkqc-parity-lazy-260624-2230-token-tkqc-parity-lazy-report.md`
- Feature map: `.claude/features/README.md`
- TKQC feature doc: `.claude/features/adaccounts-account-list.md`
- BM feature doc: `.claude/features/adaccounts-bm-data-loading.md`
- Current token files:
  - `apps/adaccounts/src/api/fb-token.ts`
  - `apps/adaccounts/src/api/fb-bm-token.ts`
  - `apps/adaccounts/src/api/fb-token-cache.ts`
  - `apps/adaccounts/src/api/fb-graph.ts`
- Current TKQC flow:
  - `apps/adaccounts/src/features/adaccounts/api/load-adaccounts-flow.ts`
  - `apps/adaccounts/src/features/adaccounts/components/LoadAdAccountsConfigDialog.vue`
- Current BM flow:
  - `apps/adaccounts/src/features/businesses/composables/use-bm-data-loader.ts`
  - `apps/adaccounts/src/features/businesses/types/bm-data-loading.types.ts`
  - `apps/adaccounts/src/features/businesses/api/fetch-bm-status.ts`

## Phases

| # | Phase | Status | Purpose |
|---|---|---|---|
| 1 | [Token cache and session safety](phase-01-token-cache-and-session-safety.md) | pending | Persist `token_b`, add session metadata, and prevent stale cross-FB-user row cache |
| 2 | [Token policy and family resolvers](phase-02-token-policy-and-family-resolvers.md) | pending | Add lazy token family: `token_i`, `token_b`, `token_g`, `token_graphql`, with explicit policy and bounded fallback |
| 3 | [TKQC full-load enrichment](phase-03-tkqc-full-load-enrichment.md) | pending | Wire TKQC load to token policy and add clear full-load enrichment groups including spend insights |
| 4 | [BM legacy enrichment and reload safety](phase-04-bm-legacy-enrichment-and-reload-safety.md) | pending | Keep current BM groups, add legacy BM type/status/quality as isolated optional groups, and make cache reload safe |
| 5 | [Docs, tests, and verification](phase-05-docs-tests-and-verification.md) | pending | Update feature docs, add focused tests, run checks, document manual verification |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5
```

Phase 3 and Phase 4 both depend on Phase 2 token policy. Keep implementation linear because token/cache behavior touches shared `apps/adaccounts/src/api` helpers.

## Target Architecture

```text
apps/adaccounts/src/api/
  fb-token-cache.ts          # persisted token/session storage schema and helpers
  fb-session.ts              # Facebook login/session metadata bootstrap
  fb-token.ts                # token_b resolver, now persistent + redirect-follow bounded
  fb-bm-token.ts             # token_g resolver, keep businessID
  fb-token-graphql.ts        # token_graphql resolver
  fb-token-auto.ts           # token_i resolver
  fb-token-policy.ts         # semantic token purpose -> resolver/fallback policy
  fb-graph.ts                # Graph/GraphQL helpers consume token policy, not ad-hoc token choice
```

Keep exact file split simple during implementation. If a file becomes too small or too coupled, merge local helpers. The important boundary is: feature loaders request semantic token purposes, not scrape details.

## Token Policy Matrix

| Purpose | Primary | Fallback | Used by |
|---|---|---|---|
| `readGraph` | endpoint policy: keep proven current token for existing endpoints; add `token_i` for legacy/new read paths after validation | `token_b` only when endpoint policy allows; `token_g` only for explicit allowlist | TKQC/BM read Graph APIs |
| `powerEditorAction` | `token_b` | none | TKQC write/action tools |
| `businessManagerAction` | `token_g` | none | BM/Page/token_g actions |
| `legacyGraphql` | `token_graphql` | none by default; endpoint-specific only after verification | Old BM type/status/quality |
| `sessionGraphql` | `fb_dtsg` + `lsd` | refresh session once | Current hidden/check-hold/BM status GraphQL |

## Out of Scope

- Replacing all current BM status logic with legacy status. New BM status remains unless legacy fields are added as separate group/fields.
- Making hidden BM work without confirmed API source.
- Changing shared packages.
- Changing shell auth or SMIT backend auth.
- Perfect live verification without SMIT Connect + Facebook session.

## Verification Strategy

Focused checks:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts test
pnpm --filter @mf2/adaccounts build
pnpm verify:features
```

Final architecture guard:

```bash
pnpm verify:all
```

Manual checks require SMIT Connect extension + FB login:

- Reload within token TTL reuses cached token slots.
- Switch FB user: old TKQC/BM row cache is ignored or cleared.
- TKQC full-load with all groups enabled returns base rows even if spend/hidden/check-hold group fails.
- BM load with default all groups hydrates cache on reload and does not re-call disabled groups.
- Legacy BM enrichment failure is isolated.

## Acceptance Criteria

- [x] `token_b`, `token_g`, `token_i`, and `token_graphql` have explicit lazy resolvers.
- [x] `token_b` persists to `adscheck_data` with 6h TTL.
- [x] Row caches include/validate `user_id` or are cleared on user mismatch.
- [x] Token policy table exists in code/docs and API wrappers use semantic token purposes.
- [x] No infinite retry behavior is introduced.
- [x] TKQC load keeps existing source modes and adds full-load enrichment without blocking base rows.
- [x] BM default advanced load remains compatible and optional legacy enrichment is isolated.
- [x] Feature docs are updated.
- [ ] Focused checks pass or failures are reported honestly. `typecheck`, `build`, and `verify:features` pass; `verify:all` fails at `verify-pr-split` because pre-existing shared/shell mixed changes are outside this task.

## Risks

| Risk | Mitigation |
|---|---|
| Facebook internal token regex changes | Typed token errors, bounded retry, fallback policy |
| Cached token belongs to another FB user | Store/check `user_id`; clear/ignore mismatched row cache |
| Token policy overcomplicates API helpers | Keep policy matrix small and semantic |
| Legacy GraphQL doc_ids stale | Add as optional isolated group, not core blocker |
| Full-load creates too many requests | Lazy token fetch, existing concurrency controls, isolated group failure |

## Red-Team Findings Applied

- **Cache safety:** legacy raw row cache must not hydrate when current `user_id` is known and the cache has no matching `user_id`. It can be ignored and overwritten after an explicit successful load. This prevents cross-Facebook-account stale data.
- **Read token rollout:** do not globally flip existing working read Graph calls from `token_b` to `token_i` in one step. Add `token_i`, then use endpoint-level policy. Existing endpoints may stay on their current proven token until validation says otherwise.
- **No broad `token_g` fallback:** `token_g` must not be a generic readGraph fallback. Use it only for explicit allowlisted BM/Page/business-manager endpoints.
- **No unproven GraphQL fallback:** `legacyGraphql` should not silently fall back to session GraphQL unless a specific endpoint is verified with both payload shapes.
- **Typed observability:** token policy should expose which token slot was used in tests/dev diagnostics without leaking token values.

## Plan Notes

`ck` CLI was unavailable in this environment (`command not found: ck`), so this plan was scaffolded manually using the ck-plan phase template.
