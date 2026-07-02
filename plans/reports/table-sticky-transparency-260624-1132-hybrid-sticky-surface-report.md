---
type: brainstorm-report
topic: table-sticky-transparent-background
created_at: 2026-06-24 11:32 Asia/Saigon
status: ready-for-plan
repo: /Volumes/Workspace/smit/worktree/client/feat-custom-table
---

# Brainstorm — Table Sticky Transparency Scroll Bleed

## Summary

Sếp cần table vẫn tận dụng nền gradient đẹp, nhưng sticky header và frozen columns không để content scroll phía sau lộ xuyên qua.

Kết luận: không nên tách header/frozen thành pane riêng ngay. Hướng tối ưu hiện tại là **Hybrid C**:

1. Giữ kiến trúc table hiện tại.
2. Thêm sticky visual surface / mask / frosted layer cho header + frozen columns.
3. Không đổi public props/events/import path.
4. Ghi rõ đây là bước thực dụng trước khi refactor pane riêng nếu browser test chứng minh chưa đủ.

## Codebase findings

| Area | Evidence | Note |
|---|---|---|
| Stack | `package.json`, `README.md` | Vue 3, TypeScript, Tailwind v4, Module Federation 2.0, pnpm, Turborepo. |
| Table core | `packages/shared-ui/src/components/ui/table/Table.vue` | 1 component lớn, quản lý header/body/footer/frozen/virtual/range/resize. |
| Table CSS | `packages/shared-ui/src/components/ui/table/style.css` | Sticky + transparent backgrounds định nghĩa tại đây. |
| Workspace background | `packages/shared-ui/src/components/ui/workspace-path-frame/WorkspacePathFrame.vue` | SVG gradient phía sau table slot. |
| Feature doc | `.claude/features/shared-ui-data-grid-table.md` | Đã ghi frozen transparent là accepted trade-off trước đó. |

## Problem statement

### Underlying problem

Sticky header và frozen columns là layer nằm trên body, nhưng hiện background của chúng transparent. Khi scroll, content phía dưới vẫn render bên dưới layer sticky, nên người dùng thấy chữ/cell lộ xuyên qua.

### Cause

- `.data-grid-main` là scroll container chính.
- Header dùng `position: sticky; top: 0`.
- Frozen columns dùng `position: sticky; left: ...`.
- Header/frozen/body đều transparent hoặc inherit transparent.
- `z-index` không thể che content nếu layer trên không có surface để che.

### Success criteria

- Scroll dọc: row content không lộ qua sticky header.
- Scroll ngang: non-frozen content không lộ qua frozen columns.
- Vẫn thấy cảm giác nền gradient workspace, không thành mảng trắng/đen cứng.
- Range-select/cell highlight/color rules vẫn hiển thị đúng.
- Resize, frozen shadow, footer sum không lệch.
- Không đổi public API của shared-ui table.

## Solution-jumping diagnosis

Ban đầu có ý tưởng tách header/frozen thành layer riêng. Ý tưởng này hợp lý vì grid chuyên nghiệp thường dùng pane/layer riêng. Nhưng trong codebase hiện tại, đó là refactor lớn chứ không phải fix visual nhỏ.

Pain thật sự không phải “thiếu layer riêng”, mà là: **sticky transparent layer không có visual mask để che content bên dưới**.

## Evaluated approaches

### A. Tách header/frozen thành pane riêng thật sự

**Mô tả**

- Header đứng ngoài body scroll dọc.
- Frozen columns thành pane riêng hoặc render riêng.
- Body non-frozen scroll độc lập.
- Đồng bộ `scrollLeft`/`scrollTop` bằng JS.

**Ưu**

- Triệt để nhất về kiến trúc.
- Gần cách data grid chuyên nghiệp hoạt động.
- Dễ phát triển pane-specific behavior về lâu dài.

**Nhược**

- Rủi ro cao nhất.
- Đụng virtualization, range-select coordinate, resize preview, column drag, footer sum, group/pivot.
- Không surgical.
- Vì `packages/shared-ui` là MF singleton, lỗi có thể ảnh hưởng nhiều app.

**Verdict**

Không khuyến nghị cho vòng này. Chỉ nên làm nếu table sẽ thành data-grid platform dài hạn và có thời gian regression test lớn.

### B. Sticky mask / frosted surface, không đổi kiến trúc

**Mô tả**

- Giữ cấu trúc hiện tại.
- Header/frozen vẫn native sticky.
- Thêm surface bán trong suốt hoặc pseudo-element phía sau content sticky.

**Ưu**

- Sửa nhỏ nhất.
- Trúng gốc visual bleed-through.
- Ít ảnh hưởng behavior phức tạp.
- Vẫn giữ nền đẹp nếu opacity/blur nhẹ.

**Nhược**

- Không phải refactor kiến trúc triệt để.
- Cần tinh chỉnh màu/blur theo browser thực tế.
- Nếu table sau này cần nhiều pane behavior, vẫn phải refactor.

**Verdict**

Giải pháp tốt nhất nếu chỉ cần xử lý bleed-through hiện tại.

### C. Hybrid — sticky mask trước, chừa đường pane refactor sau

**Mô tả**

- Implement như B.
- Tổ chức CSS bằng biến surface rõ ràng, ví dụ `--table-sticky-surface`.
- Cập nhật feature doc: transparent surface đã thay đổi thành transparent-main + sticky surface.
- Nếu browser test vẫn không đạt, plan phase sau mới refactor pane riêng.

**Ưu**

- Cân bằng tốt nhất giữa visual, rủi ro, tốc độ.
- Không khóa đường refactor sau.
- Giữ KISS/YAGNI.
- Dễ verify.

**Nhược**

- Không thỏa “tách layer thật” ngay.
- Cần chấp nhận đây là giải pháp thực dụng trước.

**Final recommendation**

Chọn **Hybrid C**.

## Recommended design

### Scope

Touch only:

- `packages/shared-ui/src/components/ui/table/style.css`
- `packages/shared-ui/src/components/ui/table/Table.vue` only if inline background must distinguish sticky/default surfaces
- `.claude/features/shared-ui-data-grid-table.md`

Avoid:

- `apps/*` changes
- public API changes
- pane refactor
- new dependency

### Visual strategy

Use a table sticky surface that is still translucent:

- Header sticky surface: light green/white alpha, optional `backdrop-filter: blur(8px)`.
- Frozen columns surface: same token, maybe slightly less opaque to keep gradient feel.
- Footer sum if sticky: same treatment.
- Body non-frozen/default cells stay transparent.

Use CSS variables so tuning is local and readable:

```css
.data-grid-container {
  --table-sticky-surface: color-mix(in oklab, white 72%, transparent);
  --table-sticky-surface-strong: color-mix(in oklab, white 82%, transparent);
}
```

Exact values should be tuned in browser.

### Implementation notes

- Prefer CSS-only first.
- Ensure inline `background: getCellBackground(...)` does not override frozen sticky surface unintentionally.
- If inline style blocks CSS, adjust `getCellBackground` minimally or use CSS pseudo-element surface behind content.
- Keep `cell_format`, color rules, `highlight-*`, and `.range-cell` priority intact.
- Preserve `.last-frozen-column::after` shadow.
- Watch z-index layering:
  - header surface above body rows
  - frozen columns above non-frozen cells
  - dropdown/context menus still above sticky cells

### Risk controls

- Do not move DOM structure in first implementation.
- Do not split header/body scroll containers.
- Do not introduce JS scroll sync.
- Do not change range coordinate model.

## Validation plan

Manual browser checks:

1. Table over workspace gradient still visually light.
2. Scroll vertical: rows do not bleed through header.
3. Scroll horizontal: non-frozen cells do not bleed through frozen columns.
4. Frozen checkbox column works.
5. Last frozen column shadow still appears while horizontal scrolling.
6. Resize frozen/non-frozen columns still works.
7. Range-select highlight and floating actions still work.
8. Color rules / cell format colors still override surface.
9. Footer sum, if enabled, does not bleed.

Command checks:

```bash
pnpm --filter @mf2/shared-ui typecheck
pnpm verify:all
```

If shared-ui has no direct typecheck script in this branch, use repo-level narrowest available typecheck/build command from package scripts.

## Acceptance criteria

- Header + frozen columns block scroll bleed while preserving translucent workspace look.
- No public shared-ui Table API change.
- Feature doc updated.
- Verification commands pass or failure reported with exact output.
- Browser smoke-test result documented.

## Assumptions

- Product prefers preserving background feel over pure opaque table cells.
- Current bleed-through is unacceptable only in sticky regions, not normal body cells.
- A small visual surface is acceptable even though earlier feature doc said fully transparent frozen columns were an accepted trade-off.

## Stakeholder message draft

Đề xuất không refactor pane riêng ngay. Vấn đề hiện tại là sticky transparent layer thiếu surface che content scroll phía sau. Ta xử lý bằng sticky mask/frosted surface trước để giữ nền đẹp và giảm rủi ro. Nếu browser test vẫn không đạt hoặc table cần pane behavior phức tạp hơn, lúc đó mới tách header/frozen thành layer riêng ở phase sau.

## Next steps

1. Create implementation plan from this report.
2. Implement Hybrid C with CSS-first approach.
3. Browser verify scroll behavior.
4. Update `.claude/features/shared-ui-data-grid-table.md`.

## Unresolved questions

- Exact opacity/blur value cần chỉnh bằng mắt trong browser.
- Có cần áp dụng cùng surface cho footer sum trong mọi table hay chỉ khi `showTotal` bật.
