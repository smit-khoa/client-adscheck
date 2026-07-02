---
type: brainstorm-report
topic: adaccounts-prototype-merge-into-current-ui
status: approved
created: 2026-06-23 18:57 Asia/Saigon
repo: /Volumes/Workspace/smit/worktree/client/feat-rebase
source_branch: feat-dev-prototype
target_branch: smit-khoa/feat-rebase
---

# Brainstorm Report — AdAccounts Prototype Merge Into Current UI

## Summary

Sếp muốn đưa logic đã phát triển ở nhánh `feat-dev-prototype` vào giao diện hiện tại mà không làm mất UI mới.

Quyết định đã chốt:

- Remote `adaccounts` sở hữu tabs + Function panel.
- Port tất cả prototype từ `feat-dev-prototype`.
- Tách kiến trúc theo tab trong `apps/adaccounts/src/features/`: `tkqc`, `bm`, `page`, `pixel`.
- Pixel chưa có logic cũ nên hiển thị bảng trống.
- Không git merge thẳng branch cũ; port logic có kiểm soát.

## Problem-first diagnosis

### Solution-jumping signal

Đề xuất ban đầu là merge nhánh `feat-dev-prototype` vào hiện tại. Tín hiệu thật: logic cũ đã có giá trị nhưng UI hiện tại đã đổi lớn, merge thẳng có thể phá layout mới.

### Underlying problem

Cần tái sử dụng logic prototype đã làm xong, nhưng bọc lại theo giao diện/tab mới và folder boundary mới để dễ phát triển tiếp.

### Assumptions to challenge

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Prototype logic còn dùng được | Port xong nhưng runtime lỗi do API/token cũ | Typecheck/build + manual run với SMIT Connect/FB session |
| Shell không nên biết TKQC/BM/Page/Pixel | Nếu workspace UI cần dùng chung nhiều app, remote-owned layout có thể lặp | Xem roadmap shell trước khi mở rộng sang remote khác |
| Folder theo tab tốt hơn feature hiện tại | Đổi path nhiều, mất thời gian | Plan theo phase, typecheck sau từng nhóm |
| Pixel có thể để trống | User kỳ vọng tab có table shape giống các tab khác | Tạo empty table/panel rõ ràng, không fake data |

### Problem statement

- Users/context: developer + người dùng nội bộ Adscheck.
- Struggle: logic cũ nằm ở branch cũ, UI mới nằm ở branch hiện tại; merge thẳng dễ phá UI.
- Cause: prototype phát triển trước khi workspace shell mới hoàn thiện.
- Consequence: chậm ship nếu rewrite hoặc merge bừa.
- Success: `/app/adaccounts` có tabs TKQC/BM/Page/Pixel theo UI mới, logic prototype chạy lại trong folder tách bạch.

### Alternative framings considered

1. **Preserve shell workspace as universal layout**  
   Shell sở hữu tabs/panels; remotes chỉ cung cấp content. Đẹp về platform, nhưng boundary MF phức tạp hơn.

2. **Remote adaccounts owns business workspace**  
   `adaccounts` tự sở hữu tabs/panels và logic. Đơn giản hơn, phù hợp mục tiêu port logic nhanh. Chọn hướng này.

3. **Expose component registry from remote**  
   Shell sở hữu layout, remote expose registry/tab components. Linh hoạt nhưng over-engineer giai đoạn này.

### Evidence status

Medium. Repo cho thấy:

- Current branch có shell `WorkspaceContent.vue` tabs placeholder.
- Current `adaccounts` đã có feature-first docs và TKQC/BM base logic.
- `feat-dev-prototype` có BM/Page tools và runner nhiều hơn current branch.
- Feature docs bắt buộc cập nhật sau thay đổi.

### Validation plan

- Compare file list/diff against `feat-dev-prototype`.
- Port by tab group, not whole-branch merge.
- Run `pnpm --filter @mf2/adaccounts typecheck` after import migration.
- Run `pnpm --filter @mf2/adaccounts build` after UI wiring.
- Run `pnpm verify:features` and `pnpm verify:all` after docs update.
- Manual smoke: TKQC/BM/Page/Pixel tab switch, Function panel 1 changes by active tab, Pixel empty state no crash.

### Stakeholder message

Không nên merge thẳng `feat-dev-prototype`; em sẽ port có kiểm soát phần logic thật vào UI/tab mới, giữ shell sạch và tách folder theo tab để dễ bảo trì.

## Scout findings

| Area | Finding |
|---|---|
| Stack | Vue 3.5, TypeScript strict, Pinia, Rspack, Module Federation 2.0, Tailwind v4, shared-ui |
| Current adaccounts | Có `account-list`, `account-selection`, `tool-actions`, `basic-mode`, `advanced-mode`, `bm-data-loading` |
| Prototype branch | Có thêm `bm-actions`, `page-manager`, `page-selection`, `page-tool-actions`, `api/tools/bm/*`, `fb-bm-token.ts`, `fb-token-cache.ts` |
| Current shell | `WorkspaceContent.vue` có UI tabs TKQC/BM/Page/Pixel + right function panels, nhưng chỉ placeholder |
| Docs constraints | Đọc/cập nhật `.claude/features/*` bắt buộc; UI phải dùng shared-ui components |

## Evaluated approaches

### Approach A — Shell owns workspace, adaccounts supplies content

**Pros**

- Shell layout có thể dùng chung cho remote khác.
- WorkspaceContent hiện có được giữ vai trò trung tâm.

**Cons**

- Shell phải biết nhiều về TKQC/BM/Page/Pixel.
- Cần MF contract mới để truyền tab content/panel content.
- Dễ làm phức tạp cho nhu cầu hiện tại.

### Approach B — Remote adaccounts owns workspace tabs/panels

**Pros**

- Ít cross-app boundary.
- Port prototype dễ hơn.
- Logic + UI business cùng nằm trong remote.
- Phù hợp quyết định: remote sở hữu tabs + Function panel.

**Cons**

- Nếu sau này app khác cần y hệt workspace, có thể phải extract layout sau.
- Một phần UI workspace hiện đang ở shell cần chuyển/áp dụng lại vào remote.

### Approach C — Shell workspace + remote registry/contract

**Pros**

- Linh hoạt dài hạn.
- Shell layout sạch, remote vẫn cung cấp content.

**Cons**

- Over-engineer lúc này.
- Nhiều expose surface qua Module Federation.
- Tăng rủi ro type/runtime khi đang port branch lớn.

## Final decision

Chọn **Approach B**.

Remote `adaccounts` sẽ render workspace tabs + content + Function panel. Shell chỉ load remote như bình thường.

## Target architecture

```text
apps/adaccounts/src/
  pages/
    AdAccountsPage.vue
  features/
    workspace/
      pages/AdAccountsWorkspace.vue
      components/WorkspaceTabs.vue
      components/FunctionPanels.vue
      stores/workspace-tab-store.ts
      index.ts

    tkqc/
      components/TkqcTableView.vue
      components/TkqcFunctionPanel.vue
      composables/
      api/
      tools/
      stores/
      types/
      index.ts

    bm/
      components/BmTableView.vue
      components/BmFunctionPanel.vue
      api/
      tools/
      composables/
      stores/
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
      types/
      index.ts

  api/
    smit-connect.ts
    fb-token.ts
    fb-bm-token.ts
    fb-token-cache.ts
    fb-graph.ts
    run-batch.ts
```

## Port mapping

| Source | Target |
|---|---|
| `features/account-list/*` | `features/tkqc/*` |
| `features/account-selection/*` | `features/tkqc/*` or `features/tkqc/stores/*` |
| `features/tool-actions/*` | `features/tkqc/*` |
| `api/tools/rename-account.ts`, `open-close-account.ts`, `remove-user.ts`, `share-partner.ts` | `features/tkqc/tools/*` or `api/tools/tkqc/*` depending import simplicity |
| `features/bm-data-loading/*` | `features/bm/*` |
| `features/bm-actions/*` | `features/bm/*` |
| `api/tools/bm/*` | `features/bm/tools/*` or `api/tools/bm/*` if runner registry stays API-level |
| `features/page-manager/*` | `features/page/*` |
| `features/page-selection/*` | `features/page/*` |
| `features/page-tool-actions/*` | `features/page/*` |
| Pixel missing | `features/pixel/*` empty table/panel |

## Shared API boundary

Keep common infra in `src/api/`:

- `smit-connect.ts`
- `fb-token.ts`
- `fb-bm-token.ts`
- `fb-token-cache.ts`
- `fb-graph.ts`
- `run-batch.ts`
- common API types

Reason: these are shared by TKQC/BM/Page. Copying into each tab violates DRY and makes token fixes painful.

Domain-specific runners may either:

- stay under `src/api/tools/<domain>` if imports are simpler, or
- move under `features/<tab>/tools` if the plan can update imports cleanly.

Recommendation: start conservative. Move feature UI/composables/stores/types into tab folders first; move runners only when import graph is stable.

## UI behavior

| Tab | Main content | Function panel 1 | Function panel 2 |
|---|---|---|---|
| TKQC | TKQC table/list | TKQC tools from old right panel | Placeholder or hidden |
| BM | BM data table/loading | BM tools from prototype | Placeholder or hidden |
| Page | Page table/loading | Page tools from prototype | Placeholder or hidden |
| Pixel | Empty table state | Empty/coming soon state | Placeholder or hidden |

## Implementation considerations

- Do not `git merge feat-dev-prototype` directly.
- Use branch/file-level porting with `git show feat-dev-prototype:path` or selective checkout into temp review.
- Keep changes phased:
  1. Workspace shell inside `adaccounts`.
  2. TKQC tab migration.
  3. BM tab migration.
  4. Page tab migration.
  5. Pixel placeholder.
  6. Docs + verification.
- Use shared-ui primitives: Table, Button, Tabs, Resizable, Card, Input, Select, etc.
- Do not change `packages/shared-*` in same app PR unless absolutely necessary.
- Preserve current feature docs or replace with new docs matching new tab folders.

## Risks

| Risk | Mitigation |
|---|---|
| Large import churn | Phase by tab, typecheck after each major group |
| Prototype UI conflicts with new UI | Port logic and components selectively, not full merge |
| Feature docs drift | Update `.claude/features/README.md` and per-tab docs in same task |
| Runtime FB token fragility | Keep token code centralized; preserve existing gotchas |
| Pixel scope creep | Empty table only; no fake API/data |
| Shared/app PR mixing | Avoid `packages/shared-*` changes unless split into separate work |

## Success criteria

- `/app/adaccounts` renders remote-owned tabs: TKQC, BM, Page, Pixel.
- Active tab switches main table content and Function panel 1.
- TKQC logic from prototype/current works after migration.
- BM logic and tools from `feat-dev-prototype` are present and wired.
- Page logic and tools from `feat-dev-prototype` are present and wired.
- Pixel shows empty table/panel state, no crash.
- Folder boundary exists: `features/tkqc`, `features/bm`, `features/page`, `features/pixel`.
- `pnpm --filter @mf2/adaccounts typecheck` passes.
- `pnpm --filter @mf2/adaccounts build` passes.
- `pnpm verify:features` passes.
- Feature docs updated to match real files.

## Recommended next step

Create an implementation plan with `/ck:plan --tdd` because this is a large behavior-preserving port/refactor with many existing logic paths.

## Unresolved questions

- Function panel 2 should be hidden by default or show placeholder? Recommendation: hide/placeholder in plan, no feature logic.
- Should domain-specific runners move fully into tab folders, or stay in `src/api/tools/<domain>`? Recommendation: decide during plan after import graph review; do not force move if it adds churn.
