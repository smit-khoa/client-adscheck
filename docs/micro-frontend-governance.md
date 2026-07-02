# Micro-frontend Governance

Why this monorepo is organized the way it is, and the 5 layers that keep one broken remote from taking down the others. Operational rules live in [../CLAUDE.md](../CLAUDE.md); this doc explains the **reasoning** so future contributors don't relitigate settled decisions.

## Settled architectural decisions

| Decision | Choice | Why not the alternative |
|----------|--------|-------------------------|
| Repo layout | **Monorepo** (pnpm workspaces) | Multi-repo forces publish/version-drift overhead every time `shared-*` changes (bump → publish → update each consumer repo). `shared-*` is under active development, so that cost is paid constantly. |
| Build orchestration | **Turborepo** | Task caching + dependency-graph awareness. Builds only affected apps. Value grows as app count / CI usage grows. |
| `shared-*` distribution | **Workspace packages** (not npm-published, not submodule) | Submodule = commit-pointer pinning, no semver, breaks pnpm workspace symlinks, worse DX. npm-publish = isolation that runtime singletons make largely illusory (see below). |

### The singleton truth (read this once, understand everything else)

`shell/rspack.config.ts` declares every shared package as `singleton: true`:

```ts
shared: {
  "@mf2/shared-ui":    { singleton: true, eager: true, requiredVersion: false },
  "@mf2/shared-store": { singleton: true, eager: true, requiredVersion: false },
  "@mf2/shared-types": { singleton: true, eager: true, requiredVersion: false },
  // vue / vue-router / pinia also singleton
}
```

At runtime, when `adaccounts` and `ads-manager` are both loaded into the `shell` page, **exactly one instance** of each shared package exists. Module Federation loads the highest compatible version and warns on the rest.

Implication that drives all 5 layers below:
> **You cannot have independent shared versions at runtime — not with monorepo, not with npm-published packages, not with submodules.** A breaking change in `shared-*` breaks *every* app simultaneously, regardless of how the code is distributed. Isolation must therefore come from **discipline + process**, not from repo boundaries.

This is why "split shared into its own repo for control" is a false promise here: it buys build-time version pins that the runtime singleton immediately collapses, while adding real publish overhead.

---

## The 5 isolation layers

Ordered prevention → recovery. Earlier layers stop problems; the last is a lifeboat.

### Layer 1 — Additive shared changes

Because of the singleton truth, a breaking change to `shared-*` breaks consumers that didn't change a line. So shared evolution must be additive.

**Additive (safe):**
```ts
export interface Business {
  business_id: string;
  name: string;        // KEEP
  title?: string;      // ADD — optional, old consumers ignore it
}
```

**Breaking (forbidden without migration):**
```ts
export interface Business {
  business_id: string;
  title: string;       // renamed from `name` → ads-manager reading `.name` breaks instantly
}
```

| Surface | Breaking (avoid) | Additive (do) |
|---------|------------------|---------------|
| Type/interface | rename/remove field; optional→required | add optional field |
| Function (`api_get`) | change existing param order/type | add param with default; or new `*_v2` fn |
| Component (`Button.vue`) | remove/rename in-use prop | add prop with default |
| Store (`auth-store`) | remove/rename action/getter | add new action/getter |
| Removal | delete outright | `@deprecated` one release, then delete |

**Forced breaking → expand / migrate / contract:**
1. **Expand:** add new alongside old (additive). `main` stays green.
2. **Migrate:** move each app to the new API, one PR per app, no rush.
3. **Contract:** delete the old API only once no app references it.

### Layer 2 — PR-split (shared ≠ app in the same PR)

Never mix `packages/shared-*` and `apps/*` in one PR/commit.

```
PR #A  feat(shared): add avatar_url to User         ← packages/ only; compiles + tests; merge FIRST
PR #B  feat(adaccounts): profile UI (depends on #A) ← apps/adaccounts only; may be WIP/broken; stays on branch
```

Payoff:
- Other apps consume the shared change as soon as #A merges — no waiting on #B.
- If #B breaks, drop/revert it; the shared change stays on `main`.
- App commits contain no `packages/` files → per-path revert (Layer 5) is always clean, and the "did the bad commit also touch shared?" check passes trivially.

Enforced by `.github/CODEOWNERS` (see Layer 4) requiring tech-lead review on `packages/shared-*`.

### Layer 3 — Deploy per-app

MFE's whole point is independent deployability. Each app builds + deploys on its own:
- A red `adaccounts` build must NOT block deploying `ads-manager` or `shell`.
- `adaccounts` simply keeps serving its last-good deployed bundle until fixed.
- Do not batch "build all 3, deploy together" — that reintroduces monolith coupling.

Tag every successful production deploy per-app so Layer 5 can target a known-good state:
```
adaccounts-deploy-2026.06.04
ads-manager-deploy-2026.06.04
```

> Note: the legacy "`pnpm build` succeeds (all 3 apps)" line in the deploy checklist is a *pre-merge sanity gate*, not the deploy unit. The deploy unit is one app.

### Layer 4 — CI gate (keep `main` green)

Prevention layer — this is what makes "broken code on git" rare instead of routine. Without it, the only defense is reactive recovery (Layer 5), which is backwards.

Sketch (`.github/workflows/ci.yml`):
```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm turbo run typecheck build --filter=...[origin/main]
  # only affected apps; broken adaccounts → red PR → cannot merge
```

- Branch protection on `main`: CI green required before merge.
- `.github/CODEOWNERS`:
  ```
  /packages/shared-*/   @tech-lead     # shared touch needs lead review (enforces Layer 1+2)
  /apps/adaccounts/     @dev-a
  /apps/ads-manager/    @dev-b
  ```

Turbo + CI are a pair: Turbo makes CI fast (affected-only), CI uses Turbo to block breakage.

### Layer 5 — `git restore --source` (lifeboat only)

Reactive recovery when layers 1–4 leak. Roll back one remote without touching others:

```bash
# find last-good adaccounts commit (or use a deploy tag)
git log --oneline -- apps/adaccounts/

# restore ONLY apps/adaccounts/ to that ref — everything else stays at HEAD
git restore --source=adaccounts-deploy-2026.06.04 -- apps/adaccounts/

# safety: confirm the bad commit didn't also change shared
git show <bad-sha> --stat | grep packages/   # empty = clean to revert

git add apps/adaccounts/ && git commit -m "revert(adaccounts): roll back to last-good, drop broken code"
git push   # forward commit — never force-push main backwards
```

If a bad commit *did* touch `packages/shared-*` (Layer 2 was violated), decide whether other apps need that shared change before reverting it — don't blindly drop shared that `ads-manager` now depends on.

---

## Mental model

```
prevent ──────────────────────────────────────────► recover
 L1 additive    L2 PR-split    L3 deploy   L4 CI gate    L5 git restore
 (shared safe)  (clean revert) per-app     (main green)  (lifeboat)
```

The first four mean a broken `adaccounts` almost never reaches `main` or production, and when it does it's isolated to `apps/adaccounts/`. The fifth is the rarely-needed safety net — not a management strategy.

## Open questions

- Deploy platform not yet decided (Vercel / Netlify / VPS / Cloudflare) — Layer 3 per-app pipeline + tagging convention should be tuned once chosen.
- CI (`.github/workflows/`) not yet created — Layer 4 enforcement is partial: `CODEOWNERS` and `turbo.json` are in place, but the GitHub Actions workflow that runs `turbo run typecheck build --filter=...[origin/main]` and enforces branch protection still needs to be created.
