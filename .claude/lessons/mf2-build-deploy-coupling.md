---
title: MF2 build and same-origin deployment assembly
date: 2026-06-10
updated: 2026-06-12
scope: build/deploy
---

## Symptom

A local build wrapper can quietly re-couple Module Federation apps if it builds one remote and
then automatically assembles or copies every app into an extra deploy directory. The user sees generated
output outside each app's own `dist/` even though MF2 remotes are separate runtime units.

## Root cause

Build and deploy can be conflated. The safe same-origin deployment shape is still useful for a single
static host, but an assemble step must only mirror the selected app(s), otherwise building one app can
accidentally overwrite unrelated deployed apps.

## How to avoid

- Keep the deploy tree layout same-origin: shell at root, remotes under their URL segments.
- If `pnpm build` assembles for local deployment, mirror only the selected app(s).
- Building a remote should update only that remote directory; building shell should update root shell
  files and `404.html` while preserving remote directories.
- Verification should support both per-app dist checks (`pnpm verify:dist <app>`) and full assembled
  tree checks (`pnpm verify:dist assembled`) when all apps are expected to be present.
- CI can call `turbo run build` directly when it needs build-only behavior.

## Related

- `docs/micro-frontend-governance.md` Layer 3 — Deploy per-app.
- `scripts/build.mjs`
- `scripts/assemble-dist.mjs`
