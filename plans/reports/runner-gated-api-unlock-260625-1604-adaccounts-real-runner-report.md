---
type: brainstorm-report
topic: adaccounts-runner-gated-api-unlock
status: approved
created: 2026-06-25
---

# Runner-gated API unlock for Adaccounts real runner testing

## Summary

Sếp muốn mở logic gọi API cho pattern chức năng TKQC, BM, Page để test logic thật đã triển khai trước đó.

Quyết định đã duyệt: **runner-gated unlock**.

- Tab nào có runner thật thì cho chạy runner thật.
- Tool nào chưa có runner thật thì không chạy giả, vẫn cảnh báo rõ.
- Không viết runner mới trong vòng này.
- Scope: cả 3 tab TKQC, BM, Page.

## Codebase findings

| Area | Current state | Evidence |
|---|---|---|
| TKQC | Có runner thật cho một phần tool | `apps/adaccounts/src/api/tools/index.ts` maps `rename`, `open-close-account`, `remove-user` |
| BM | Có runner registry thật rộng | `apps/adaccounts/src/features/businesses/tools/composables/use-bm-runner.ts` dispatches to `apps/adaccounts/src/api/tools/bm/**` |
| Page loading | Có API thật để load/list Page | `apps/adaccounts/src/features/page/api/page-fetch.ts` |
| Page actions | Chưa có action runner thật trong code hiện tại | `PageToolDetailPanel.vue` chỉ toast `chưa được đấu API`; `page-tool-catalog.ts` là schema UI |
| Docs/plans | Page action UI-only là quyết định đã ghi trước đó | `.claude/features/adaccounts-page-tab.md`, `plans/260625-1530-apply-tkqc-pattern-to-bm-page/*` |

## Problem statement

User cần kiểm tra logic API thật đã port, nhưng UI đang trộn 2 trạng thái:

1. Một số tool đã có runner thật.
2. Một số tool chỉ có catalog/form UI.

Nếu bỏ hết cảnh báo hoặc bật hết nút chạy, UI sẽ tạo kỳ vọng sai và có thể tạo fake success. Cần mở theo runner thật, không theo danh sách tool hiển thị.

## Requirements captured

### Expected output

Thiết kế/plan để mở logic API cho cả 3 tab TKQC/BM/Page theo nguyên tắc: **tool có runner thật thì chạy; tool chưa có runner thật thì không chạy giả**.

### Acceptance criteria

- Workflow run gọi đúng runner/API thật với dữ liệu đang chọn trong table.
- Tool không có runner thật vẫn cảnh báo/skip rõ.
- Không thêm runner/API mới.
- Không đổi lớn UI pattern hiện tại.

### Out of scope

- Không viết runner mới.
- Không port Page action runner từ branch/prototype cũ trong vòng này.
- Không reuse BM Page-related runner cho Page tab nếu phải tạo bridge logic mới.

### Constraints

- Vue 3 + TypeScript strict.
- Components/pages không gọi fetch trực tiếp; runner/API nằm ở `api/` hoặc composable registry hiện có.
- Feature docs phải update sau code change.
- Không đụng `packages/shared-*` nếu không cần.

### Touchpoints

- `apps/adaccounts/src/features/adaccounts/tools/components/ToolDetailPanel.vue`
- `apps/adaccounts/src/api/tools/index.ts`
- `apps/adaccounts/src/features/businesses/tools/components/BmActionDetailPanel.vue`
- `apps/adaccounts/src/features/businesses/tools/composables/use-bm-runner.ts`
- `apps/adaccounts/src/features/page/tools/components/PageToolDetailPanel.vue`
- `apps/adaccounts/src/features/page/tools/data/page-tool-catalog.ts`
- `.claude/features/adaccounts-tkqc-tab.md`
- `.claude/features/adaccounts-bm-tab.md`
- `.claude/features/adaccounts-page-tab.md`
- `.claude/features/adaccounts-tool-actions.md`

## Approaches evaluated

### Approach A — Runner-gated unlock (approved, recommended)

Open only tools that have real runner registries.

**Pros**

- Matches user acceptance: tool có runner chạy.
- No fake success.
- Smallest safe change.
- Clear test surface for real logic.

**Cons**

- Page action tools still cannot run real actions because no Page action runner exists in current code.

### Approach B — Reuse BM Page-related runners in Page tab

Map Page tab tools to BM runners such as `claim-page`, `remove-page`, `create-page-bm`, `reactivate-page`.

**Pros**

- Some Page-like actions may become runnable.

**Cons**

- BM runners require `bmIds`; Page tab selects `pageIds`.
- Needs bridge logic/form changes.
- Violates “không viết runner mới” spirit.

### Approach C — Port Page runners from prototype/branch

Scout old branch/prototype and port Page action runners.

**Pros**

- Could make Page actions real.

**Cons**

- Larger task.
- Becomes new implementation/port, not unlock existing runner.
- Higher risk without tests restored.

## Final recommendation

Use **Approach A — Runner-gated unlock**.

Implementation should be boring and explicit:

1. TKQC: keep runner map source-of-truth as `TOOL_RUNNERS`; only those run.
2. BM: keep `useBmRunner().getRunner()` as source-of-truth; only registered tools run.
3. Page: keep action tools UI-only because no runner exists; update copy/docs so state is truthful.
4. Docs: update feature docs to say Page load API is real, Page action runner unavailable; TKQC has partial runner coverage; BM runner registry is active.

## Implementation considerations

- Avoid generic cross-domain abstraction until repeated pain exists.
- Do not mutate catalogs to hide tools unless product asks. Showing unavailable tools with clear status is safer for ongoing UI pattern testing.
- Do not call `page-fetch.ts` from Page actions; it loads rows/details, not action runners.
- Do not map BM runner to Page runner unless Sếp approves new bridge scope.

## Validation criteria

- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm verify:features`
- Manual smoke:
  - TKQC selected accounts + `rename/open-close-account/remove-user` call real runner.
  - TKQC unavailable tools warn/skip, no fake success.
  - BM selected BM + registered actions call real BM runner.
  - Page selected pages + action run clearly says no real runner exists yet.

## Next steps

1. Create implementation plan from this report with `/ck:plan`.
2. Implement minimal wiring/copy/docs updates.
3. Run narrow verification.

## Unresolved questions

None for approved scope.
