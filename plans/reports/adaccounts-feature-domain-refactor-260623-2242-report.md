---
title: "AdAccounts feature domain refactor brainstorm"
type: brainstorm-report
created: 2026-06-23 22:42 Asia/Saigon
status: agreed-for-planning
scope: apps/adaccounts/src/features
---

# AdAccounts Feature Domain Refactor Brainstorm

## Summary

Sếp muốn dọn `apps/adaccounts/src/features` vì tab/action/tool đang tách theo lịch sử port và implementation detail. Hướng đề xuất là hợp lý với kiến trúc senior: gom theo domain người dùng hiểu được.

Quyết định đã chốt:

- Đổi domain code name:
  - `tkqc` -> `adaccounts`
  - `bm` -> `businesses`
- Giữ `features/workspace` trong `features`.
- Move sâu toàn bộ implementation vào domain folder, không chỉ rename wrapper.
- Tool/action/api/selection/store của domain nào nằm trong domain đó.
- Chỉ extract common khi có reuse thật.

Target `features`:

```text
apps/adaccounts/src/features/
  workspace/
  adaccounts/
  businesses/
  page/
  pixel/
```

## Problem-first diagnosis

### Solution-jumping signal

Đề xuất rename folder và gom tool/action là tín hiệu rằng code hiện tại khó đọc vì domain boundary không rõ.

### Underlying problem

Dev phải biết lịch sử port mới hiểu:

- TKQC data nằm trong `account-list`.
- TKQC tools nằm trong `tool-actions`.
- BM table nằm trong `bm-data-loading`.
- BM tools nằm trong `bm-actions`.
- Page table/tools/selection bị chia thành `page-manager`, `page-selection`, `page-tool-actions`.

Tên folder mô tả cách code được xây, không mô tả domain mà sản phẩm hiển thị.

### Problem statement

- Users/context: dev maintain `adaccounts` remote.
- Struggle: thêm/sửa tool phải tìm nhiều folder không cùng domain.
- Cause: cấu trúc từ port/migration cũ giữ lại implementation-owner folders.
- Consequence: import khó lần, dễ đặt nhầm tool, feature docs dễ drift.
- Success: nhìn `features/adaccounts|businesses|page|pixel` là biết file thuộc domain nào.

## Scout findings

- Stack: Vue 3, TypeScript, Pinia, Module Federation 2.0, pnpm workspace.
- Current docs already call `features/tkqc`, `features/bm`, `features/page`, `features/pixel` as workspace-facing surfaces, while old folders remain to reduce churn.
- Current `WorkspaceTab` key is `tkqc | bm | page | pixel`; labels are `TKQC`, `BM`, `Page`, `Pixel`.
- Current remaining implementation-owner folders:
  - `account-list`, `account-selection`, `tool-actions`
  - `bm-data-loading`, `bm-actions`, `bm-tool-types`
  - `page-manager`, `page-selection`, `page-tool-actions`
- `docs/adaccounts-feature-architecture.md` must be updated after implementation.
- Matching feature docs must be updated: workspace, adaccounts/TKQC, businesses/BM, Page, Pixel, tool actions/data loading docs.

## Evaluated approaches

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| A. Domain-only features | `features` only has 4 domain folders, workspace moved outside `features` | Cleanest boundary | More relocation; conflicts with Sếp choosing keep workspace | Not selected |
| B. Workspace + 4 domains | `features/workspace` plus `adaccounts`, `businesses`, `page`, `pixel`; move all domain implementation inside domains | Clear, pragmatic, close to existing workspace model | `features` has 5 folders, not pure domain-only | Selected |
| C. Rename wrappers only | Rename `tkqc`/`bm`, keep old implementation folders | Fast | Keeps core mess | Rejected |

## Recommended target architecture

```text
apps/adaccounts/src/features/
  workspace/
    components/
    pages/
    stores/
    types/
    index.ts

  adaccounts/
    api/
    components/
    composables/
    stores/
    tools/
      components/
      composables/
      data/
      types/
    types/
    index.ts

  businesses/
    api/
    components/
    composables/
    stores/
    tools/
      components/
      composables/
      data/
      types/
    utils/
    types/
    index.ts

  page/
    api/
    components/
    composables/
    stores/
    tools/
      components/
      composables/
      data/
    types/
    index.ts

  pixel/
    components/
    index.ts
```

App-level API infra remains outside domains:

```text
apps/adaccounts/src/api/
  smit-connect.ts
  fb-token.ts
  fb-bm-token.ts
  fb-token-cache.ts
  fb-graph.ts
  fb.ts
  run-batch.ts
  types.ts
```

Decision: domain feature `api/` may contain domain-specific list/load wrappers. Low-level extension/token/graph stays app API infra.

## Domain mapping

### Adaccounts domain

Move from:

- `features/tkqc/**`
- `features/account-list/**`
- `features/account-selection/**`
- `features/tool-actions/**` when only TKQC/adaccount-specific

Move to:

```text
features/adaccounts/
  components/AdAccountTableView.vue
  components/AdAccountFunctionPanel.vue
  components/AdAccountTable.vue
  components/LoadAdAccountsConfigDialog.vue
  composables/use-adaccount-list.ts
  composables/use-adaccount-selection.ts
  stores/adaccount-selection-store.ts
  api/*
  tools/*
  types/adaccounts.types.ts
```

UI label may remain `TKQC` if business wants localized shorthand.

### Businesses domain

Move from:

- `features/bm/**`
- `features/bm-data-loading/**`
- `features/bm-actions/**`
- `features/bm-tool-types/**`

Move to:

```text
features/businesses/
  components/BusinessTableView.vue
  components/BusinessFunctionPanel.vue
  components/BusinessDataLoadingView.vue
  components/BusinessTable.vue
  components/BusinessLoadConfigDialog.vue
  composables/use-business-data-loader.ts
  composables/use-business-selection.ts
  stores/business-selection-store.ts
  api/*
  tools/*
  utils/*
  types/businesses.types.ts
```

UI label may remain `BM` if product language needs it.

### Page domain

Move from:

- `features/page/**`
- `features/page-manager/**`
- `features/page-selection/**`
- `features/page-tool-actions/**`

Move to:

```text
features/page/
  api/page-fetch.ts
  components/PageTableView.vue
  components/PageFunctionPanel.vue
  components/PageManagerView.vue
  components/PageTable.vue
  components/PageLoadConfigDialog.vue
  composables/use-page-manager.ts
  composables/use-page-selection.ts
  stores/page-selection-store.ts
  tools/*
  types/page.types.ts
```

### Pixel domain

Keep truthful placeholder only:

```text
features/pixel/
  components/PixelTableView.vue
  components/PixelFunctionPanel.vue
  index.ts
```

No fake API, no fake rows.

## Common extraction rule

Do not create generic shared folders first.

Allowed extraction levels:

1. Keep inside domain by default.
2. If 2+ domains use the same component/composable, extract to app-local:

```text
apps/adaccounts/src/components/
apps/adaccounts/src/composables/
apps/adaccounts/src/lib/
```

3. Promote to `packages/shared-*` only when 2+ remotes need it. Separate PR/commit required.

Likely app-local common candidates after move:

- Generic tool list/form pieces if both adaccounts and page use them.
- Runner settings if truly shared across panels.

Avoid:

- `features/common`
- `features/shared`

Reason: these tend to become junk drawers.

## Compatibility notes

- Preserve existing localStorage keys unless there is a deliberate migration.
- Store ids can stay stable during first refactor if renaming them risks persisted state breakage.
- UI labels do not have to match code folder names.
- Import paths should switch through domain `index.ts` public surfaces where useful.
- Avoid touching `packages/shared-*`.

## Suggested implementation phases

1. Baseline + file map
   - Run current typecheck/build.
   - Create exact move map.
   - Identify persisted keys.

2. Rename workspace tab keys safely
   - `tkqc|bm` -> `adaccounts|businesses` in workspace types/store/imports.
   - Keep labels `TKQC`/`BM` unless product says otherwise.
   - Verify workspace renders.

3. Move Adaccounts domain
   - Move table/list/selection/tools under `features/adaccounts`.
   - Update imports and feature docs.
   - Verify typecheck/build.

4. Move Businesses domain
   - Move BM table/data-loading/selection/actions/tool-types under `features/businesses`.
   - Keep low-level FB infra in `src/api`.
   - Update imports and feature docs.
   - Verify typecheck/build.

5. Move Page domain
   - Move page manager/selection/tools under `features/page`.
   - Extract common tool UI only if reuse remains real.
   - Verify typecheck/build.

6. Cleanup + docs
   - Remove old folders.
   - Update `.claude/features/*` and `docs/adaccounts-feature-architecture.md`.
   - Run `pnpm verify:features` and `pnpm verify:all`.

## Validation criteria

- `apps/adaccounts/src/features` contains only:
  - `workspace`
  - `adaccounts`
  - `businesses`
  - `page`
  - `pixel`
- No imports reference removed folders.
- `/app/adaccounts` still renders workspace tabs.
- Adaccounts/TKQC table and tools still work.
- Businesses/BM data loading and tools still compile and render.
- Page table/tools still render with current UI-only warning where applicable.
- Pixel remains truthful empty placeholder.
- Verification passes:

```bash
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
pnpm verify:features
pnpm verify:all
```

## Risks

| Risk | Mitigation |
|---|---|
| Large import churn | Move one domain per phase; typecheck each phase |
| Persisted key breakage | Inventory localStorage/store ids first; migrate or preserve |
| Common extraction over-engineering | Extract only after 2+ real usages remain |
| Feature docs drift | Update docs in each phase, final `verify:features` |
| Runtime FB behavior unverified | Static checks plus manual smoke with SMIT Connect session |

## Final recommendation

Use selected Option B: `workspace + 4 domain folders`, with full implementation move.

This is the best balance between senior architecture and current repo constraints. It removes historical folder debt while keeping the workspace composition layer explicit.

## Unresolved questions

- Should UI tab labels change from `TKQC`/`BM` to `Ad Accounts`/`Businesses`, or only code names change? Recommendation: keep labels for now.
- Should persisted store ids/localStorage keys be renamed with migration, or preserved for low risk? Recommendation: preserve unless product needs clean persisted names.
