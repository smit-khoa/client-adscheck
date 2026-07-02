# Same-Origin Dist Pipeline + Docs Sync — 3-Phase TDD Build Refactor

**Date**: 2026-06-05
**Severity**: High (build pipeline + deployment infra)
**Component**: Shell rspack config, build scripts, CI/deploy, `./docs` drift
**Status**: Resolved (one pre-existing drift item deferred)

## What Happened

Completed plan 260605-1505 (3 phases, TDD discipline — script → verify-pass → code-review → merge):

**Phase 1 — Same-origin relative remotes**: Rewrote shell prod config to bake remote URLs as relative paths (`${BASE_PATH}${segment}` e.g. `/adaccounts/...`) instead of absolute `https://smit-khoa.github.io/...`. Browser resolves same-origin, domain-independent, works on `localhost:8301` and `my-domain.com/client-adscheck/` without env var swapping. Discovery: remote URL string lives in THREE places — `mf-manifest.json` (`remotes[].entry`), precompiled `runtime.*.js`, `index.html` preconnect — all must be relative. Wrote `scripts/verify-same-origin-remotes.mjs` (TDD: 12 fail → pass, builds twice for `BASE_PATH /` + `/client-adscheck/`).

**Phase 2 — Selective build + shared segment truth**: Created `scripts/remote-segments.mjs` — single source mapping app name → URL segment (handles `ads_manager` folder → `ads-manager` hyphen). Made it DRY: `build.mjs`, `rspack.config.ts` dev-proxy, and new verifier all import `toSegment()`. Code review caught H1: `dev-proxy-config.ts` still had its own local segment copy → deleted, now imports shared. Added `.d.mts` for vue-tsc.

**Phase 3 — Flatten dist → retire CI**: User request: delete the middle `dist-bundle/` step and intermediate `publish-dist.mjs`. Changed `assemble-dist.mjs` to mirror app dists directly into `../client-adscheck` (configurable `DIST_TARGET`). Added completeness check BEFORE wiping (missing app dist → abort, target untouched) + reject unsafe paths (ancestor traversal, root). Deleted `publish-dist.mjs` + `verify-publish.mjs` (now redundant). Then `git rm .github/workflows/deploy-pages.yml` per user ("xóa hết để codebase sạch") — the only place absolute remote URL env vars lived; same-origin makes them unnecessary.

**Bonus: interactive build picker**: User wanted `pnpm build` TUI like agency/client. Added `@inquirer/prompts` checkbox to `build.mjs` (remotes only; shell always appended). TTY + no `--apps` → menu; non-TTY/CI → build all (no hang); Ctrl-C → clean exit. Bug found during verify: `remoteNames` array used `ads_manager` (underscore) but filtered against package `@mf2/ads-manager` (hyphen) → matched 0 packages. Fixed via `toSegment()` call.

## The Brutal Truth

This session was a gauntlet of **naming collisions** (underscore/hyphen footgun replayed), **silent failures** (CODEOWNERS rule matched nothing for 6 months), and **false confidence** (docs-manager reported "no ambiguities" 14 times then I found them by grep). The worst part: we shipped the monorepo for months with a broken CI gate and a useless CODEOWNERS file, and no one caught it until governance was formalized.

The reversal (drop dist-bundle, flatten directly to deploy repo) felt right for UX but forced re-architecture of assemble logic and deletion of 2 scripts. That's fine — it's iterative. But it also means the original plan's "Validation-decision-3" (build separate from publish) was wrong, and we're learning that NOW in production-path code.

## Technical Details

**Remote URL placement — VERIFIED by build + inspect manifest:**
- `apps/shell/dist/mf-manifest.json`: `remotes[0].entry = "/adaccounts/index.js"` (relative)
- Precompiled `runtime.*.js`: entry URLs inlined, scanned for hardcoded `https://` (none found after build)
- `index.html preconnect`: `<link rel=preconnect href="/adaccounts">` (no protocol = relative)
- Tests: build with `BASE_PATH=/`, inspect manifest; rebuild with `BASE_PATH=/client-adscheck/`, inspect manifest. Both pass `verify-same-origin-remotes.mjs`.

**Segment naming — VERIFIED by filter test:**
- Folder: `apps/ads_manager/` (underscore)
- Package: `@mf2/ads-manager` (hyphen)
- Build filter: `pnpm --filter @mf2/ads-manager build` (hyphen)
- Path filter: `git show -- apps/ads_manager/` (underscore)
- MFE config key: `ads_manager` (underscore, valid JS identifier)
- URL: `/ads-manager/` (hyphen, clean URL)
- Shared source: `toSegment('ads_manager')` → `'ads-manager'` (one place to fix if renamed)

**Build completeness check — VERIFIED by abort test:**
- Before `rmSync(DIST_TARGET)`, scan each app's `dist/` for `index.js` + `mf-manifest.json`.
- If missing: throw, exit 1, target untouched.
- Path guard: reject traversal (`../`), root (`/`), home (`~`).
- Test: removed `apps/adaccounts/dist/index.js`, ran assemble, confirmed abort + target safe.

**Docs drift — TWO CLASSES FIXED:**
- Class A (session-driven staleness): code-standards build commands, system-architecture deployment strategy, deployment-guide steps — fixed by docs-manager + manual grep for missed refs (~14 found).
- Class B (pre-existing): old app names `home`/`ads_asset` baked in 7 docs, old routes `/business/:bid/home`, broken scripts `pnpm dev:home`. Fixed renaming + deletion of aspirational AWS/S3/CloudFront sections (deployment-guide 698→490 LOC).
- CODEOWNERS silent failure: paths `/apps/home/` didn't exist (real: `/apps/adaccounts/`) → GitHub silently ignored rule, no one was ever required to review shared-* changes. Fixed in this session.

## What We Tried

1. **Relative vs env-var remotes**: Tried env vars first (old way), but BASE_PATH changes force rebuild. Relative paths in manifest stay static; browser resolves same-origin. Cleaner.
2. **Deduping segment refs**: Three copies (dev-proxy, rspack, verify). Code review flagged DRY failure. Created `remote-segments.mjs`, imported everywhere. No more drift.
3. **Dist assembly paths**: First iteration kept `dist-bundle/` + separate publish. User UX feedback: empty deploy repo after build is confusing. Flipped to direct assemble. Had to add guards (completeness check, path safety).
4. **Docs sync**: docs-manager did bulk rename. Grepped for missed refs manually (underscore mismatch, old `/business/` routes). Found 14. Each fixed + re-verified.

## Root Cause Analysis

**Why remotes stayed absolute for 6 months**: Early config used `https://smit-khoa.github.io/...` as only example, and it worked locally for shells running on that exact domain. No one tried `localhost:8301` or a different subdomain until this week.

**Why CODEOWNERS was broken**: Paths were copy-paste from template (`/apps/home/`). Real app is `adaccounts/`. GitHub does not warn if a CODEOWNERS path never matches a real file — it silently NO-OPs. No CI failure, no review required. Only visible in governance audit (this session).

**Why underscore/hyphen filter mismatch resurfaces**: It's a naming footgun baked into pnpm (package name conventions) × folder layout (kebab-case dirs) × MFE config (valid-JS-identifier constraint). Three systems, three different rules. Docs say it once; code repeats it thrice. One source of truth in `remote-segments.mjs` fixes the code part; human discipline (use shared function) fixes the repetition.

**Why docs-manager said "no ambiguities"**: It grepped for OLD names in isolation, reported "not found" = "no ambiguity". Didn't cross-check routing, scripts, or config files. My grep was broader (all `.md`, `.ts`, `.json`, `.yml`). Lesson: automated search needs scope clarity upfront, not "assume obvious".

## Lessons Learned

1. **Same-origin paths should be the default, env-vars the exception**: Relative URLs decouple deploy domain from build. If you need hardcoded domain, that's a smell — you're embedding deploy-time info at build time.

2. **Single source of truth for naming transforms prevents silent failures**: `toSegment()` used in 3+ places means 1 fix. Without it, one site uses `ads_manager`, another uses `ads-manager`, and turbo matches zero packages. Automation catches it if centralized; duplication hides it.

3. **Path guards (safety checks before destructive ops) are non-negotiable**: `rmSync` without checking target existence is a footgun. A bug in the path construction could wipe the wrong dir. Test by removing one dist file and verifying abort.

4. **CODEOWNERS paths must be verified to match real folder layout**: GitHub silently ignores non-matching paths. Add a CI check (script that lists CODEOWNERS patterns, verifies each exists). We got lucky this session; next time might not notice for another 6 months.

5. **Docs sync isn't a one-pass job if the codebase renamed**: Grep broadly (`/home/`, `ads_asset`, `/business/:bid`) across code AND docs. Automated replacements catch syntax; they miss config files, env examples, and shell scripts. Manual follow-up is not optional.

6. **Dropping intermediate build steps is allowed — but reverses earlier decisions**: Phase 3 removed the "separate build from publish" idea. Document the reversal in commit message and migration notes so future devs understand why the old step existed (and didn't work for us).

## Next Steps

**Done (merged, verified green):**
- Phase 1: relative remotes, verified on two BASE_PATH values, builds + tests pass.
- Phase 2: shared segment module, code-review H1 fixed (DRY), vue-tsc types added.
- Phase 3: direct assemble, guards + completeness check, deploy CI deleted.
- Interactive build picker: TTY menu, non-TTY passthrough, bug fixed (underscore → hyphen).
- Docs sync: 7 docs + 3 config files renamed + fixed. CODEOWNERS + deployment-guide cleaned.

**Deferred (out of scope, pre-existing):**
- **`client/CLAUDE.md` still names old remotes** (`home`/`ads_asset`). Root adscheck is not a git repo, so I left it untouched (user can update later). Code elsewhere uses new names; this is doc-only.

**To remember for the next person:**
- If a remote folder or package name changes, update `remote-segments.mjs`, then grep code for the old name and update imports.
- When flattening dist to a deploy repo, ensure deploy repo `.git/` exists or `assemble-dist.mjs` will error. Initialize it first.
- CODEOWNERS paths are SILENT on mismatch — verify with `find` that each path exists.
- Build directly to the deploy target (no intermediate step) if the deploy repo is under version control elsewhere. The extra step adds configuration debt.
