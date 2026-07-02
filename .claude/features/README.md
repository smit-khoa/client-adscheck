# Feature Map — AI navigation index

Read this first to locate a feature, then open its doc for files + flow + APIs.
Each doc lists the **real file paths** that make up the feature (this repo is layer-based —
a feature spans api/components/pages/stores, so the doc is the map that re-assembles it).

## Index

| Feature | Remote | Route | Roles | Flag | Status | Doc |
|---------|--------|-------|-------|------|--------|-----|
| Shell workspace content | shell | /home (shell placeholder) | — | — | done | [shell-workspace-content](shell-workspace-content.md) |
| Auth flow | shell | (startup hydrate) | — | — | done | [auth-flow](auth-flow.md) |
| Shell startup check-hash gate | shell | n/a (startup gate) | — | — | done | [shell-startup-check-hash-gate](shell-startup-check-hash-gate.md) |
| Shell header & business switcher | shell | /home (header) | — | — | done | [shell-header-business-switcher](shell-header-business-switcher.md) |
| Role & feature gating | shell | n/a | — | — | retired | [role-feature-gating](role-feature-gating.md) |
| Remote loading & recovery | shell | /adscheck-pro/* | — | — | done | [remote-loading-recovery](remote-loading-recovery.md) |
| AdAccounts — workspace tabs | adaccounts | /adscheck-pro/adaccounts | — | — | done | [adaccounts-workspace-tabs](adaccounts-workspace-tabs.md) |
| AdAccounts — TKQC tab | adaccounts | /adscheck-pro/adaccounts | — | — | done | [adaccounts-tkqc-tab](adaccounts-tkqc-tab.md) |
| AdAccounts — BM tab | adaccounts | /adscheck-pro/businesses | — | — | done | [adaccounts-bm-tab](adaccounts-bm-tab.md) |
| AdAccounts — Page tab | adaccounts | /adscheck-pro/page | — | — | done | [adaccounts-page-tab](adaccounts-page-tab.md) |
| AdAccounts — Pixel placeholder | adaccounts | /adscheck-pro/pixel | — | — | done | [adaccounts-pixel-placeholder](adaccounts-pixel-placeholder.md) |
| Quản lý TKQC — chế độ cơ bản | adaccounts | n/a (superseded by workspace tabs) | — | — | superseded | [adaccounts-basic-mode](adaccounts-basic-mode.md) |
| AdAccounts — BM data loading | adaccounts | /adscheck-pro/businesses | — | — | done | [adaccounts-bm-data-loading](adaccounts-bm-data-loading.md) |
| AdAccounts — account list (table + data) | adaccounts | (reused, no own route) | — | — | done | [adaccounts-account-list](adaccounts-account-list.md) |
| AdAccounts — account selection | adaccounts | (reused, no own route) | — | — | done | [adaccounts-account-selection](adaccounts-account-selection.md) |
| AdAccounts — tool actions | adaccounts | (reused, no own route) | — | — | done | [adaccounts-tool-actions](adaccounts-tool-actions.md) |
| Data-grid Table (shared-ui) | n/a (packages/shared-ui) | n/a | — | — | done | [shared-ui-data-grid-table](shared-ui-data-grid-table.md) |
| Date Range Picker (shared-ui) | n/a (packages/shared-ui) | n/a | — | — | done | [shared-ui-date-range-picker](shared-ui-date-range-picker.md) |
| Workspace Path Frame (shared-ui) | n/a (packages/shared-ui) | n/a | — | — | done | [shared-ui-workspace-path-frame](shared-ui-workspace-path-frame.md) |
| Extended Payment | extended-payment | /extended-payment | — | — | in-progress | [extended-payment](extended-payment.md) |

## Update discipline (MANDATORY)

Updating the matching feature doc is part of any code task that changes its logic, files,
routes, or APIs — not optional. See CLAUDE.md "Feature Docs" rule. Skipping updates rots the map.

Rules:
- One file per feature. Frontmatter + sections per `_TEMPLATE.md`.
- Required sections for every feature doc: `Purpose`, `Flow`, `Entry points / Routes`, `Files`, `APIs used`, `State`, `Permissions / Flags`, `Verification`, `Related`, `Decisions / Gotchas`.
- List real, verified file paths. No speculative docs for features that don't exist yet.
- Store only non-derivable knowledge (purpose, flow, decisions). Types live in `*/types` or
  `shared-types`; route tables live in `*/router` — do NOT hand-copy them here.
- New feature: copy `_TEMPLATE.md` -> `<slug>.md`, fill it, add a row above.

## Remote layer convention (where new code goes)

Inside each remote (`apps/<remote>/src/`), created on demand (not pre-stubbed):
`api/` (typed fns wrapping shared api — components never call fetch directly) ·
`components/` · `composables/` (use-*) · `pages/` (route views) · `stores/` (remote-local Pinia) ·
`router/` (child RouteRecordRaw[] exposed as ./routes) · `types/` (promote to shared-types only when ≥2 apps need).
Cross-cutting state (auth/layout) stays in `packages/shared-store`.
