# TKQC Rename, Remove User, and Token Cache Clarification

---
date: 2026-06-18
type: implementation-journal
feature: adaccounts tool-actions, rename, remove-user, FB token cache
---

## Context

Continued TKQC tool-actions work from the updated external spec. Main focus: align **Đổi tên** and **Xóa admin** with the reference flows, then diagnose why action tools still request `adsmanager/` even when the account table has cached data.

## What Changed

**Rename TKQC**
- Updated rename to 2 modes: random and sequential.
- `baseName` can be empty; wildcard `*` inserts the generated number at that position.
- Sequential mode scans `ctx.allAccounts` to pick the next free `<base> <n>` suffix, then uses stable selected-row index for concurrency-safe numbering.
- Removed per-ID batch naming mode after UX decision: accounts are already selected in the table.
- No self-grant flow; permission failures report the real Graph message.

**Remove user / Xóa admin**
- Wired real `remove-user` runner with 5 modes: `hiddenOnly`, `allExceptMe`, `allExceptIdsAndMe`, `byIdExceptMe`, `selfRemove`.
- UID textareas are newline-only: one UID per line, trim each line, ignore non-numeric or too-short IDs.
- Bulk/input modes protect current FB user and owner. `selfRemove` intentionally targets current FB user only.
- `selfRemove` is blocked locally if current user is the account owner because Meta returns `(#100) The permissions of the ad account owner can not be modified.`
- Delete helper uses Graph GET + `method=DELETE` on `/act_<id>/users/<uid>`, then falls back to `/act_<id>/userpermissions?user=<uid>&business=<bmId>` when `bmId` exists.
- `bmId` comes from current user's `userpermissions` row, not `owner_business.id`.
- Hidden-admin detection uses batch-diff first, then HTML scrape when needed. No BM hidden-admin GraphQL flow in this TKQC scope.
- Removed the `selfRemove` confirmation switch per user request.

**Token/cache diagnosis**
- Account table reload cache stores only `AdAccount[]` in extension storage (`v8_adaccount_cached`, `v8_last_adaccount_cached`).
- Action tools use `fb-token.ts` `getToken()`; current token cache is module memory only (`let cached`).
- If the table hydrates from account-list cache after a page/runtime reload, token memory may be empty, so the first action fetches `adsmanager/` again to scrape token/session.

## Decisions

- Do not add feature-level token retry. `graph()`/`graphql()` already reset token and retry once on auth/session errors.
- Do not use MeoFB/bmmanager web-form fallback by default; keep Graph v24.0 as primary + BM `userpermissions` as business fallback.
- Keep account-list cache and token cache conceptually separate. Future token persistence should be explicit, short-TTL, and cleared by `resetToken()`.
- Keep `selfRemove` simple: no extra confirmation toggle, but still block owner case before calling delete endpoint.

## Verification

- `pnpm --filter @mf2/adaccounts typecheck` passed repeatedly after changes.
- `pnpm --filter @mf2/adaccounts build` passed with known non-blocking warnings: CSS order + asset size.
- `pnpm verify:all` passed: catalog coverage, feature docs, PR-split.
- Code-reviewer was attempted after the later update but gateway returned 503 provider errors. Earlier review caught an over-broad hidden-admin HTML regex; it was tightened.

## Known Gaps

- Token cache is still memory-only. Actions may fetch `adsmanager/` again after reload even when the TKQC table list comes from extension cache.
- Live FB response shapes for some permission delete endpoints still need more runtime confirmation.
- Several account-list/BM fetch-flow files are uncommitted in the working tree; journal notes this only at high level, not as fully reviewed scope.

## Next Steps

- Consider persisting `FbTokenBundle` in extension storage with short TTL and clearing it from both memory + storage in `resetToken()`.
- Re-run code-reviewer when provider gateway is healthy.
- Manual-test `remove-user` modes on real TKQC: owner self-remove block, byId newline parsing, hiddenOnly, BM fallback path.
