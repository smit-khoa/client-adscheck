---
title: "Port AdAccounts prototype into remote-owned tab workspace"
status: pending
created: 260623-1857
source: plans/reports/brainstorm-260623-1857-adaccounts-prototype-merge-report.md
mode: tdd
blockedBy: []
blocks: []
---

# Plan: Port AdAccounts Prototype Into Remote-Owned Tab Workspace

## Overview

Port the useful logic from `feat-dev-prototype` into the current UI direction without doing a raw git merge. The `adaccounts` remote will own the TKQC/BM/Page/Pixel tabs and Function panel layout, while shell continues to load the remote normally.

This is a large app-local port/refactor. Use TDD-style gates: establish baseline checks first, then migrate one tab/domain at a time and run focused verification after each domain.

## Context Links

- Brainstorm: `plans/reports/brainstorm-260623-1857-adaccounts-prototype-merge-report.md`
- Existing architecture doc: `docs/adaccounts-feature-architecture.md`
- Feature map: `.claude/features/README.md`
- Current shell workspace reference: `apps/shell/src/components/WorkspaceContent.vue`
- Current adaccounts route: `apps/adaccounts/src/pages/AdAccountsPage.vue`
- Source branch to port from: `feat-dev-prototype`

## Fixed Decisions

- Remote `adaccounts` owns tabs + Function panel.
- Do not raw-merge `feat-dev-prototype`.
- Port all prototype logic needed for TKQC, BM, and Page.
- Pixel tab is empty table/panel only; no fake API/data.
- Function panel 2 renders a placeholder in this port; do not wire business logic into it yet.
- `basic/advanced` mode is no longer an `adaccounts`-local route mode. Mode is a project-wide concern with a global switch; this plan must not keep `apps/adaccounts/src/stores/mode-store.ts` as the long-term owner.
- Organize business folders by tab: `features/tkqc`, `features/bm`, `features/page`, `features/pixel`.
- Keep common FB infra and domain tool runners in `apps/adaccounts/src/api/`: extension proxy, token helpers, graph helpers, batch runner, and `src/api/tools/**`.
- Avoid `packages/shared-*` changes in this app port.
- Update feature docs as part of the implementation, not afterthought.

## Target Architecture

```text
apps/adaccounts/src/
  pages/AdAccountsPage.vue
  features/
    workspace/
      pages/AdAccountsWorkspace.vue
      components/WorkspaceTabFrame.vue
      components/FunctionPanelSlot.vue
      stores/workspace-tab-store.ts
      types/workspace.types.ts
      index.ts
    tkqc/
      components/TkqcTableView.vue
      components/TkqcFunctionPanel.vue
      api/
      composables/
      stores/
      tools/
      types/
      index.ts
    bm/
      components/BmTableView.vue
      components/BmFunctionPanel.vue
      api/
      composables/
      stores/
      tools/
      types/
      index.ts
    page/
      components/PageTableView.vue
      components/PageFunctionPanel.vue
      api/
      composables/
      stores/
      types/
      index.ts
    pixel/
      components/PixelTableView.vue
      components/PixelFunctionPanel.vue
      index.ts
  api/
    smit-connect.ts
    fb-token.ts
    fb-bm-token.ts
    fb-token-cache.ts
    fb-graph.ts
    run-batch.ts
```

## Phases

| # | Phase | Status | Purpose |
|---|-------|--------|---------|
| 1 | [Baseline, inventory, and test guardrails](phase-01-baseline-inventory-and-test-guardrails.md) | completed | Prove current checks, inventory prototype files, define exact port map |
| 2 | [Remote-owned workspace frame](phase-02-remote-owned-workspace-frame.md) | completed | Move/adapt tab + function-panel frame into `adaccounts` remote |
| 3 | [TKQC tab migration](phase-03-tkqc-tab-migration.md) | completed | Move current TKQC table/tools into `features/tkqc` without behavior loss |
| 4 | [BM prototype port](phase-04-bm-prototype-port.md) | completed | Port BM data selection/actions/tools from prototype into `features/bm` |
| 5 | [Page prototype port and Pixel placeholder](phase-05-page-prototype-port-and-pixel-placeholder.md) | completed | Port Page table/tools and add empty Pixel tab |
| 6 | [Docs, verification, and cleanup](phase-06-docs-verification-and-cleanup.md) | completed | Update feature docs, remove stale paths, run final checks |

## Dependency Graph

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
```

Keep the sequence linear. Parallelizing this migration is not worth the import churn risk.

## Validation Strategy

Focused checks after each code phase:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
```

Final checks:

```bash
pnpm verify:features
pnpm verify:all
```

Manual smoke after implementation:

- `/app/adaccounts` renders from shell.
- Tabs show TKQC/BM/Page/Pixel.
- Function panel 1 changes with active tab.
- TKQC table/tools still work as before.
- BM table/tools from prototype load and run where token/session permits.
- Page table/tools from prototype render.
- Pixel tab shows empty state and does not crash.

## Acceptance Criteria

- [x] No raw merge of `feat-dev-prototype`; only selective ports.
- [x] `features/tkqc`, `features/bm`, `features/page`, `features/pixel`, and `features/workspace` exist with public `index.ts` surfaces.
- [x] `/app/adaccounts` is remote-owned workspace, not an adaccounts-local `basic/advanced` mode switch UI.
- [x] Project-wide mode switch integration is not blocked by leftover adaccounts-local `mode-store` ownership.
- [x] TKQC/BM/Page/Pixel tabs render in the remote.
- [x] Function panel 1 maps to active tab tools.
- [x] Pixel tab is empty, truthful, and stable.
- [x] `pnpm --filter @mf2/adaccounts typecheck` passes.
- [x] `pnpm --filter @mf2/adaccounts build` passes.
- [x] `.claude/features` docs match new paths.
- [x] `pnpm verify:features` passes.

## Out of Scope

- New Pixel API or fake Pixel data.
- New shared-ui components or shared package API changes.
- Rewriting FB runner internals beyond import/path adaptation.
- Making shell own business tabs.
- Perfect live verification of every FB mutation without Sếp providing runtime session/extension.

## Risks

| Risk | Mitigation |
|---|---|
| Large path churn breaks imports | Migrate by domain; typecheck after each phase |
| Prototype UI conflicts with current UI | Port logic selectively; use workspace frame as the single UI owner |
| Token helpers diverge | Keep shared FB infra under `src/api` |
| Docs drift | Phase 6 dedicated to `.claude/features` + architecture doc |
| Runtime-only FB failures | Preserve error reporting; manual verify separately from static checks |

## Validated Decisions

- Function panel 2 renders placeholder content in this port; no business logic.
- Domain runner files stay under `src/api/tools/**` for this port.
- Feature docs are created per tab and migrate gotchas from old docs.

## Validation Log

### Phase 6 — Docs, verification, and cleanup — 2026-06-23

- Status: completed.
- Removed obsolete adaccounts-local mode source files: `features/basic-mode/**`, `features/advanced-mode/**`, and `stores/mode-store.ts`.
- Removed the old ToolPanel advanced-mode switch; workspace tabs now own TKQC/BM/Page/Pixel navigation.
- Updated feature docs and broader docs to current tab workspace architecture.
- Final review: `DONE_WITH_CONCERNS`; all actionable doc accuracy concerns addressed before completion.
- Verification:
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; CSS order and asset-size warnings only.
  - `pnpm verify:features`: PASS.
  - `pnpm verify:all`: PASS.
- Manual runtime smoke: skipped because the app/browser was not launched in this session and live FB actions require SMIT Connect + FB session. Recommended before merge/deploy.
- Working tree note: `apps/shell/src/components/WorkspaceContent.vue` was modified before/alongside this task and left untouched by cleanup.

### Phase 5 — Page prototype port and Pixel placeholder — 2026-06-23

- Status: completed.
- Ported Page prototype folders and wired Page tab to real Page manager/tool UI.
- Added truthful Pixel empty table and Function panel placeholders; no Pixel API/data/fake rows.
- Ported generic tool-action helper pieces required by Page tools and updated TKQC ToolPanel to the enabled-tools model.
- Page tools remain UI-only and warn that tools are not wired to API yet.
- Page count follows loaded Page rows; Pixel count remains 0.
- Code review: `DONE_WITH_CONCERNS`; concerns addressed before completion.
- Feature docs updated:
  - `.claude/features/adaccounts-page-tab.md`
  - `.claude/features/adaccounts-pixel-placeholder.md`
  - `.claude/features/adaccounts-workspace-tabs.md`
  - `.claude/features/adaccounts-tool-actions.md`
  - `.claude/features/README.md`
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; CSS order and asset-size warnings only.

### Phase 4 — BM prototype port — 2026-06-23

- Status: completed.
- Ported BM prototype helpers/runners/actions without raw-merge.
- Added `apps/adaccounts/src/features/bm/**` wrapper surface.
- BM tab now renders BM data loading UI and Function panel 1 renders prototype BM tools.
- BM row selection flows through `useBmSelection` and drives BM action panel selected count.
- BM runners compile under `apps/adaccounts/src/api/tools/bm/**`.
- Token helpers compile; `fb-token-cache.ts` stores JSON directly in extension storage to avoid adding `crypto-js` dependency.
- Review finding fixed: BM admin promote reuses `ADMIN_TASKS` rather than empty `business_roles`.
- Sếp confirmed keeping prototype `businessID: 1347771445924940` in `fb-bm-token.ts`; live verification remains required.
- Feature docs updated:
  - `.claude/features/adaccounts-bm-tab.md`
  - `.claude/features/adaccounts-bm-data-loading.md`
  - `.claude/features/adaccounts-workspace-tabs.md`
  - `.claude/features/README.md`
- Code review: `DONE_WITH_CONCERNS`; actionable functional/doc concerns addressed before completion.
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; CSS order and asset-size warnings only.

### Phase 3 — TKQC tab migration — 2026-06-23

- Status: completed with deferred deep path cleanup.
- Added `apps/adaccounts/src/features/tkqc/**` wrapper surface.
- TKQC tab now renders the existing account table and Function panel 1 renders the existing TKQC tools.
- Selected account resolution remains `selectedIds ∩ accounts`, now inside `TkqcFunctionPanel`.
- Old local advanced-mode switch is hidden in workspace TKQC via `showAdvancedSwitch=false`; old compatibility path remains defaulted for old components.
- TKQC tab count follows `accounts.length`; BM/Page/Pixel remain placeholder counts.
- Feature docs updated:
  - `.claude/features/adaccounts-tkqc-tab.md`
  - `.claude/features/adaccounts-workspace-tabs.md`
  - `.claude/features/adaccounts-basic-mode.md`
  - `.claude/features/README.md`
- Code review: `DONE_WITH_CONCERNS`; concerns addressed before completion except deliberate deferred deep path cleanup.
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS; CSS order and asset-size warnings only.
- Test script: skipped because `@mf2/adaccounts` currently has no package `test` script.

### Phase 2 — Remote-owned workspace frame — 2026-06-23

- Status: completed.
- Added remote-owned workspace files under `apps/adaccounts/src/features/workspace/**`.
- `/app/adaccounts` now renders `AdAccountsWorkspace` from `AdAccountsPage.vue`; the page no longer imports `useModeStore`, `BasicModeView`, or `AdvancedModePlaceholder`.
- TKQC/BM/Page/Pixel tabs render placeholder table content; Function panel 1 follows the active tab; Function panel 2 remains placeholder-only.
- Feature docs updated:
  - `.claude/features/adaccounts-workspace-tabs.md`
  - `.claude/features/adaccounts-basic-mode.md`
  - `.claude/features/README.md`
- Code review: `DONE_WITH_CONCERNS`; concerns addressed before completion.
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNING; only asset-size warning remains.

### Phase 1 — Baseline, inventory, and test guardrails — 2026-06-23

- Status: completed.
- `pnpm --filter @mf2/adaccounts typecheck`: PASS.
- `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS.
  - Warnings: shared-ui CSS order conflicts and asset size warnings; build still compiled successfully.
- Prototype/current file map created: `research/prototype-file-map.md`.
- App code changes: none.

### Session 1 — 2026-06-23

**Trigger:** Sếp selected `/ck:plan validate` after TDD plan creation.
**Questions asked:** 4

#### Verification Results

- **Tier:** Full (6 phases)
- **Claims checked:** 14
- **Verified:** 12 | **Failed:** 0 | **Unverified:** 2

Verified evidence:

- Current plan paths exist: `apps/adaccounts/src/pages/AdAccountsPage.vue`, `apps/shell/src/components/WorkspaceContent.vue`, `docs/adaccounts-feature-architecture.md`, `.claude/features/adaccounts-bm-data-loading.md`, `.claude/features/adaccounts-tool-actions.md`.
- Prototype source paths exist on `feat-dev-prototype`: `features/bm-actions/index.ts`, `features/page-manager/index.ts`, `features/page-tool-actions/index.ts`, `api/fb-bm-token.ts`, `api/fb-token-cache.ts`, `api/tools/share-partner.ts`.
- Current `apps/adaccounts/package.json` has `dev`, `build`, `typecheck`; no `test` script. Plan wording keeps tests optional (`if script exists`).
- Current `AdAccountsPage.vue` still imports `BasicModeView` and `AdvancedModePlaceholder`, so cleanup of adaccounts-local route mode is a real migration item.

Unverified:

- Runtime FB mutations require SMIT Connect extension + logged-in FB session.
- Exact Function panel 2 final product content is out of scope; placeholder only for this plan.

#### Questions & Answers

1. **[Scope]** Function panel 2 trong workspace adaccounts nên xử lý thế nào ở đợt port này?
   - Options: Ẩn ở MVP | Placeholder | Port tool phụ
   - **Answer:** Placeholder
   - **Rationale:** Keeps the visual workspace structure while avoiding new business logic in panel 2.

2. **[Architecture]** Sau khi workspace tabs mới chạy trong remote, mode `basic/advanced` cũ nên giữ hay bỏ?
   - Options: Bỏ khỏi route chính | Giữ compatibility | Giữ mode-store only
   - **Answer:** mode sẽ là mode cho cả dự án chứ không trong adaccount nữa, sẽ có nút switch mode để thay đổi mode cho toàn dự án
   - **Rationale:** Prevents implementing a local adaccounts mode owner that conflicts with the intended global project mode.

3. **[Architecture]** Các runner/API tool theo domain nên đặt ở đâu trong đợt port này?
   - Options: Giữ `src/api/tools` | Move vào tab folders | Hybrid theo nhu cầu
   - **Answer:** Giữ `src/api/tools`
   - **Rationale:** Reduces import churn and keeps FB runner/tool infra centralized for this large port.

4. **[Docs]** Feature docs cũ của adaccounts nên chuyển sang cấu trúc mới thế nào?
   - Options: Docs mới theo tab | Rename docs cũ | Giữ cả hai
   - **Answer:** Docs mới theo tab
   - **Rationale:** New docs match the tab-folder architecture while old gotchas are migrated instead of lost.

#### Confirmed Decisions

- Function panel 2: render placeholder, no business logic.
- Mode: not owned locally by adaccounts; global project mode switch is the intended direction.
- Runners: keep under `apps/adaccounts/src/api/tools/**` for this port.
- Docs: create new tab docs and migrate gotchas from old docs.

#### Impact on Phases

- Phase 2: clarify panel 2 placeholder and global-mode boundary.
- Phase 3: clarify TKQC runners stay in `src/api/tools`.
- Phase 4: clarify BM runners/token helpers stay in `src/api`.
- Phase 5: clarify panel 2 placeholder.
- Phase 6: clarify docs-new-by-tab plus gotcha migration.

### Whole-Plan Consistency Sweep

- Files reread: `plan.md`, `phase-02-remote-owned-workspace-frame.md`, `phase-03-tkqc-tab-migration.md`, `phase-04-bm-prototype-port.md`, `phase-05-page-prototype-port-and-pixel-placeholder.md`, `phase-06-docs-verification-and-cleanup.md`.
- Decision deltas checked: 4 (panel 2 placeholder, global project mode, runners under `src/api/tools`, docs new by tab).
- Reconciled stale references: 6.
- Unresolved contradictions: 0.

