# MFE Governance Tooling — 5 Layers into Code

**Date**: 2026-06-04
**Severity**: Medium (architectural foundation)
**Component**: Monorepo governance, CI/CD, task caching
**Status**: Resolved (deferred items documented)

## What Happened

Started with a design question: monorepo vs multi-repo vs git submodules for sharing `@mf2/shared-*` packages in Module Federation 2.0? Realized that `singleton: true` in MF config means all remotes share a SINGLE runtime instance of each shared package — build-time version isolation via repository boundaries is largely illusory. This realization flipped the entire strategy: isolation must come from **process discipline**, not file layout.

Implemented 5-layer governance model (additive changes, PR-split, per-app deploy, CI gate, lifeboat restore) codified in `client/CLAUDE.md` and `docs/micro-frontend-governance.md`. Then translated intent into working code: initialized git (repo had zero git history), deployed Turborepo, wired CI gate, added CODEOWNERS, documented deploy tagging convention.

## The Notable Part

This was supposed to be straightforward tooling. Two things stood out. First, the repo **had no git at all** (`git rev-parse` failed) — a blocking discovery that made git init the mandatory first phase, since every other layer (CI, CODEOWNERS, deploy tags) depends on it.

Second and more interesting: the `code-reviewer` pass caught that the CI post-merge gate was a **no-op**. The `push: main` job reused `--filter=...[origin/main]`, which on a push event diffs `main` against itself → zero changed packages → Turbo runs zero tasks. The gate meant to catch "two PRs green in isolation, broken when merged" was itself not running on merge. Reasoned from event semantics (not a separate debug session), fixed in `4b8f03d`: full build on push, affected-only on PR.

## Technical Details

**Turborepo filter semantics — VERIFIED by testing:**
- `--filter=[HEAD]`: only the package that changed (isolation).
- `--filter=...[HEAD]` (three dots): the changed package PLUS all dependents (fan-out).
- The three-dot prefix is MANDATORY. Changed `shared-types` with `[HEAD]` only → no apps rebuilt. With `...[HEAD]` → all 3 apps rebuilt. Silence on mismatch.

**Cache performance — VERIFIED by run:**
- First typecheck (cold): 4.756s
- Second typecheck (Turbo cache hit): 17ms (FULL TURBO)
- `build.env` lists `NODE_ENV`, `API_GATEWAY_URL`, `DASHBOARD_URL` (the vars shell's rspack actually reads at build time). CI cache key uses `hashFiles('pnpm-lock.yaml')`.

**CI push-to-main bug — VERIFIED by git log inspection and fix commit `4b8f03d`:**
- On a `push: main` event, `--filter=...[origin/main]` diffs `origin/main` against itself (tautology).
- Result: zero changed packages → Turbo ran zero tasks.
- Post-merge gate was a no-op.
- Fixed by running `pnpm turbo run typecheck build` (full) on push, `--filter=...[origin/main]` (affected) on PR.

**Naming footgun — DOCUMENTED in `CLAUDE.md`:**
- Directory: `apps/ads_asset/` (underscore)
- Package name: `@mf2/ads-asset` (hyphen)
- Mixing them in filters matches nothing, fails silently.

**What was actually committed:**
- 93 files in phase 00 (git init); no secrets, no locked deps, no build artifacts leaked.
- `turbo.json` with `tasks: { typecheck, build }` using Turbo 2.9+ syntax.
- `.github/workflows/ci.yml`: PR gate (affected-only), push-to-main gate (full), YAML valid.
- `.github/CODEOWNERS`: placeholder reviewers (`@tech-lead`) for `packages/shared-*`.
- `docs/deployment-guide.md`: per-app deploy tags (`home-deploy-YYYY.MM.DD`), per-path restore procedure.

## What We Tried

1. **Monorepo vs Multi-repo debate**: Researched submodule isolation, npm registry versioning. Concluded: all illusory under MF singletons. Monorepo + discipline wins.
2. **Turbo filter formulation**: Built test case (shared-types change), verified both `[HEAD]` and `...[HEAD]` behaviors independently. Three-dot version is correct.
3. **CI gate on push**: First attempt used `--filter` which tautology'd. Switched to full build on push (catches post-merge regressions), affected-only on PR (fast feedback).
4. **Cache key**: Review flagged the CI Turbo cache key was `github.sha` (unique per commit → never primary-hits). Changed to `hashFiles('pnpm-lock.yaml')`. Separately confirmed `HOME_REMOTE_URL`/`ADS_ASSET_REMOTE_URL` are doc-only (not read by any rspack config), so correctly absent from `build.env` — noted as latent: add them there if they ever become build-time.

## Root Cause Analysis

**Why the repo had no git**: Not scoped to this session — pre-existing state. Blocked all downstream layers (can't run CI, can't CODEOWNERS, can't tag deploys). Init git was the first act.

**Why the push gate was broken**: Misunderstood GitHub Actions event context. On `push: main`, the base is always `main` and the head is always `main` (the commit just arrived), so `origin/main...origin/main` is a no-op. Fix required separating push logic (full check) from PR logic (affected-only).

**Why Turbo three-dot filter wasn't obvious**: Turborepo docs list both syntaxes; the three-dot variant is less common. Without testing (which was done), it's easy to assume single-dot is enough. This is a "know it when you see it" gotcha.

## Lessons Learned

1. **Singleton consequence is discipline-first**: Repository structure does not isolate breaking changes in MF. The 5-layer governance is not optional polish—it's the architecture. Code it first, build on it.

2. **CI gates must be tested with real failures**: A gate that never fails is invisible. Injected a type error into `apps/home` midway to verify the gate was actually live. Without that, the push-to-main no-op would have shipped silently. Gate testing ≥ gate implementation.

3. **Filter syntax is silent on mismatch**: Turbo `--filter=...[HEAD]` matching zero packages is indistinguishable from success. Always verify filter output explicitly (e.g., `pnpm turbo run build --filter=...[origin/main] --graph` or dry-run).

4. **Naming consistency across repo boundaries**: A directory named `ads_asset` with a package named `ads-asset` is asking for silent failures. Path filters need the underscore, package filters need the hyphen; mixing matches nothing. Caught by code review and documented in `CLAUDE.md`.

5. **Post-merge vs pre-merge logic are different**: The PR gate (fast, affected-only) and the push gate (complete, all tasks) need different implementations. Reusing the same command for both is a footgun.

## Next Steps

**Done (verified, in main):**
- Git baseline + 5-layer governance codified in `CLAUDE.md` + `docs/micro-frontend-governance.md`.
- Turborepo 2.9, cache hit verified, filter behavior documented.
- CI gate (PR affected-only, push full), tested with injected error.
- CODEOWNERS + deploy convention + per-path restore script documented.

**Deferred (user decision required):**
- **Branch protection on `main`**: requires remote URL (GitHub/GitLab/etc.). Churn is local-first; once repo is pushed, add branch protection rule via platform UI.
- **CODEOWNERS real handles**: placeholders are `@tech-lead`, `@dev-a`, `@dev-b`. Replace with actual GitHub/GitLab usernames when team is decided.
- **Platform-specific deploy pipeline**: `docs/deployment-guide.md` lists convention (tags, paths, restore); actual platform hookup (Vercel, VPS, Cloudflare) waits for platform decision.

**To remember for the next person:**
- If you add a new build-time env var to shell/home/ads_asset, add it to `turbo.json` `build.env` or your cache will go stale.
- If a commit touches `packages/shared-*`, check dependents before merging (Turbo will run affected-only CI, but human eyes matter).
- Use `git restore --source=<ref> -- apps/<app>/` not `git checkout <ref> -- apps/<app>/` (more surgical).
- The three-dot Turbo filter is not optional.
