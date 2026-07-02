---
phase: 4
title: "Docs tests and verification"
status: completed
priority: P1
dependencies: [1, 2, 3]
---

# Phase 4: Docs tests and verification

## Overview

Lock the auth/session and check-hash gate change with focused tests, feature docs, and architecture documentation. This phase is mandatory because the task changes feature logic, startup flow, API calls, and docs-governed auth behavior.

## Requirements

- Functional: update AI feature docs to match new auth/session/check-hash behavior.
- Functional: update human architecture docs where startup flow changes.
- Functional: run narrow verification first, then broader guards if shared/app boundaries changed.
- Non-functional: report any live-gateway or extension smoke gaps honestly.

## Architecture

Documentation should distinguish three separate session concepts:

1. **SMIT login session** — `/public/authentication`.
2. **Adscheck Pro/normal session** — `/ads-check/auth.session_actived`, `/ads-check/sessions/active`, normal-session fallback.
3. **Facebook browser session** — `apps/adaccounts/src/api/fb-session.ts`, already used for TKQC/BM/Page cache/token safety.

Do not blur these in docs; they protect different things.

## Related Code Files

- Modify: `.claude/features/auth-flow.md`
- Optional create/modify: `.claude/features/shell-startup-check-hash-gate.md` if feature map needs separate feature doc
- Modify: `.claude/features/README.md` if a new feature doc is created
- Modify: `docs/system-architecture.md`
- Modify: `docs/codebase-summary.md`
- Modify if behavior changes user setup: `README.md`
- Verification targets:
  - `packages/shared-store/src/__tests__/auth-store.test.ts`
  - shell service tests if added

## Implementation Steps

1. Update `.claude/features/auth-flow.md`:
   - add entitlement load flow.
   - document Pro/normal session state.
   - document check-hash startup gate or link separate feature doc.
2. If check-hash gate deserves its own feature doc, create `.claude/features/shell-startup-check-hash-gate.md` and add it to `.claude/features/README.md`.
3. Update `docs/system-architecture.md` startup sequence diagram/text.
4. Update `docs/codebase-summary.md` for new shell services/store state.
5. Update README only if user-facing startup behavior or extension requirement changed enough to matter for local dev.
6. Document check-hash threat model limit: this is an integrity/compatibility gate under the normal extension trust model, not a guarantee against a malicious extension lying about its own file reads.
7. Run focused verification:
   - shared-store tests/typecheck.
   - shell typecheck.
   - feature-doc verifier.
7. Run `pnpm verify:all` when both `packages/shared-*` and `apps/*` were touched.
8. Record manual verification gaps if live extension/gateway testing was not possible.

## Success Criteria

- [x] `.claude/features/auth-flow.md` matches final code.
- [x] Feature map includes any new check-hash feature doc if created.
- [x] Docs separate SMIT login, Adscheck Pro/normal session, and Facebook session clearly.
- [x] `pnpm --filter @mf2/shared-store test` passes or failure is documented.
- [x] `pnpm --filter @mf2/shared-store typecheck` passes or failure is documented.
- [x] `pnpm --filter @mf2/shell typecheck` passes or failure is documented.
- [x] `pnpm verify:features` passes.
- [x] `pnpm verify:all` is run when shared/app boundary changes are both present, or skipped with reason.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Docs imply route gating was reintroduced | State explicitly that session state is exposed but routes are not gated in this MVP |
| Check-hash feature doc drifts from service code | List real file paths and typed outcomes only after implementation |
| Live extension cannot be tested locally | Document manual smoke requirements and static/unit verification that did run |
| Existing unrelated working tree changes affect verify:all | Report exact failure and classify pre-existing vs introduced |
