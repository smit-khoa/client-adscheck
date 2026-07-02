---
phase: 3
title: "TKQC tab migration"
status: completed
priority: P1
dependencies: [2]
---

# Phase 03: TKQC Tab Migration

## Overview

Move the current TKQC account table, selection, and tool panel into `features/tkqc` so the TKQC tab works inside the new workspace frame without behavior loss.

## Requirements

- Functional: TKQC tab renders the current account table and TKQC tools.
- Functional: selected accounts still resolve correctly for tool execution.
- Functional: tool order, expanded function, runner settings, toasts, and local patch updates still work.
- Non-functional: avoid rewriting runner internals; this is a path/boundary migration.
- TDD gate: run existing adaccounts tests if present, plus typecheck after moving imports.

## Architecture

Target shape:

```text
features/tkqc/
  components/
    TkqcTableView.vue
    TkqcFunctionPanel.vue
  api/                 # account-list API wrappers if moved
  composables/         # account list + tool action composables
  stores/              # selection store if moved under tab
  tools/               # do not move runners in this port; keep src/api/tools/** as runner owner
  types/
  index.ts
```

Keep shared FB infra and runner files in `src/api`. Prefer wrapper exports from `features/tkqc/index.ts` for workspace imports.

## Related Code Files

- Move/adapt: `apps/adaccounts/src/features/account-list/**` -> `apps/adaccounts/src/features/tkqc/**`
- Move/adapt: `apps/adaccounts/src/features/account-selection/**` -> `apps/adaccounts/src/features/tkqc/**`
- Move/adapt: `apps/adaccounts/src/features/tool-actions/**` -> `apps/adaccounts/src/features/tkqc/**`
- Possibly keep: `apps/adaccounts/src/api/tools/rename-account.ts`
- Possibly keep: `apps/adaccounts/src/api/tools/open-close-account.ts`
- Possibly keep: `apps/adaccounts/src/api/tools/remove-user.ts`
- Add/keep under API runner layer: `apps/adaccounts/src/api/tools/share-partner.ts`
- Modify: `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue`

## Implementation Steps

1. Create `features/tkqc` public surface and temporary wrapper components.
2. Move current account-list files into `tkqc` or create wrappers first, then collapse old paths after typecheck.
3. Move current account-selection into `tkqc/stores` and `tkqc/composables`, or keep as internal `selection` subfolder if clearer.
4. Move tool-actions UI/composables/data/types into `tkqc`.
5. Update all imports to go through `features/tkqc` where crossing into workspace.
6. Port `share-partner.ts` from prototype under `src/api/tools` if it is referenced by the prototype catalog.
7. Wire TKQC tab main content to `TkqcTableView` and Function panel 1 to `TkqcFunctionPanel`.
8. Run checks:
   - `pnpm --filter @mf2/adaccounts typecheck`
   - `pnpm --filter @mf2/adaccounts test` if script exists

## Success Criteria

- [x] TKQC tab renders account table.
- [x] Selecting rows updates selected count.
- [x] Function panel 1 shows TKQC tools.
- [x] Existing wired tools still dispatch through runner registry.
- [ ] No production imports remain from old `features/account-list`, `features/account-selection`, `features/tool-actions` after final cleanup. Deferred: wrapper-first migration keeps old implementation owners temporarily to avoid high-risk import churn.
- [x] Typecheck passes.

## Phase 3 Result — 2026-06-23

- Added `features/tkqc/**` wrapper surface:
  - `TkqcTableView` renders the existing `AdAccountTable`.
  - `TkqcFunctionPanel` resolves selected account ids to full accounts and renders `ToolPanel`.
- Updated `WorkspaceTabFrame` to expose main and Function panel 1 slots with placeholder fallbacks.
- Updated `AdAccountsWorkspace` to render real TKQC table/tools when the active tab is `tkqc`; BM/Page/Pixel remain placeholders.
- Hid the old adaccounts-local advanced-mode switch inside the workspace TKQC panel via `ToolPanel` prop `showAdvancedSwitch=false`.
- TKQC tab count now follows `accounts.length`; other tabs remain placeholder counts.
- Code review: `DONE_WITH_CONCERNS`; concerns addressed before completion.
- Verification:
  - `pnpm verify:features`: PASS.
  - `pnpm --filter @mf2/adaccounts typecheck`: PASS.
  - `pnpm --filter @mf2/adaccounts build`: PASS_WITH_WARNINGS, CSS order and asset-size warnings only.
- Package test skipped because `apps/adaccounts/package.json` has no `test` script.

Note: old `features/account-list`, `features/account-selection`, and `features/tool-actions` remain as implementation owners behind the `features/tkqc` wrappers. Deep path collapse is intentionally deferred to avoid high-risk import churn.

## Risk Assessment

- Risk: moving stores changes Pinia identity. Mitigation: preserve store id strings unless intentionally changing persisted keys.
- Risk: tool localStorage keys break user ordering/settings. Mitigation: preserve keys like `adaccounts.tool-order.v1` and `adaccounts.tool-runner-settings.v1`.
- Risk: runner imports explode. Mitigation: keep runners in `src/api/tools`; only update registry/imports needed by tab UI.
