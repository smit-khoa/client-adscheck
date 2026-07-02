# FB Tools API Wiring & Real Account List Integration

---
date: 2026-06-16
type: implementation-journal
feature: adaccounts tool-actions, account-list, basic-mode FB integration
---

## Context

Converted adaccounts remote from mock-data UI prototype to real Facebook integration. Analyzed 2 reference FB-automation tools, redesigned tool panel UI (drag-reorderable list + inline config), built FB-over-extension API layer, wired real account list from Graph API, and integrated renaming logic with sequential/random numbering. Session touched plan `260615-1319-fb-tools-api-wiring-2-tools/` and produced 3 lesson docs (shadows of key footguns).

## What Changed

**Tool Panel UI (tool-actions)**
- Replaced ToolGroupGrid + ToolFunctionGrid with ToolList.vue (drag-reorderable vuedraggable).
- Tool click expands inline ToolFunctionForm (schema-driven config) instead of tab swap.
- New ToolRunnerHeader.vue: shared "Bắt Đầu" button + Luồng/Delay runner settings.
- New composable: use-tool-runner-settings.ts (persists order + batch settings to localStorage).
- Deleted: ToolGroupGrid.vue, ToolFunctionGrid.vue.
- Conditional schema fields (showWhen) added to ToolFieldSchema to hide/show based on user selections (e.g., hide "Số bắt đầu" if not sequential).

**FB API Layer (apps/adaccounts/src/api/)**
- smit-connect.ts: extension proxy (chrome.runtime.sendMessage, cmd:'fetch').
- fb-token.ts: scrape access_token/fb_dtsg/lsd/user_id from Ads Manager page (in-memory cache, 1 token per session).
- fb-graph.ts: typed graph() + graphql() fns; strips `for(;;);`, retries once on 401 + resetToken.
- run-batch.ts: bounded concurrency (Luồng param) + inter-request delay (Delay param), worker receives (account, index).
- tools/rename-account.ts: random or sequential numbering (space-separated suffix); optional patch return.
- tools/open-close-account.ts: doc_id-based ops (open=9984888131552276, close=9895135750555877).
- tools/index.ts: TOOL_RUNNERS registry + describeTools() catalog-export.

**Account List (account-list)**
- Replaced mock-ad-accounts.ts with real list-adaccounts.ts (GET /me/adaccounts paginated).
- use-account-list: fetches + caches to localStorage + applyPatches on tool success.
- AdAccount.status: changed from string union to FB numeric account_status; dropped budget column; added currency.

**Toast System**
- Switched from hand-written DemoActionToast to vue-sonner (Toaster + toast fns from @mf2/shared-ui).
- FB errors surfaced as aggregated toast (prefers error_user_msg from graph error response).

**Rename Tool Numbering**
- Numbering now appends space-separated: random = large random int, sequential = startNum + batch index.
- ToolFieldSchema.showWhen hides "Số bắt đầu" unless numbering=sequential.

**Updated Docs & Features**
- docs/codebase-summary.md, docs/adaccounts-feature-architecture.md, docs/system-architecture.md (FB-over-extension + vue-sonner singleton).
- docs/project-overview-pdr.md, docs/project-roadmap.md.
- .claude/features/: adaccounts-tool-actions.md, adaccounts-account-list.md, adaccounts-basic-mode.md.

## Decisions

- All FB calls route through extension (never direct graph.facebook.com) — borrows session cookies, sidesteps CORS.
- FB token is per-user (not per-account); scraped once, cached in-memory.
- account-selection store stays id-only; BasicModeView resolves selectedIds ∩ account-list at render time (decouples selection from data state).
- Tool runners return optional `patch` (fields changed); UI updates locally + cache without re-fetch.
- vuedraggable requires v-model (computed get/set), not one-way :model-value.
- vue-sonner needs MF singleton: added to shared config in shell + adaccounts + ads-manager rspack.config.ts (+ added vue-sonner to their package.json). rspack.config changes require dev-server restart (not hot-reloaded).

## Verification

- typecheck: `pnpm --filter @mf2/adaccounts typecheck` ✓
- production build: `pnpm --filter @mf2/adaccounts build` ✓
- `pnpm verify:all` (catalog-coverage + feature-docs + pr-split) ✓
- Code-reviewer subagent caught 3 bugs (all fixed): graphql errors in `errors[]` array; open-account no-marker path wrongly returned ok:true (now FAILURE); resetToken() dead code (now called on auth 401).
- Manual user test: real FB calls work end-to-end (hit real FB permission error 100/1487828 — proves path works).

## Known Gaps

- open-account doc_id and success-marker strings unverified against live FB response; came from docs/brainstorm.
- Sequential rename uses startNum+index, not collision-avoiding "find next free" like reference tool.
- Real FB runtime requires SMIT Connect extension + logged-in session; typecheck/build cannot simulate. User tested manually + confirmed working.
- Nothing committed this session yet.

## Footguns Hit (3 Lessons Written)

1. **shadcn form components colourless standalone** (`.claude/lessons/shadcn-form-components-reuse-and-theme-tokens.md`): ToolFunctionForm renders shadcn Select/Input colourless until host provides theme tokens. Fix: added shadcn token block to apps/adaccounts/src/styles.css (mirrors shell).

2. **vuedraggable not reordering** (implicit, fixed inline): one-way :model-value snaps back; must use v-model (computed get/set).

3. **vue-sonner toasts invisible in shell (:8301) but visible standalone (:3010)** (`.claude/lessons/vue-sonner-toast-needs-mf-singleton.md`): vue-sonner keeps toast queue in module state (not MF singleton) — each app bundled its own Toaster/toast instance. Toast calls added to queue #1 (adaccounts), Toaster rendered from queue #2 (shell). Fix: declared `vue-sonner: { singleton: true }` in MF shared config + added vue-sonner to all 3 apps' package.json. Root cause identical to existing `shared-ui-subpath-injection-key` lesson — module state does not cross MF boundary without singleton flag.

## Next Steps

- Commit this session's changes (adaccounts files + rspack.config.ts + package.json).
- Verify collision-avoiding sequential rename if real requirement emerges.
- Manual test more FB error paths (quota, permission, rate-limit) when user has time.
