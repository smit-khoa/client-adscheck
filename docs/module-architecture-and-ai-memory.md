# Module Architecture & AI Memory — Design

Status: approved (brainstorm 2026-06-04). Authoritative for remote internal structure, state/type boundaries, remote routing contract, and the `.claude/features/` memory layer.

Goal: senior-grade, explicit module separation so an AI assistant can locate, fix, and propose changes from a feature name / bug report alone — backed by a disciplined feature-doc memory layer that maps each feature to its concrete files.

Decisions are FIXED (do not relitigate): layer-based remote internals + disciplined feature docs + remotes expose `./routes` + shell refactored as the reference template.

---

## 1. Principles

- **Code explicitness carries ~90% of AI navigability; memory carries ~10%.** Organize code first, layer memory second. Memory must never contradict code.
- **Anti-drift:** memory stores only what code cannot express (purpose, flow, decisions). Anything derivable from code (types, route maps) is NOT hand-copied. Drift already bit this repo once (README claimed a 500ms timeout that does not exist) — treat drift as the primary failure mode.
- YAGNI / KISS / DRY. No feature doc for code that does not exist yet.

---

## 2. Remote internal structure (layer-based, identical across every remote)

Every `apps/<remote>/src/` follows ONE layout. Same shape everywhere → AI learns it once.

```
apps/<remote>/src/
├── api/          # Typed API fns wrapping shared api-client. 1 file per domain. Components NEVER call api_get directly.
├── components/   # Reusable UI within this remote
├── composables/  # use-* reusable logic
├── pages/        # Route-level views (1 page = 1 screen)
├── stores/       # Remote-local Pinia stores (NOT auth/layout — those are shared)
├── router/       # This remote's child RouteRecordRaw[] (see §4)
├── types/        # Remote-local types (promote to shared-types only when >=2 apps need)
├── App.vue       # MF-exposed entry
├── bootstrap.ts
└── main.ts
```

### Three senior boundaries (enforced)

1. **API layer is mandatory indirection.** Pages/components call `src/api/<domain>.ts`, never `api_get`/`fetch` inline. Payoff: "change endpoint X" = open `api/`, nothing else. This is also where centralized 401 handling and request timeout live (see §6).
2. **Two-tier state — never mixed.** Cross-cutting state (`auth`, `layout`) lives in `packages/shared-store`. Business state lives in `apps/<remote>/src/stores`. Rule: used by exactly one remote → keep it in the remote. Prevents shared-store becoming a God store.
3. **Two-tier types.** Local types in the remote; promote to `shared-types` only when ≥2 apps consume them (additive rule from CLAUDE.md).

> Layer-based trade-off acknowledged: a feature is spread across `api/ + components/ + pages/ + stores/`. The feature doc (§5) is the map that re-assembles the pieces. Therefore feature docs MUST list real file paths — this is the load-bearing requirement that makes layer-based navigable.

---

## 3. Shell as reference template (refactor in this effort)

Shell is refactored to the §2 layout so it is the canonical example remotes copy. Scope:

- Extract `src/api/` — move all `api_get/api_post` calls out of `shared-store/auth-store.ts` consumers into typed API fns. (auth-store itself stays in shared-store as cross-cutting state, but its raw fetch calls route through the api layer pattern.)
- Bug fixes folded in (from prior code review, all verified by reading source):
  - **Centralized 401 + network-error handling** in api layer; startup auth can suppress the global 401 redirect when representing unauthenticated state.
  - **Removed deferred auth business/role flow**: `setCurrentBusiness`, role fetch, onboarding fetch, and `initialize_promise` are no longer part of `auth-store`; current auth is startup `hydrateUser()` only.
- Fix doc drift: remove the false "500ms timeout" claim and the "315KB meets 300KB budget" claim from README.

---

## 4. Remote routing contract (MF contract change — approved)

Problem today: shell uses hardcoded route segments but there is NO convention for how a remote declares its child routes. Breaks first when a remote gains real screens.

Contract:

- Each remote exposes **`./routes`** (a `RouteRecordRaw[]`) alongside `./App`.
- Shell dynamically imports `<remote>/routes` and `router.addRoute('<remote-parent>', ...)` under `business/:bid/<remote>`.
- Child routes are real vue-router routes on the host → deep-link, browser back/forward, and breadcrumbs all work at the shell level.
- Each remote's `src/router/` is the single source of its route map. Feature docs reference route paths but do NOT re-list the route table (derivable).

MF exposes per remote: `{ './App': ..., './routes': './src/router/index.ts' }`.

---

## 5. AI memory layer — `.claude/features/`

Now active. The directory exists with docs for all current features.

```
.claude/features/
├── README.md      # Index table: feature | remote | route | roles | status | doc link
├── _TEMPLATE.md   # Mandatory shape
├── auth-flow.md             # startup user hydrate in shell
├── role-feature-gating.md   # retired historical note
└── remote-loading-recovery.md  # real logic exists → write first
```

The directory has grown beyond this initial set; see `.claude/features/README.md` for the current index.

### Feature doc template (the thing that makes AI navigable)

```markdown
---
slug: ads-account-list
remote: adaccounts
route: /adscheck-pro/adaccounts
roles: [VIEW_ADACCOUNT]
feature_flag: asset-manager
status: planned | in-progress | done
---
## Purpose
One sentence.
## Flow
Step 1 -> 2 -> 3 (user action -> API -> state -> UI).
## Files (MANDATORY — real paths)
- apps/ads-manager/src/pages/AdsAccountList.vue
- apps/ads-manager/src/api/ads-account.ts
- apps/ads-manager/src/stores/ads-account-store.ts
## APIs used
- GET /gate/:bid/ad-accounts -> AdAccount[]
## Related
[[role-feature-gating]] [[auth-flow]]
## Decisions / Gotchas
Explain WHY (invariant/race/trade-off). Never reference plan/phase numbers.
```

### Anti-drift rules (non-negotiable)

- Updating the matching feature doc is **part of any code task that changes logic/files/routes/APIs**, not optional (CLAUDE.md already mandates this; we execute it).
- Feature docs store only non-derivable knowledge. Types live in `*/types` or `shared-types`; route tables live in `*/router`.
- No empty/speculative docs. Only the 3 real features get docs now; the rest grow with real code.

### End-to-end usage (the target workflow)

User: "feature X is broken" → AI reads `.claude/features/README.md` → matches feature → opens its doc → gets file list + route + APIs + flow + related features → goes straight to the right files, aware of blast radius. No hand-holding from the user.

---

## 6. API layer shape (where 401/timeout get fixed)

`apps/<remote>/src/api/<domain>.ts` and shell's `src/api/`:

- Wrap shared `api()` — add a per-call `AbortController` timeout (single source, configurable).
- Centralize 401: a 401 from the gateway triggers the existing `auth.logout()` redirect once, not scattered per call.
- Distinguish network error vs HTTP error vs auth error so callers (and `checkAuth`) react correctly.

This stays in the api layer only; `shared-store/api-client.ts` low-level `api()` keeps its current minimal shape (no breaking change to its signature — additive).

---

## 7. Trade-offs (honest)

| Pro | Cost |
|-----|------|
| Identical remote layout → AI learns once | Must refactor shell to the standard layout |
| Feature doc map offsets layer-based spread | Survival depends on update discipline; skip 2-3 times → system rots |
| Central API layer → fixes 401/timeout/race | One extra indirection layer |
| `./routes` exposed → remotes own their routing | MF contract change; shell router becomes dynamic addRoute |

Over-engineering guardrail: do NOT pre-create feature docs; do NOT add knowledge-graph/RAG (rejected for this repo size); do NOT promote types to shared until a 2nd consumer appears.

---

## 8. Open questions

- Auth `config` (Facebook OAuth `app_id`/`config_id`) — which remote owns the FB.init flow? Affects whether it is shared or remote-local. Decide when that feature is built.
- Per-call timeout default value (ms) — pick a concrete number during implementation, not a placeholder.
