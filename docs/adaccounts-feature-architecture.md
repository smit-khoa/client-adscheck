# AdAccounts — Feature-First Tab Workspace Architecture

How the `adaccounts` remote is structured internally. Read before adding any new ad-account capability so future code follows the tab/domain boundary instead of re-growing the old `basic/advanced` mode shape.

## Purpose

`adaccounts` is one Module Federation remote for the **whole ad-account business domain**. The route `/adscheck-pro/adaccounts` renders a remote-owned workspace with four tabs:

```text
adaccounts route
  -> workspace
      -> tkqc
      -> bm
      -> page
      -> pixel
```

The shell hosts and gates the remote; business tabs live inside the remote.

## Remote boundary

- The remote stays **domain-sized**. Tool actions like rename, share users, BM management, and Page actions are modules inside `adaccounts`, not separate remotes.
- The MF contract is unchanged: the remote exposes `./App` (standalone entry) and `./routes` (`RouteRecordRaw[]`). See `apps/adaccounts/src/router/index.ts`.
- The old adaccounts-local `basic/advanced` route mode was removed. If a project-wide mode switch is added later, it must not recreate a local `apps/adaccounts/src/stores/mode-store.ts` owner.

## Current feature-first structure

```text
apps/adaccounts/src/
  pages/AdAccountsPage.vue        # route view; renders workspace + one Toaster
  features/
    workspace/                    # tab frame, tab state, function panel slots
    adaccounts/                   # Adaccounts/TKQC table, selection, and tools
    businesses/                   # BM/business table, data loading, selection, and tools
    page/                         # Page table/loading, selection, and tools
    pixel/                        # truthful empty Pixel placeholders
  api/                            # FB-over-extension layer and tool runners
    smit-connect.ts
    fb-session.ts                 # probes live FB session; returns logged_in/not_logged_in/switched
    fb-token.ts                   # token_b (power-editor); persists to extension storage; dedupes inflight
    fb-token-auto.ts              # token_i from AdsCanvasComposerDialog bootloader endpoint
    fb-token-graphql.ts           # token_graphql from ReactComposerStatusEagerAttachment endpoint
    fb-token-policy.ts            # routes token resolution by purpose
    fb-bm-token.ts
    fb-token-cache.ts             # token slots + session metadata in extension storage, 6h TTL
    fb-graph.ts
    fb.ts
    run-batch.ts
    tools/
      bm/**
```

`features/adaccounts`, `features/businesses`, `features/page`, and `features/pixel` are the workspace-facing surfaces. Adaccounts/TKQC, BM/businesses, and Page implementations are consolidated into their domain folders.

## Dependency rules

Allowed high-level flow:

```text
pages/AdAccountsPage.vue -> features/workspace, shared-ui Toaster
features/workspace      -> features/adaccounts, features/businesses, features/page, features/pixel
features/adaccounts     -> local table/list/selection/tools under the domain folder
features/businesses     -> local BM data loading/selection/actions/tools under the domain folder
features/page           -> local Page loading/selection/tools under the domain folder
features/pixel          -> no APIs/state beyond placeholder UI
features/* data/tools   -> src/api (fb-graph, smit-connect, token helpers, runners)
src/api                 -> no UI imports; pure logic + extension proxy
```

Forbidden:

```text
any component/page      -> direct fetch / api_get / backend client for FB calls
any app feature         -> a breaking packages/shared-* API change
features/pixel          -> fake data, speculative API wrappers, or fake counts
apps/adaccounts         -> imports from apps/shell
```

## Workspace toolbar pattern

`AdAccountsWorkspace.vue` owns the top workspace toolbar. It:
- Renders TKQC/BM/Page load-config triggers as icon-only shared-ui `Button` + `Tooltip` (shown for the active tab).
- Provides a fixed Teleport target `<div id="adaccounts-workspace-table-toolbar" />`.
- Active table components pass `toolbarTarget="#adaccounts-workspace-table-toolbar"` to shared-ui `Table`; the Table Teleports its toolbar buttons (refresh etc.) into that target so they appear next to the load-config button in the top bar.

## Selection model

Selection remains a standalone capability per domain:

- Adaccounts/TKQC selection: `features/adaccounts/stores/account-selection-store.ts`, consumed inside `features/adaccounts`.
- BM selection: `features/businesses/stores/bm-selection-store.ts`, consumed inside `features/businesses/tools`.
- Page selection: `features/page/stores/page-selection-store.ts`, consumed inside `features/page`.

Selection stores hold ids only. Tab function panels resolve ids against their domain rows before running actions. This keeps selection decoupled from row data and avoids cross-feature data ownership.

## Tool actions model

- Adaccounts/TKQC tools use `features/adaccounts/tools` plus runners in `src/api/tools/**`.
  - Function panel 1 is the catalog: grouped/searchable tool list (`Super Share`, `Kháng TKQC`, `Đổi Info`, `Xoá QTV ẩn`) that appends or focuses tools in an ordered workflow-step list.
  - Function panel 2 is the detail runner: selected steps, expandable schema-driven forms, Luồng/Delay inputs, reorder/remove controls, and multi-step run button.
- Generic schema form pieces live in app-local `src/components/tool-actions`, `src/composables/tool-actions`, and `src/types/tool-action.types.ts` because TKQC and Page share the same form/state shape. `createToolActions()` creates one isolated tool-action instance per panel/catalog so selected steps, enabled tools, ordering, and per-tool form values do not collide across TKQC/Page.
- BM tools use `features/businesses/tools` plus runners in `src/api/tools/bm/**`. BM keeps a BM-local action state (`use-bm-actions`) because BM tool metadata and runner behavior differ from TKQC/Page, but the UI follows the same two-panel workflow-step pattern. BM tools have a `kind` field (`'run' | 'viewer' | 'appeal'`): `run` tools dispatch through `useBmRunner` registry; `viewer` tools open `BmManagerDialog` (interactive read-then-act list); `appeal` tools open `BmAppealLinkDialog` (read-only output). Both dialog paths bypass the runner registry without warning.
- Page tools currently render prototype UI only and warn that tools are not wired to API yet. Page still uses the two-panel catalog/detail pattern so runner wiring can be added without changing workspace layout.
- Pixel tools are intentionally empty placeholders.

The generic `ToolFunctionForm` and tool-action state pieces are shared inside the `adaccounts` remote by using per-panel tool-action instances. TKQC and BM use `selectedFunctionIds`/`selectedFunctions` for the two-panel workflow-step model; Page uses the same selection model while remaining UI-only. Luồng/Delay settings are shared between TKQC and Page via `adaccounts.tool-runner-settings.v1`.

## Facebook session and token policy

`fb-session.ts` exposes `checkFacebookSession()`, which probes the live Facebook Banzai endpoint through the extension before data hydration. It returns:

- `logged_in` — current FB user confirmed.
- `not_logged_in` — extension/session unavailable; token/cache state is reset and feature rows are cleared.
- `switched` — a different FB user is active; token/cache state is reset before the feature reloads.

`fb-token-policy.ts` centralizes token selection by purpose:

| Purpose | Slot | Use |
|---------|------|-----|
| `readGraph` | `token_i` with bounded fallback, or `token_b` by default | Graph reads and batch reads |
| `powerEditorAction` | `token_b` | Power-editor actions |
| `businessManagerAction` | `token_g` | BM-scoped actions |
| `legacyGraphql` | `token_graphql` | Legacy internal GraphQL doc_ids |
| `sessionGraphql` | `session` (`fb_dtsg`/`lsd`) | Session-signed GraphQL |

`fb-token-cache.ts` stores one `adscheck_data` bundle in extension storage with session metadata and token slots (`token_b`, `token_g`, `token_i`, `token_graphql`). Each slot has a 6-hour TTL. `fb-graph` resets only the slot that failed via `resetTokenForSlot`.

## Business Manager data loading

BM data loading is shown in the BM workspace tab:

1. `use-bm-data-loader` calls `checkFacebookSession` before `ensureLoaded`/`load`; it clears rows and the session patch cache on `not_logged_in` or `switched`.
2. Base BM rows load first; enabled advanced groups call feature API wrappers only when their toggles are on.
3. Patches merge by `bmId`; per-group loading/errors stay on the row.
4. Extension-storage cache persists rows + activeConfig for **30 minutes** as `{user_id, saved_at, data: {rows, activeConfig}}` (keys `v8_bm_rows_cached`, `v8_bm_active_config_cached`, `v8_last_bm_rows_cached`). Reads reject cache from another FB user. Legacy raw-array cache is trusted only when the current FB user cannot be resolved.
5. Advanced group patch cache uses session keys `bm:{bmId}:{group}` (not persisted).
6. BM table always renders (no empty-card gate). BM table selection feeds the BM action panel.
7. Optional legacy groups `legacyType` and `legacyQuality` call `fetch-bm-legacy.ts` via legacy internal GraphQL doc_ids.

BM runners stay under `src/api/tools/bm/**`. `fb-bm-token.ts` and `fb-token-cache.ts` are tool infra, not UI feature code.

## Page data loading

1. `use-page-manager` calls `checkFacebookSession` before `ensureLoaded`/`load`; it clears rows on `not_logged_in` or `switched`.
2. Extension-storage cache persists rows + config + progress for **30 minutes** as `{user_id, saved_at, data: {rows, config, progress}}` (keys `v8_page_rows_cached`, `v8_page_config_cached`, `v8_page_progress_cached`, `v8_last_page_rows_cached`). Reads reject cache from another FB user; legacy raw-array cache is trusted only when the current FB user cannot be resolved.
3. Page tools are UI-only until real runners are wired.

## API layer rule

Components and pages never call `fetch` directly for FB work. Facebook calls go through the SMIT Connect browser extension (`smit-connect.extFetch`, cmd `fetch`) so cookies are borrowed and CORS is bypassed. `fb-session` probes the live session, `fb-token-policy` selects the token family, `fb-token` / `fb-token-auto` / `fb-token-graphql` / `fb-bm-token` fetch token slots, `fb-token-cache` persists slots and session metadata, `fb-graph` wraps Graph REST + internal GraphQL, and `api/tools/**` contains pure runners.

## Shared promotion rule

Adaccount-specific types and components stay **local** to the remote. Promote a type to `@mf2/shared-types` or a component to `@mf2/shared-ui` only when **≥2 remotes** need it. Any `packages/shared-*` change must be additive and in a separate PR/commit.

## Naming conventions

- Files: kebab-case (`use-account-list.ts`, `account-selection-store.ts`); Vue components PascalCase filenames (`AdAccountTable.vue`).
- Composables `use-*`; Pinia stores `*-store.ts`; feature type files `<feature>.types.ts`.
- Comments explain the WHY (invariant/trade-off); never reference plan/phase numbers.

## Verification expectations

After changing this remote:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
pnpm verify:all
```

Manual smoke:

- `/adscheck-pro/adaccounts` renders from shell.
- Tabs show TKQC/BM/Page/Pixel.
- Function panel 1 changes with active tab.
- TKQC table/tools still work as before.
- BM table always renders (no empty-card); BM load-config triggers in workspace toolbar; 30-minute cache hydrates on mount.
- Page table renders; Page load-config triggers in workspace toolbar; 30-minute cache hydrates on mount.
- Pixel tab shows a truthful empty state and does not call APIs.
