---
slug: adaccounts-account-selection
remote: adaccounts
route: n/a
roles: []
feature_flag: n/a
status: done
---

## Purpose
Owns the set of selected account ids as a standalone capability, independent of account-list and tool-actions, so selection is reusable by tool actions, bulk operations, advanced mode, export, and history.

## Flow
1. use-account-selection wraps a remote-local Pinia store holding `selectedIds: Set<string>`.
2. Callers toggle one id (`toggleSelect`) or a caller-supplied id list (`toggleSelectAll(ids)`); selection never reads account data itself.
3. `isSelected(id)` and `selectedCount` drive table highlighting and tool-panel counts.
4. State persists across navigation (MF singleton remote) — leaving and returning keeps the selection.

## Entry points / Routes
- n/a — reusable feature, no own route.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/features/adaccounts/stores/account-selection-store.ts — Pinia store owning selectedIds
- apps/adaccounts/src/features/adaccounts/composables/use-account-selection.ts — isSelected/toggleSelect/toggleSelectAll/selectedCount over the store
- apps/adaccounts/src/features/adaccounts/types/account-selection.types.ts — AccountSelectionMode, AccountSelectionState (mode/excludedIds reserved for future all-filtered)
- apps/adaccounts/src/features/adaccounts/index.ts — public surface (composable, store, types)

## APIs used
- none.

## State
- selectedIds: Set<string> in account-selection-store (remote-local Pinia, persists across nav). Replaced as a whole Set on each toggle so Vue reactivity fires.

## Permissions / Flags
- none.

## Verification
- Run `pnpm verify:all` plus `pnpm --filter @mf2/adaccounts typecheck` and `build`. Manual: select/clear rows, count updates in table header and tool panel.

## Related
[[adaccounts-account-list]] [[adaccounts-tool-actions]] [[adaccounts-basic-mode]]

## Decisions / Gotchas
- **Bottom of the dependency graph:** account-selection must never import account-list or tool-actions. Callers pass id lists / read selectedCount, keeping selection decoupled from account data.
- **Explicit-only today:** only explicit row selection is implemented. `AccountSelectionState.mode`/`excludedIds` are a type-level boundary for a future "select all matching filter" — no UI for it yet (YAGNI).
- **Set replaced, not mutated:** toggles assign a new Set so reactivity triggers; in-place add/delete would not.
