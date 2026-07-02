---
phase: 2
title: "Token policy and family resolvers"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Token Policy and Family Resolvers

## Overview

Add the old token family back in a lazy, explicit, testable way: `token_i`, `token_b`, `token_g`, and `token_graphql`. API wrappers should request semantic token purposes, not know scraping details.

## Requirements

- Functional: provide lazy resolvers for `token_i`, `token_b`, `token_g`, and `token_graphql`.
- Functional: add `token_graphql` now, with persistent cache and typed parse failure.
- Functional: keep `businessID = "1347771445924940"` for `token_g`.
- Functional: add explicit token policy for read Graph, power-editor actions, business-manager actions, legacy GraphQL, and session GraphQL.
- Functional: support bounded fallback and retry; no infinite loop.
- Non-functional: keep the API surface small; no wholesale old module copy.

## Architecture

Introduce a central policy layer:

```ts
type TokenPurpose =
  | 'readGraph'
  | 'powerEditorAction'
  | 'businessManagerAction'
  | 'legacyGraphql'
  | 'sessionGraphql';
```

Resolver responsibilities:

- `token_b`: existing adsmanager resolver, now persisted from Phase 1.
- `token_g`: existing BM token resolver, keep hard-coded business ID.
- `token_i`: bootloader resolver from old `AdsCanvasComposerDialog.react` source.
- `token_graphql`: bootloader resolver from old `ReactComposerStatusEagerAttachment.react` source, parsing the legacy GraphQL token.
- session GraphQL: current `fb_dtsg` + `lsd` path.

Policy should be explicit:

| Purpose | Primary | Fallback |
|---|---|---|
| `readGraph` | endpoint-level policy: keep the current proven token for existing endpoints; add `token_i` for legacy/new read paths after validation | `token_b` only when allowed by endpoint policy; `token_g` only for explicit allowlist |
| `powerEditorAction` | `token_b` | none |
| `businessManagerAction` | `token_g` | none |
| `legacyGraphql` | `token_graphql` | none by default; endpoint-specific fallback only after verification |
| `sessionGraphql` | session metadata | refresh session once |

## Related Code Files

- Create: `apps/adaccounts/src/api/fb-token-policy.ts`
- Create: `apps/adaccounts/src/api/fb-token-auto.ts`
- Create: `apps/adaccounts/src/api/fb-token-graphql.ts`
- Modify: `apps/adaccounts/src/api/fb-token.ts`
- Modify: `apps/adaccounts/src/api/fb-bm-token.ts`
- Modify: `apps/adaccounts/src/api/fb-graph.ts`
- Modify: `apps/adaccounts/src/api/fb-token-cache.ts`
- Tests: `apps/adaccounts/src/api/__tests__/fb-token-policy.test.ts`

## Implementation Steps

1. Read old token regex behavior from the brainstorm report and verify current `fb-token.ts` parse helpers before editing.
2. Extract shared HTML/session parse helpers only if it reduces duplication. Do not create a broad abstraction before 2+ resolvers need it.
3. Add `token_i` resolver:
   - endpoint: `https://www.facebook.com/ajax/bootloader-endpoint/?modules=AdsCanvasComposerDialog.react&__a=1`;
   - parse `access_token` and session metadata;
   - persist under `adscheck_data.token_i`.
4. Add `token_graphql` resolver:
   - endpoint: old bootloader GraphQL source;
   - parse legacy GraphQL access token;
   - persist under `adscheck_data.token_graphql`;
   - return typed error if prefix/regex fails.
5. Add token policy function, e.g. `getTokenForPurpose(purpose)`.
6. Add in-flight dedup per token slot so parallel full-load groups do not scrape the same token repeatedly.
7. Update `fb-graph.ts` to support policy-based token selection while preserving current default behavior until Phase 3/4 migrations. Do not globally switch all read Graph calls to `token_i`; use endpoint-level policy and keep current working endpoints on their proven token until validated.
8. Add bounded retry semantics:
   - auth error → reset involved token → retry once;
   - allowed fallback → try next token once;
   - `token_g` fallback only for explicitly allowlisted endpoints;
   - `legacyGraphql` has no fallback unless that exact endpoint is verified;
   - otherwise throw typed error.
9. Add tests for resolver cache hit/miss, fallback order, and no infinite retry.

## Success Criteria

- [ ] All four token slots are represented in storage schema.
- [ ] `token_i`, `token_b`, `token_g`, and `token_graphql` are lazy; no full upfront fetch.
- [ ] Parallel calls dedup in-flight token fetch.
- [ ] `fb-graph.ts` can request tokens by semantic purpose.
- [ ] Auth retry is bounded.
- [ ] Existing current Graph/GraphQL calls still compile.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Token_i/token_graphql endpoints no longer valid | Resolver returns typed error; fallback/optional groups isolate failure |
| Fallback chain hides bugs | Log/return token slot used in dev/test path; keep policy table explicit |
| Too many new files | Merge small helpers if implementation stays tiny |
