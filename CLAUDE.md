# CLAUDE.md — SMIT Client (Vue 3 MFE Monorepo)

Auto-loaded every session. Rules here are MANDATORY. Full rationale: [docs/micro-frontend-governance.md](docs/micro-frontend-governance.md).

## AI rule application (automatic — do not wait for reminders)

For every code-changing task, apply this checklist proactively before editing:

1. Read [docs/code-standards.md](docs/code-standards.md) once for the session, then follow its Vue/TS/Pinia/API/import rules.
2. If the task touches UI, read [.claude/components-catalog.md](.claude/components-catalog.md) first and reuse `@mf2/shared-ui`; do not hand-roll existing components.
3. If the task touches feature logic/files/routes/APIs, read [.claude/features/README.md](.claude/features/README.md), then the matching feature doc before editing.
4. If the task is non-trivial or fixes a bug, check [.claude/lessons/README.md](.claude/lessons/README.md) before choosing the fix.
5. Place new remote code in the existing layer convention: `api/`, `components/`, `composables/`, `pages/`, `stores/`, `router/`, `types/`.
6. Keep `packages/shared-*` changes additive. Never mix `packages/shared-*` and `apps/*` changes in one commit/PR.
7. After editing, update the matching feature doc/catalog/lesson when the change affects them.
8. Run the smallest relevant verification, plus `pnpm verify:all` when AI memory or shared/app boundaries are touched.

## Architecture (fixed decisions — do not relitigate)

- **Monorepo** (pnpm workspaces) + **Turborepo** for task caching. NOT multi-repo, NOT git submodule for `shared-*`.
- Module Federation 2.0: `shell` (host, 8301) consumes remotes `home` (3010) + `ads_asset` (3002).
- `packages/shared-*` (shared-store / shared-ui / shared-types) are MF singletons (`singleton: true`).
  Consequence: at runtime **all remotes share ONE instance** of each shared package. Build-time version pinning does NOT give runtime isolation — a breaking change in `shared-*` breaks every app at once.

## The 5 isolation layers (apply proactively — user should NOT have to repeat these)

### 1. Shared changes are ADDITIVE — never breaking
When editing `packages/shared-*`:
- ✅ Add optional fields (`field?:`), add params with defaults, add new functions/components/store members.
- ❌ Rename/remove/retype existing public API that another app uses.
- Must-break? Use **expand → migrate → contract** across separate PRs (add new alongside old → move each app over → remove old only when no app uses it).
- Mark removals `@deprecated` for one release before deleting.

### 2. PR-split — never mix `packages/shared-*` with `apps/*` in one PR/commit
- Shared change = its own PR, merged FIRST (must compile + have tests).
- App change = separate PR built on the already-merged shared.
- Reason: lets a broken app PR be reverted/dropped while the shared change stays on `main` for other apps; keeps app commits free of `packages/` so per-path revert is clean.

### 3. Deploy per-app — independently
- Each app builds + deploys on its own. A broken `home` must NOT block deploying `ads_asset` or `shell`.
- Do NOT batch "build all 3 then deploy together".
- Tag each successful production deploy per-app: `home-deploy-YYYY.MM.DD`, `ads_asset-deploy-...`.

### 4. CI gate keeps `main` green (prevention, not cure)
- `main` is the integration point and MUST stay green. Code that fails typecheck/build does not merge.
- Use Turbo affected-graph: `pnpm turbo run typecheck build --filter=...[origin/main]`.
- Branch protection: CI green required before merge. Touching `packages/shared-*` requires CODEOWNERS (tech-lead) review.

### 5. `git restore --source` is the LIFEBOAT only — reactive recovery, never the primary strategy
- Roll back ONE remote without touching others (per-path, not whole-repo checkout):
  `git restore --source=<good-ref> -- apps/home/` then commit as `revert(home): ...`.
- Before restoring, check the bad commit did not also change shared: `git show <bad-sha> --stat | grep packages/`.
- Never force-push `main` backwards; always move forward with a revert commit.
- If layers 1–4 are followed, you will rarely reach this layer.

## Quick reference

| Action | Command |
|--------|---------|
| Build affected only | `pnpm turbo run build --filter=...[origin/main]` |
| Build one app | `pnpm --filter @mf2/home build` |
| Roll back one remote | `git restore --source=<ref> -- apps/<app>/` |
| Did commit touch shared? | `git show <sha> --stat \| grep packages/` |

> Naming footgun: the **directory** is `apps/ads_asset/` (underscore) but the **package** is `@mf2/ads-asset` (hyphen). Use the underscore form in path filters (`./apps/ads_asset`), the hyphen form in package filters (`@mf2/ads-asset`). Mixing them silently matches nothing.
> Turbo cache + env: if shell ever reads `HOME_REMOTE_URL`/`ADS_ASSET_REMOTE_URL` (or any new var) at **build time**, add it to `turbo.json` `build.env` or Turbo will serve stale cached builds.

## MF2 Contract

- Remotes expose `./App` (standalone entry) **and** `./routes` (`RouteRecordRaw[]`).
- Shell declares a named parent route per remote (`remote-home`, `remote-ads-asset`) and injects each remote's `./routes` via dynamic `addRoute` on first navigation (see [apps/shell/src/router/remote-routes.ts](apps/shell/src/router/remote-routes.ts)).
- `RemoteHost` (host) owns role/feature gating + error boundary + Suspense; the remote renders its child routes into `<router-view>`.

## Remote layer convention (create on demand, not pre-stubbed)

Inside `apps/<remote>/src/`: `api/` (typed fns wrapping shared `api` — components never call `fetch`/`api_get` directly), `components/`, `composables/` (`use-*`), `pages/` (route views), `stores/` (remote-local Pinia — never `auth`/`layout`), `router/` (child routes exposed as `./routes`), `types/` (promote to `shared-types` only when ≥2 apps need). The shared `api-client` owns timeout + 401 + error classification; do not re-implement per remote.

## AI memory

- Feature map lives in [.claude/features/](.claude/features/) — read `README.md` first to locate a feature, then its doc for files/flow/APIs.
- Updating the matching feature doc is part of any task that changes a feature's logic/files/routes/APIs. Not optional.
- Component catalog lives in [.claude/components-catalog.md](.claude/components-catalog.md) — read it BEFORE writing any UI; reuse shared-ui, never hand-roll a component that already exists.
- Lessons (footguns already hit) live in [.claude/lessons/](.claude/lessons/) — read before non-trivial changes; after diagnosing a memorable bug/footgun, write a lesson (`<slug>.md` from `_TEMPLATE.md` + index row). Mandatory like feature docs.
- Workflow entrypoint: [.claude/playbook.md](.claude/playbook.md) — for UI/feature/bug tasks, follow the matching playbook flow (catalog → feature doc → lessons → propose → do → update memory).

## Conventions

- Read [docs/code-standards.md](docs/code-standards.md) before writing code; follow existing naming (kebab-case files, `use-*` composables, `*-store.ts`).
- Comments/code in English; explain the WHY (invariant/race/trade-off), never reference plan/phase numbers in code.
- YAGNI / KISS / DRY. Surgical changes only — touch what the task requires.
