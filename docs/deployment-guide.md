# Deployment Guide

Complete walkthrough for building, testing, and deploying SMIT Client to production.


---

## Same-origin deployment repo (current local deploy)

`pnpm build` builds the selected app(s), then mirrors those selected outputs into the deployment
repo:

```txt
../client-adscheck-deployment
```

The mirrored tree is same-origin ready:

```txt
/                       -> contents of apps/shell/dist
/adaccounts/            -> contents of apps/adaccounts/dist
/ads-manager/           -> contents of apps/ads-manager/dist
/404.html               -> copy of shell index.html for SPA deep-link fallback
```

Selected apps only are mirrored. Building `adaccounts` updates only `/adaccounts/`; building `shell`
updates root shell files and `404.html` while preserving remote directories.

There is **no CI auto-deploy** in this repo. Deploy timing is manual unless you add a separate
provider-specific workflow.

### How it works

Production shell remote URLs are built from `BASE_PATH` by default:

- `adaccounts` → `${BASE_PATH}adaccounts/mf-manifest.json`
- `ads-manager` → `${BASE_PATH}ads-manager/mf-manifest.json`

So the static host must serve the shell and remotes at matching paths. If you use one domain at
root, the expected layout is:

```
/                       -> contents of apps/shell/dist
/adaccounts/            -> contents of apps/adaccounts/dist
/ads-manager/           -> contents of apps/ads-manager/dist
```

If you deploy each remote on a different domain/path, build the shell with explicit remote URL
overrides:

```bash
ADACCOUNTS_REMOTE_URL=https://adaccounts.example.com \
ADS_MANAGER_REMOTE_URL=https://ads-manager.example.com \
pnpm build --apps shell
```

### Local pipeline

```bash
pnpm install
pnpm typecheck

# Build and mirror selected app(s). Output is also copied into the deployment repo.
pnpm build --apps adaccounts

# Verify the built app dist and, when all apps have been mirrored, the deployment tree.
pnpm verify:dist adaccounts
pnpm verify:dist assembled

# Then commit/push or publish ../client-adscheck-deployment.
```

Selecting apps:

```bash
pnpm build --apps shell
pnpm build --apps adaccounts
pnpm build --apps ads-manager
pnpm build --apps shell,adaccounts,ads-manager
```

Running `pnpm build` without `--apps` in a terminal opens an app picker. In non-TTY/CI it builds
all apps as a sanity gate.

### Should `dist/` be a git repo?

Keep source repo `dist/` ignored by default. You have two valid deploy models:

1. Recommended: host/CI uploads `apps/<app>/dist` directly as the artifact.
   - No generated files are committed to the source repo.
   - The source repo stays clean.

2. Git-based static host: use `../client-adscheck-deployment` as the deploy repo/worktree.
   - `pnpm build` mirrors selected app output into that repo after a successful build.
   - Commit/push from inside the deployment repo only. Do not add generated dist files to the source repo.

Example for a git-based deploy repo:

```bash
pnpm build --apps shell,adaccounts,ads-manager
pnpm verify:dist assembled

cd ../client-adscheck-deployment
git status
git add .
git commit -m "deploy: update client build"
git push origin deploy
```

For a safer first-time setup, create `../client-adscheck-deployment`
as a dedicated deploy repository or worktree before running `pnpm build`. If it does not exist,
the assemble script creates the directory automatically.

### BASE_PATH

`BASE_PATH` defaults to `/`. Keep it as `/` when the shell is served at domain root. If the shell
is served under another path, set that path at shell build time and make sure remotes are hosted
under the same prefix unless you use absolute `*_REMOTE_URL` overrides.

```bash
BASE_PATH=/some-prefix/ pnpm build --apps shell
```

### Verification scripts

```bash
pnpm verify:same-origin   # prod shell build check: remote URLs are BASE_PATH-relative
pnpm verify:dist <app>    # checks apps/<app>/dist has required files
```

---

## Pre-Deployment Checklist

Before any deployment:

- [ ] `pnpm typecheck` passes (0 errors)
- [ ] Build the app(s) you intend to deploy with `pnpm build --apps <app>`
- [ ] `pnpm verify:dist <app>` passes for every app being deployed
- [ ] For shell deploys: `pnpm verify:same-origin` passes, or explicit remote URL overrides are intentional
- [ ] Bundle analysis shows chunks are within budget
- [ ] No console.log in production code
- [ ] Environment variables configured for the build

---

## Build Process

### 1. Clean Build

```bash
# Remove caches and dist/ from previous builds
pnpm clean
```

Removes:
- `dist/` directories (all apps)
- `node_modules/.cache/`
- `@mf-types/` (MF type definitions)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Type Check

```bash
pnpm typecheck
```

Runs `vue-tsc --noEmit` on all workspaces. Must pass before build.

### 4. Build App(s)

```bash
# Production build for one deploy unit
pnpm build --apps adaccounts

# Output: apps/adaccounts/dist
```

Environment setup before build:

```bash
export DASHBOARD_URL=https://dashboard.smit.team
export BASE_PATH=/
```

Turbo build task environment (`turbo.json`):
- `NODE_ENV` — production for minified builds
- `DASHBOARD_URL` — dashboard domain for redirects
- API gateway domain — resolved at runtime from the current hostname suffix (`gateway.smit.team` / `gateway.smit.vn`)
- `BASE_PATH` — path prefix if serving under subdirectory (default `/`)
- `ADACCOUNTS_REMOTE_URL` — optional remote URL override
- `ADS_MANAGER_REMOTE_URL` — optional remote URL override

Build output structure:

```
apps/shell/dist/
├── index.html
├── *.js
└── mf-manifest.json

apps/adaccounts/dist/
├── index.html
├── *.js
├── mf-manifest.json
└── remoteEntry.js

apps/ads-manager/dist/
├── index.html
├── *.js
├── mf-manifest.json
└── remoteEntry.js
```

### 5. Verify Built Dist

```bash
pnpm verify:dist shell
pnpm verify:dist adaccounts
pnpm verify:dist ads-manager
```

### 6. Publish

Publish, commit, or push `../client-adscheck-deployment`. Do not add
generated dist files to the source repo.

---

## Rolling Back

If a deployed version has a critical bug, use per-app rollback (never force-push main backwards):

```bash
# Find the last-good ref for an app (check git log or use a deploy tag)
git log --oneline -- apps/adaccounts/

# Roll back ONE app by restoring it to a known-good state
git restore --source=adaccounts-deploy-2026.06.04 -- apps/adaccounts/

# Verify the bad commit didn't also change shared packages
git show <bad-sha> --stat | grep packages/   # empty = safe to revert

# Commit and push the rollback (forward commit, not force-push)
git add apps/adaccounts/ && git commit -m "revert(adaccounts): roll back to last-good"
git push

# Rebuild only that app and redeploy
pnpm --filter @mf2/adaccounts build
# Then publish or commit/push apps/adaccounts/dist
```

**Key:** Per-path restore leaves other apps untouched. Never `git checkout <tag>` the whole repo — that reverts every app. See [micro-frontend-governance.md](micro-frontend-governance.md) Layer 5.

---

## Monitoring & Health Checks

### Synthetic Checks (Same-Origin Deployment)

```bash
#!/bin/bash
# health-check.sh — verify same-origin deployed dist

# 1. Shell loads
curl -s -o /dev/null -w "%{http_code}" https://client.smit.team/index.html
# Expected: 200

# 2. Manifest resolves
curl -s https://client.smit.team/mf-manifest.json | jq .
# Expected: valid JSON with BASE_PATH-relative remote URLs

# 3. Remote loads (same origin, relative path)
curl -s -o /dev/null -w "%{http_code}" https://client.smit.team/adaccounts/remoteEntry.js
# Expected: 200

# 4. API Gateway reachable
curl -s -o /dev/null -w "%{http_code}" https://gateway.smit.team/public/health
# Expected: 200
```

### Metrics to Monitor

| Metric | Target | Alert If |
|--------|--------|----------|
| Shell TTFB | < 500ms | > 2s |
| Remote load time | < 1s | > 3s |
| 5xx errors (shell) | 0 | > 0.1% |
| 5xx errors (remotes) | 0 | > 0.1% |
| CDN hit ratio | > 95% | < 80% |
| Auth success rate | > 99% | < 98% |

### Logging

**Shell errors → CloudWatch Logs:**

```javascript
// Browser-side error capture (if implemented Phase 2)
window.addEventListener('error', (e) => {
  sendToCloudWatch({
    timestamp: new Date(),
    error: e.message,
    stack: e.error?.stack,
    url: window.location.href,
  });
});
```

**API errors → Gateway logs:**

```typescript
// api-client.ts
api_get('/...').catch((error) => {
  console.error(`[API] ${error.status}: ${error.data.message}`);
  // Send to logging service
});
```

---

## Performance Optimization

### CDN Cache Configuration

| File | Cache Control | TTL | Reason |
|------|---|---|---|
| `index.html` | public, max-age=3600 | 1 hour | Check for updates (includes version tag) |
| `*.js` (main, vendors, runtime) | public, max-age=31536000, immutable | 1 year | Content hash in filename, never changes |
| `mf-manifest.json` | public, max-age=300 | 5 min | Routes remotes, update frequently |
| `*.json` (other) | public, max-age=3600 | 1 hour | Config, moderate refresh |

### Preconnect Headers

**Shell index.html:**

```html
<head>
  <!-- Preconnect to API Gateway (only external dependency) -->
  <link rel="preconnect" href="https://gateway.smit.team" crossorigin />
</head>
```

**Result:** Browser resolves DNS + TLS to gateway in parallel with shell loading (saves ~100–200ms).
Remotes are same-origin (no preconnect needed); browser resolves them via the already-open connection.

### Critical Path Optimization

```
Timeline:
0ms     ├─ index.html arrives
50ms    ├─ runtime.js + vendors.js start loading (preload in index.html)
150ms   ├─ main.js loads + Vue app initializes
200ms   ├─ Router matches route
250ms   ├─ auth.hydrateUser() calls /public/authentication
300ms   ├─ Response stored in shared auth state
350ms   ├─ Router resolves /adscheck-pro/adaccounts
450ms   ├─ RemoteHost: router guard loads adaccounts/routes + remoteEntry.js
500ms   ├─ remoteEntry.js loaded
550ms   ├─ Adaccounts page mounts (into RemoteHost router-view)
600ms   ├─ First render visible
650ms   └─ Remote data fetch starts

Total: ~650ms to interactive
```

**Techniques:**
- Preconnect links (DNS + TLS early)
- Async script loading (no render-blocking)
- Lazy-remote loading (don't wait for remoteEntry.js)

---

## Troubleshooting Deployment

| Issue | Debug | Fix |
|-------|-------|-----|
| **Manifest 404** | Check the selected app's `dist/` was published at the expected path | Rebuild and republish that app's `dist/` |
| **Remote 404 (user sees gray box)** | Check remote `dist/` is published at the path shell expects | Verify `pnpm verify:dist <remote>` and republish that remote |
| **Auth fails with CORS error** | Check browser console, Network tab CORS headers | Verify gateway.smit.team CORS policy includes shell origin |
| **Bundle too large (>300KB)** | `rspack build --analyze` or `npm run analyze` | Identify large deps, tree-shake unused code |
| **Slow TTFB (shell loads slowly)** | Network timing, check preconnect headers injected | Verify `BASE_PATH` is correct in build env |
| **Mixed content warning (HTTPS shell + HTTP remote)** | Browser console warning, Network tab | Ensure prod build uses relative paths (not http://localhost) |


---

## Version Management

### Semantic Versioning

```
v{MAJOR}.{MINOR}.{PATCH}

v1.0.0 — Initial release
v1.1.0 — New feature (asset sync, Phase 2)
v1.1.1 — Bug fix
v2.0.0 — Breaking change (API contract change)
```

### Git Tagging

```bash
# After successful deploy
git tag v1.0.0 -m "Phase 1 base platform release"
git push origin v1.0.0

# For rollback reference
git tag v1.0.0-deployed -m "Deployed to production 2026-06-04"
```

### Per-App Deploy Tags (rollback anchors)

Apps deploy independently — a broken `adaccounts` must not block deploying `ads-manager` or `shell`.
Tag each successful production deploy PER APP so a per-path rollback (see Rolling Back) has a
known-good anchor instead of guessing a SHA:

```bash
# build one app only (Turbo: changed + its deps)
pnpm --filter @mf2/adaccounts build      # or: pnpm turbo run build --filter=@mf2/adaccounts

# after that app's deploy succeeds
git tag adaccounts-deploy-$(date +%Y.%m.%d) -m "adaccounts deployed to production"
git push --tags
```

### Remote Versioning (Same-Origin)

Each remote deploys independently by publishing its own `dist/` directory:

```
apps/adaccounts/dist      -> hosted at /adaccounts/ or at ADACCOUNTS_REMOTE_URL
apps/ads-manager/dist     -> hosted at /ads-manager/ or at ADS_MANAGER_REMOTE_URL

Shell's mf-manifest.json references remotes as BASE_PATH-relative paths by default
(e.g. /adaccounts/remoteEntry.js, /ads-manager/remoteEntry.js), or absolute `*_REMOTE_URL`
overrides when a remote is hosted on a separate origin/path.
```

---

## Post-Deployment Verification

### Checklist

- [ ] Shell loads (https://client.smit.team)
- [ ] Auth flow works (redirects to login if not authenticated)
- [ ] Adaccounts remote loads (navigate to /adscheck-pro/adaccounts)
- [ ] `/` and `/home` redirect correctly; `/app/anything` redirects to `/home`
- [ ] Icons display (inspect SpriteProvider)
- [ ] Console clean (no errors, no console.log)
- [ ] Bundle size within budget (check Network tab)
- [ ] TTFB < 500ms (DevTools Lighthouse)

### Smoke Test Script

```bash
#!/bin/bash
# smoke-test.sh — Run after deploy

echo "1. Testing shell load..."
curl -s -o /dev/null -w "Status: %{http_code}\n" https://client.smit.team/index.html

echo "2. Testing manifest..."
curl -s https://client.smit.team/mf-manifest.json | jq . || echo "ERROR: Manifest invalid JSON"

echo "3. Testing adaccounts remote (same-origin)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" https://client.smit.team/adaccounts/remoteEntry.js

echo "4. Testing API gateway..."
curl -s -o /dev/null -w "Status: %{http_code}\n" https://gateway.smit.team/public/authentication

echo "All checks complete."
```

---

## Maintenance & Updates

### Monthly Tasks

- [ ] Check for security updates in dependencies
- [ ] Review error logs (if integrated)
- [ ] Test rollback procedure (practice — use `git restore` per app)

### Quarterly Tasks

- [ ] Major dependency upgrades (Vue, Rspack, TypeScript)
- [ ] Bundle size analysis + optimization
- [ ] Performance profiling (Lighthouse, WebPageTest)

---

**Document Version:** 1.1  
**Last Updated:** 2026-06-05  
**Audience:** DevOps, SRE, deployment engineers  
**Next Review:** 2026-07-05
