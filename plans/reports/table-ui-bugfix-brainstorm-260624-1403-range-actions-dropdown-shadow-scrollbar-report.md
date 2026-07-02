---
type: brainstorm-report
topic: shared-ui-table-range-actions-dropdown-shadow-scrollbar
created_at: 2026-06-24 14:03 Asia/Saigon
status: approved-for-plan
repo: /Volumes/Workspace/smit/worktree/client/feat-custom-table
---

# Brainstorm — Shared UI Table Range Actions / Dropdown / Frozen Shadow / Scrollbar

## Summary

Sếp đang sửa data-grid table và gặp 4 vấn đề:

1. `range-actions` đang đứng như fixed sai vị trí; đúng là bám góc dưới-phải vùng bôi đen và clamp vào mép visible của bảng khi vùng copy scroll khỏi khung.
2. Freeze/unfreeze column làm dropdown đóng nhưng icon option vẫn active.
3. Scroll ngang mất boundary / box-shadow ở mép frozen columns.
4. Muốn nghiên cứu fake scrollbar ngang bắt đầu từ frozen area, có cân nhắc shadcn scrollbar.

Quyết định đã chốt:

- Làm đợt này: fix 3 bug rõ ràng (`range-actions`, dropdown active, frozen boundary shadow).
- Tách riêng: fake scrollbar chỉ research + ghi hướng `overlay synced scrollbar`, chưa implement trong bugfix plan.
- Không dùng shadcn ScrollArea cho body chính trong vòng này vì scroll body hiện là source-of-truth cho virtualization/range/header sync.

## Codebase findings

| Area | Evidence | Note |
|---|---|---|
| Stack | `package.json`, `README.md` | Vue 3, TypeScript, Tailwind v4, shadcn-vue/reka-ui, Module Federation 2.0. |
| Shared table | `packages/shared-ui/src/components/ui/table/Table.vue` | Table core owns pane split, range-select, frozen columns, dropdown, resize, scroll sync. |
| Range selection | `packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts` | `actionsAnchor` computes copy/settings button position. |
| Table CSS | `packages/shared-ui/src/components/ui/table/style.css` | `.range-actions`, pane split classes, scrollbar styling, frozen/header styles. |
| Feature doc | `.claude/features/shared-ui-data-grid-table.md` | Must update after code changes. |
| Existing plan/report | `plans/260624-1132-table-sticky-surface-hybrid/`, `plans/reports/table-sticky-transparency-260624-1132-hybrid-sticky-surface-report.md` | Recent pane-split / transparency work changed coordinate and shadow assumptions. |

## Problem statement

### Underlying problem

Recent full pane split removed sticky overlap, but several interaction/visual details still assume the old single scroll container model.

### Root causes by symptom

| Symptom | Likely cause |
|---|---|
| `range-actions` fixed at wrong place | Anchor is computed in content space, but rendered at `.table-pane-root`; `Table.vue` then applies extra `50 + top - scrollTop` and `left - scrollLeft`, causing double/incorrect coordinate conversion after pane split. |
| Option icon still active after freeze/unfreeze | `colOpenOption` relies on `DropdownMenu @update:open`; freeze/unfreeze moves column between panes and can leave field state active after menu unmount/close. |
| Frozen shadow lost | Template still applies `last-frozen-column/show-shadow`, but pane-split CSS no longer gives a clear boundary at the frozen/scroll pane seam. |
| Scrollbar starts after frozen area | Native scrollbar belongs to `.table-pane-scroll-body`, whose width starts after frozen pane. CSS cannot make native scrollbar truly start from frozen area without changing/faking the scroll surface. |

## Requirements

### Expected output

- A `/ck:plan` implementation plan for 3 bugfixes in shared-ui table.
- Plan must include scrollbar research outcome, but not implement fake scrollbar yet.

### Acceptance criteria

- Bôi đen nhiều cell → Copy/Settings buttons appear at bottom-right of selected range.
- Scroll dọc/ngang until selected corner leaves visible area → buttons clamp to table visible edge, not fixed at stale position.
- Freeze/unfreeze from header dropdown → menu closes and 3-dot trigger is no longer active.
- Scroll horizontally with frozen columns → frozen/scroll boundary shows visible shadow/edge.
- No public Table API change.
- Feature doc updated.
- Verification: run focused shared-ui tests plus `pnpm verify:all` when feasible; report failures exactly.

### Scope boundary

In scope:

- `packages/shared-ui/src/components/ui/table/Table.vue`
- `packages/shared-ui/src/components/ui/table/composables/use-table-range-selection.ts`
- `packages/shared-ui/src/components/ui/table/style.css`
- `.claude/features/shared-ui-data-grid-table.md`

Out of scope:

- Implement fake scrollbar.
- Replace native scroll with shadcn ScrollArea.
- Change public props/events/import paths.
- Edit `apps/*` in same PR/commit as shared-ui change.
- Broad table refactor unrelated to these bugs.

### Non-negotiable constraints

- Shared package change must be additive / non-breaking.
- Keep changes surgical; no new dependency.
- Preserve virtualization and scroll body as source-of-truth.
- Keep range-select and checkbox range behavior isolated.
- Follow feature-doc update rule.

## Evaluated approaches

### Approach A — Surgical bugfixes + scrollbar research only

**Description**

Fix 3 confirmed issues and document fake scrollbar as follow-up.

**Pros**

- Lowest risk.
- Matches current user decision.
- Keeps shared-ui singleton change small.
- Easier browser verification.

**Cons**

- Scrollbar visual remains as-is for now.
- Requires another design/plan if fake scrollbar becomes required.

**Verdict**

Recommended and approved.

### Approach B — Fix bugs and implement overlay fake scrollbar now

**Description**

Fix 3 bugs and add custom scrollbar overlay in same round.

**Pros**

- Solves all listed visual requests in one pass.
- Can match screenshot expectation sooner.

**Cons**

- Higher risk: JS sync, pointer dragging, native scrollbar hiding, virtualization scroll source.
- More browser cases.
- Not surgical for shared-ui singleton.

**Verdict**

Rejected for this round. Keep as follow-up.

### Approach C — Replace scroll body with shadcn/reka ScrollArea

**Description**

Use design-system ScrollArea-style primitive for table scroll.

**Pros**

- Theoretically aligns with shadcn patterns.
- Gives custom scrollbar styling surface.

**Cons**

- Risky because `.table-pane-scroll-body` is currently the real scroll container for `scrollTop`, `scrollLeft`, virtualization, header/footer transform, auto-scroll, and range geometry.
- Could break wheel/trackpad behavior and coordinate math.
- Does not naturally make scrollbar start from frozen pane unless layout changes anyway.

**Verdict**

Not recommended.

## Recommended design

### 1. Range actions coordinate correction

Current behavior likely double-converts coordinates:

- `actionsAnchor` computes content-space `top/left`.
- `Table.vue` converts again using `50 + top - scrollTop`, `left - scrollLeft`.
- `.range-actions` is rendered under `.table-pane-root`, not inside scroll content.

Recommended implementation:

- Make `actionsAnchor` return visual coordinates relative to `.table-pane-root`.
- Clamp in visual space:
  - `minTop = headerHeight + inset`
  - `maxTop = headerHeight + containerHeight - actionsHeight - inset`
  - frozen-only range clamps inside `[inset, frozenWidth - actionsWidth - inset]`
  - non-frozen/mixed clamps inside visible table viewport.
- In `Table.vue`, bind `top: anchor.top`, `left: anchor.left` directly.
- Keep single-cell hide behavior and hide-while-dragging behavior unchanged.

### 2. Dropdown active reset

Recommended implementation:

- Clear `colOpenOption.value = null` inside `toggleFreeze(field)` before/after column mutation.
- Consider doing same in sort click handlers only if the active-state bug reproduces there too; otherwise avoid extra changes.

### 3. Frozen boundary shadow for pane split

Recommended implementation:

- Add a root class or pane-level state tied to `isScrollingHorizontally` / `scrollLeft > 0`.
- Draw seam at right edge of frozen pane, not via old sticky overlap assumption.
- Prefer one CSS rule path for header/body/footer consistency.
- Use subtle right border + shadow tuned for current pale green table surface.

Candidate behavior:

- No shadow when `scrollLeft === 0` if no hidden content behind frozen pane.
- Shadow appears when `scrollLeft > 0`.

### 4. Fake scrollbar follow-up direction

Recommended follow-up: `overlay synced scrollbar`.

- Keep `.table-pane-scroll-body` as the real native scroller.
- Render an overlay scrollbar spanning the visual table width from the frozen edge/left table edge as desired.
- Sync thumb width/position from:
  - `clientWidth`
  - `scrollWidth`
  - `scrollLeft`
  - visual track width including frozen width.
- Dragging thumb sets `dataGridMain.scrollLeft`.
- Native scrollbar can be hidden or visually deemphasized only after overlay is reliable.

Do not use shadcn ScrollArea as the first implementation path.

## Risks

| Risk | Mitigation |
|---|---|
| Range action still off for mixed frozen/non-frozen range | Browser test frozen-only, non-frozen-only, mixed range. |
| Shadow too strong/weak on workspace background | Tune with screenshot/browser; use CSS vars/local rule. |
| Dropdown active bug caused by reka timing beyond freeze | Reset local state explicitly in action handler; verify click item path. |
| Shared-ui change affects all consumers | No API changes; run shared-ui tests + feature/doc guards. |

## Validation plan

Focused commands:

```bash
pnpm --filter @mf2/shared-ui test
pnpm verify:all
```

Manual browser checklist:

1. Range-select non-frozen cells, scroll vertically, verify actions clamp to visible bottom/right.
2. Range-select frozen-only cells, scroll horizontally, verify actions stay in frozen band.
3. Range-select mixed frozen + non-frozen cells, scroll both axes, verify actions still near bottom-right visible selection/viewport.
4. Freeze a column from dropdown, verify icon not active after menu closes.
5. Unfreeze a column from dropdown, verify icon not active after menu closes.
6. Scroll horizontally with frozen columns, verify boundary/shadow visible.
7. Confirm copy/settings buttons still clickable and do not clear selection before action.

## Next steps

1. Invoke `/ck:plan` with this report.
2. Plan 3 small implementation phases.
3. Implement only after plan approval.
4. Update `.claude/features/shared-ui-data-grid-table.md` after code changes.

## Unresolved questions

- Exact shadow opacity/color needs visual tuning in browser.
- Fake scrollbar exact visual spec should be decided in its own follow-up after these 3 bugs are stable.
