---
slug: adaccounts-pixel-placeholder
remote: adaccounts
route: /adscheck-pro/pixel
roles: []
feature_flag: n/a
status: done
---

## Purpose
Provide a truthful empty Pixel tab and Function panel placeholder in the adaccounts workspace without fake Pixel data or API calls.

## Flow
1. Shell loads `/adscheck-pro/pixel` and the remote renders [[adaccounts-workspace-tabs]].
2. User switches to the `Pixel` tab.
3. `AdAccountsWorkspace` renders `PixelTableView` in the main slot.
4. `PixelTableView` shows an empty state explaining that Pixel has no API/data in this port.
5. `AdAccountsWorkspace` renders `PixelFunctionPanel` in Function panel 1.
6. `PixelFunctionPanel` shows a coming-soon placeholder and does not call any API.

## Entry points / Routes
- `/adscheck-pro/pixel` -> `AdAccountsWorkspace` -> Pixel tab.

## Files (MANDATORY — real paths, verified to exist)
- apps/adaccounts/src/features/pixel/components/PixelTableView.vue — empty Pixel table-state placeholder
- apps/adaccounts/src/features/pixel/components/PixelFunctionPanel.vue — empty Pixel Function panel placeholder
- apps/adaccounts/src/features/pixel/index.ts — public Pixel placeholder surface for workspace imports
- apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue — wires Pixel tab slots to `PixelTableView` and `PixelFunctionPanel`

## APIs used
- none

## State
- Workspace active tab only. Pixel owns no data state in this port.

## Permissions / Flags
- none

## Verification
- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`
- Manual UI smoke: Pixel tab renders empty main state and empty Function panel; no network/API work is triggered by the placeholder.

## Related
[[adaccounts-workspace-tabs]] [[adaccounts-page-tab]]

## Decisions / Gotchas
- Do not add fake Pixel rows, fake counts, or speculative API wrappers. The truthful empty state is the feature for this port.
- Pixel count remains `0` until a real Pixel API/data source is accepted later.
