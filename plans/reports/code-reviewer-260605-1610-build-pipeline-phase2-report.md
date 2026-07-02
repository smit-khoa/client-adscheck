# Code Review — Build Pipeline Phase 2 (dist-bundle assembly + selective build)

**Status:** DONE_WITH_CONCERNS
**Scope:** scripts/{remote-segments,build,assemble-dist,verify-dist-assembly}.mjs (new), package.json + .gitignore + verify-same-origin-remotes.mjs (modified)
**Verdict:** Acceptance criteria 1-5 met by the *script* code. Criterion 6 (DRY) only half-met. Two CRITICAL findings sit **outside the reviewed files** — Phase 2's new machinery is not wired into the actual deploy path, so its safety guarantees don't reach production.

---

## Critical

### C1 — New assembler + verify guard are NOT in the deploy path (dead safety)
`.github/workflows/deploy-pages.yml` (unchanged by this diff) still runs the **old hand-rolled** "Assemble _site" step: `mkdir -p _site/... ; cp -r apps/*/dist/* _site/...`. Meanwhile `pnpm build` now also runs `assemble-dist.mjs` → produces `dist-bundle/`, which the workflow then **ignores** (it uploads `_site/`, not `dist-bundle/`).

Consequences:
- `assemble-dist.mjs` header claims it "Ports the old CI 'Assemble _site' step into a local script" — but the CI step was never removed, so both exist and only the old one deploys.
- Criterion 5's whole point — "partial build → assembler WARNS, verify guard CATCHES, no silent half-deploy" — is bypassed: the deploy uses raw `cp -r`, and there is **no `verify:dist` gate** in either workflow (`grep verify` in ci.yml hits only the job name `verify:`). A missing remote dist in CI would let `cp -r .../dist/*` error, but nothing asserts the assembled tree is complete before `upload-pages-artifact`.

Fix direction: replace the manual `_site` block with `pnpm build` (already assembles) + `pnpm verify:dist`, and upload `dist-bundle/`. (Confirm with lead whether wiring CI is Phase 2 or a later phase — but as it stands the new code is unreachable in prod.)

### C2 — Deploy bakes ABSOLUTE remote URLs, defeating same-origin (the thing verify:same-origin forbids)
`deploy-pages.yml` sets `ADACCOUNTS_REMOTE_URL=https://smit-khoa.github.io/MF-2-vue/adaccounts` and `ADS_MANAGER_REMOTE_URL=...` as build env. Per `dev-proxy-config.ts:18-20`, an explicit `*_REMOTE_URL` override **takes precedence over** the prod same-origin relative branch (`:23`). So production bakes the absolute `smit-khoa.github.io` domain into the shell — exactly the leak `verify-same-origin-remotes.mjs:43,73` greps for and fails on.
`verify:same-origin` passes only because it `delete`s those env vars before building (`:27-28`); the **real deploy does not**. The same-origin guarantee is verified in a synthetic env and contradicted in the actual one.
Pre-existing (workflow unchanged by this diff) → flag, don't block Phase 2 — but it makes the Phase 1 "same-origin relative" guarantee non-operative in prod. Escalate.

---

## High

### H1 — Criterion 6 (DRY) only half-satisfied: two "single source of truth" copies
The underscore→hyphen rule exists in **two** files, each *claiming* to be canonical:
- `scripts/remote-segments.mjs:16` `toSegment = name.replace(/_/g,'-')` — header: "single source of truth".
- `apps/shell/dev-proxy-config.ts:14` `url_segment = name.replace(/_/g,'-')` — comment: "This pure rule is the single source of truth for that mapping."

The DRY refactor only rewired the **verifier** (`verify-same-origin-remotes.mjs:13` imports `toSegment`). The **config it verifies** still owns a private copy. Result: the verifier validates one duplicate against the other; they pass only because identical *today*. If `dev-proxy-config.ts` drifts (e.g. a remote needing a custom segment), verify still asserts the shared module's rule, not the config's — false confidence.
Note `dev-proxy-config.ts` is a `.ts` loaded by rspack's Node-strips-types path (Node 24), `include`s only `src/**` + the two root configs (tsconfig `:12`); importing the `.mjs` (which does a runtime `readFileSync` of owners.json) is heavier than the config needs. Pragmatic options: (a) extract the one-liner `toSegment` to a tiny `.ts`/`.mjs` both import, or (b) accept the dup but delete the "single source of truth" claim from one file so the contradiction isn't asserted twice. Recommend (a). Confirm scope with lead — Phase 1 owns `dev-proxy-config.ts`.

---

## Medium

### M1 — `pnpm build` silently ignores any flag that isn't --apps/--no-assemble
`build.mjs` only reads `--apps` and `--no-assemble`, then hardcodes `turbo run build <filters>`. `pnpm build --filter=...[origin/main]` (the affected-graph command documented in CLAUDE.md "Quick reference") would be **silently dropped** and build ALL apps. Not an active regression — CI calls `pnpm turbo run typecheck build --filter=...[origin/main]` **directly** (ci.yml:49), bypassing `build.mjs`, so the affected graph is intact. But the wrapper diverges from the documented `pnpm build` ergonomics; a dev passing `--filter` gets a full build with no warning. Consider erroring on unknown args, or documenting that `pnpm build` only accepts `--apps`/`--no-assemble`.

### M2 — Empty app name from trailing/double comma → `@mf2/` → turbo hard-fails (acceptable, slightly opaque)
`--apps adaccounts,` and `--apps adaccounts,,shell` produce `--filter=@mf2/` (verified). Turbo exits 1: `x No package found with name '@mf2/' in workspace`. Fails fast (good — no silent skip) but the message doesn't point at the trailing comma. Unknown app name (`--apps bogus`) also exits 1 cleanly (`No package found '@mf2/bogus'`). Low-value to fix; filtering empties (`.filter(Boolean)`) would tidy it.

---

## Low / Out of scope (confirmed, no Phase-2 worsening)

- **L1 stale dev scripts:** `package.json:13-14` `dev:home` / `dev:ads-asset` reference apps that don't exist (live apps: adaccounts, ads-manager, shell). Pre-existing; this diff did not touch or worsen them. `dev:shell` is valid. `dev` (`-r --parallel --filter './apps/*'`), `preview`, `typecheck` untouched → no regression.
- **L2 CLAUDE.md drift:** project CLAUDE.md still documents remotes as `home`+`ads_asset` (ports 3010/3002) but live = `adaccounts`+`ads_manager`. Doc-only, out of scope; worth a separate doc-sync task.

---

## Targeted checks — PASS

- **assemble-dist rmSync safety (c):** `BUNDLE = join(CLIENT_ROOT,'dist-bundle')` is a fixed absolute path, never derived from user input. `rmSync(BUNDLE,{recursive,force})` cannot escape dist-bundle; no arg flows into the path. `cpSync` srcs are `apps/<folder>/dist` (also fixed). Safe.
- **Segment ↔ folder mapping:** owners.json keys `adaccounts`,`ads_manager` → segments `adaccounts`,`ads-manager` → match dirs `apps/adaccounts`,`apps/ads-manager`. `appDist(segment)` resolves correctly (verified live). `cpSync(shellDist, BUNDLE)` copies shell to root; remotes nest under hyphen segment. Correct.
- **Missing-shell hard-fail / missing-remote warn:** `assemble-dist.mjs:27-30` exits 1 on shell missing; `:36-38` pushes warning + continues per remote; verify-dist-assembly.mjs:23 then FAILs on missing `<segment>/mf-manifest.json`. Matches criterion 5. (Note the guard runs only if invoked — see C1.)
- **Turbo filter resolution (verified via --dry):** `--filter=./apps/*` → all 3; `--filter=@mf2/adaccounts` → 1; bogus → exit 1.
- **NODE_ENV (f):** each app build script is `cross-env NODE_ENV=production rspack build`, so building via turbo (any path) bakes prod URLs; `build.mjs` need not set NODE_ENV. turbo.json:5-13 lists NODE_ENV/BASE_PATH/both REMOTE_URL vars in `build.env` → cache keys correct. Sound.
- **.gitignore:** `dist-bundle` present (`:3`).
- **DRY (verifier side):** verify-same-origin + verify-dist-assembly + assemble-dist all import from remote-segments.mjs. Good — gap is only dev-proxy-config (H1).

---

## Unresolved questions
1. Is wiring CI/deploy to the new `assemble-dist` + `verify:dist` (C1) part of Phase 2, or a later phase? As written, the new scripts never run in prod.
2. C2: are the absolute `*_REMOTE_URL` env vars in deploy-pages.yml intentional (override same-origin on purpose), or a Phase-1 leftover that should be removed so the relative branch runs in prod?
3. H1: may Phase 2 touch `apps/shell/dev-proxy-config.ts` to share `toSegment`, or is that file frozen under Phase 1 ownership?
