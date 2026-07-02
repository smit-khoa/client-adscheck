# Documentation Update — MFE Prototype Refactor

**Scope:** Reflect prototype routing, remote rename (home→adaccounts, ads_asset→ads-manager), auth bypass, role gating disable, adaccounts basic mode feature.

## Files Updated

### Feature Docs (`.claude/features/`)
1. **README.md** — Updated feature index table:
   - Route `/business/:bid/...` → `/app/...`
   - Role gating status: disabled (prototype bypass)
   - Added row for adaccounts-basic-mode feature
   
2. **auth-flow.md** — Updated to note:
   - Route changes (AuthLayout now routes to `/app`, not `/business/:bid/...`)
   - Prototype note: AuthLayout mounted but auth flow deferred for CORS gateway restrictions
   
3. **role-feature-gating.md** — Updated to note:
   - Status: disabled (prototype bypass)
   - Routes now `/app/<remote>`, no role/feature props
   - Code logic still exists for future enablement
   - RemoteHost no longer gates in prototype
   
4. **remote-loading-recovery.md** — Updated routes:
   - `/business/:bid/<remote>` → `/app/<remote>` (adaccounts, ads-manager)
   
5. **adaccounts-basic-mode.md** (NEW) — Feature doc for Quản lý TKQC:
   - slug: adaccounts-basic-mode
   - remote: adaccounts, route: /app/adaccounts
   - status: done
   - Lists 16 real file paths verified to exist in codebase
   - Documents: basic/advanced mode toggle (runtime), table + panel layout, mock data, demo toast action
   - Gotchas: selection state module-scoped (intentional), mode runtime-only (resets on reload)

### System Docs (`./docs/`)
1. **system-architecture.md** — Updated:
   - High-level diagram: home→adaccounts, ads_asset→ads-manager
   - MF config: remotes keys adaccounts/ads_manager
   - Manifest resolution: localhost:3010/3002 → adaccounts/ads_manager
   - Auth section split into "Prototype routing" + "When auth enabled"
   - Authorization checks section: notes code exists, not used in prototype routes
   
2. **project-overview-pdr.md** — Updated:
   - Scope: "Prototype" not "Phase 1"; what's in/out clarified
   - FR2/FR3 status: Code ready, disabled for prototype
   - Technical constraints: remote ports adaccounts:3010, ads-manager:3002
   - Architecture notes: /app/<remote> routing, adaccounts with mode toggling
   
3. **codebase-summary.md** — Updated:
   - Overview: 3 apps (adaccounts replaces home, ads-manager replaces ads_asset)
   - Shell router: /app/adaccounts, /app/ads-manager
   - Shell components: AuthLayout/BusinessLayout marked orphan (not in prototype path), AppLayout new
   - ArcSidebar: 2-item nav in Vietnamese (Quản lý TKQC, Quản lý quảng cáo)
   - dev-proxy-config: adaccounts:3010, ads-manager:3002
   - Remotes section: full replacement with adaccounts (detailed 16 files + lines) + ads-manager (placeholder)

4. **README.md** (root) — Updated:
   - Status: Prototype complete
   - Architecture diagram: remotes renamed
   - MF2 Contract: route structure /app/<remote>, prototype routing note
   - Quick Start: Starts adaccounts@3010, ads-manager@3002
   - Dev commands: dev:adaccounts, dev:ads-manager
   - Folder structure: apps/adaccounts (detailed), apps/ads-manager (placeholder)
   - Routing section (NEW): explains simplified routing, prototype vs future auth
   - Role gating section: updated notes, code exists but disabled
   - Deployment: env vars ADACCOUNTS_REMOTE_URL, ADS_MANAGER_REMOTE_URL
   - Bundle: remote apps adaccounts/ads-manager

## Verification
- All file paths verified via `find` + `ls` before documenting
- MF remote names (adaccounts, ads_manager) match rspack config naming
- Real Vue/TS file counts match actual structure (adaccounts 16 files, ads-manager placeholder)
- Routes verified in router/index.ts (no /business/:bid, only /app/<remote>)
- Auth components (AuthLayout, BusinessLayout, header dropdowns) confirmed orphan (not imported in AppLayout)
- Shell sidebar confirmed 2-item nav only (no role/feature lock UI)
- RemoteHost.vue confirmed: no role/feature props processing in prototype code

## Notes
- **Sacrifice grammar for concision:** Kept sections tight, focused on changes
- **Evidence-based:** Only documented existing files, verified paths
- **Backward compat:** Orphaned files (AuthLayout, BusinessLayout) kept in codebase for future auth enablement, noted as such
- **Feature doc discipline:** adaccounts-basic-mode.md follows _TEMPLATE.md structure exactly

## Unresolved Questions
None — all routing, remote names, auth bypass, feature gating disable status verified against actual code/config.
