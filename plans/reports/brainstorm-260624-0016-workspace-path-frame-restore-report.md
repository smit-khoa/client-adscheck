---
type: brainstorm-report
topic: workspace-path-frame-restore
status: approved
created: 2026-06-24 00:16 Asia/Saigon
repo: /Volumes/Workspace/smit/worktree/client/feat-rebase
---

# Brainstorm Report — Workspace Path Frame Restore

## Summary

Sếp muốn khôi phục giao diện tab được vẽ bằng SVG path sau khi logic thật của `adaccounts` được đưa vào workspace tabs.

Quyết định đã chốt:

- Tách frame/path tab thành component dùng chung trong `packages/shared-ui`.
- Giữ `apps/shell/src/components/WorkspaceContent.vue` làm placeholder hiện tại, chưa chuyển sang component mới trong đợt này.
- Tích hợp component shared-ui mới vào `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue`.
- Giữ slot/data flow hiện tại trong `AdAccountsWorkspace.vue`: đổi tab thì đổi bảng và tool tương ứng.
- Chia boundary shared/app rõ ràng vì repo cấm mix `packages/shared-*` và `apps/*` trong cùng commit/PR.

## Problem statement and requirements

### Problem-first diagnosis

Logic app đã được port vào remote `adaccounts`, nhưng frame UI path ban đầu nằm ở shell placeholder. Khi remote render logic thật, `WorkspaceTabFrame.vue` dùng frame gradient thường nên mất giao diện path Sếp đã thiết kế.

### Underlying problem

UI frame và business logic đang nằm ở 2 nơi khác nhau:

| Area | File | Current role |
|---|---|---|
| Shell placeholder | `apps/shell/src/components/WorkspaceContent.vue` | Có SVG path tab, toolbar, panel open state; chỉ render placeholder |
| Adaccounts remote | `apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue` | Có slot thật cho table/tool; mất SVG path frame |
| Adaccounts logic owner | `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue` | Điều phối `TKQC/BM/Page/Pixel` table + function panel |

### Expected output

- `/app/adaccounts` hiển thị frame tab path giống ý tưởng trong `WorkspaceContent.vue`.
- Table thật render bên trong content của active tab.
- Function panel 1 đổi theo active tab.
- Function panel 2 giữ placeholder/slot hiện tại.
- Toolbar trong tab được giữ để sau này thêm action cho bảng.
- Panel 1/2 có state đóng/mở theo prototype shell.

### Acceptance criteria

- Tab labels vẫn là `TKQC`, `BM`, `Page`, `Pixel`.
- Chuyển tab đổi main table:
  - `adaccounts` -> `TkqcTableView`
  - `businesses` -> `BmTableView`
  - `page` -> `PageTableView`
  - `pixel` -> `PixelTableView`
- Chuyển tab đổi Function panel 1:
  - `adaccounts` -> `TkqcFunctionPanel`
  - `businesses` -> `BmFunctionPanel`
  - `page` -> `PageFunctionPanel`
  - `pixel` -> `PixelFunctionPanel`
- Không đổi API/composable/store domain hiện có.
- Không copy state placeholder từ shell làm mất active tab thật.
- `pnpm --filter @mf2/shared-ui typecheck` pass.
- `pnpm --filter @mf2/adaccounts typecheck` pass.
- `pnpm --filter @mf2/adaccounts build` pass hoặc chỉ còn warning cũ.
- `pnpm verify:catalog` pass.
- `pnpm verify:features` pass.
- `pnpm verify:all` pass when shared/app changes are properly separated for staged checks.

### Scope boundary

In scope:

- Add shared-ui workspace path frame component.
- Wire adaccounts workspace frame to use it.
- Update component catalog and feature docs.
- Keep shell placeholder as-is, except no required integration.

Out of scope:

- Moving shell `WorkspaceContent.vue` to shared component now.
- New table toolbar actions.
- New Pixel data/API.
- Changing domain data loading/tool behavior.
- Breaking `packages/shared-*` public APIs.

## Scout findings

| Finding | Evidence |
|---|---|
| Project stack | Vue 3.5, TypeScript strict, Pinia, Rspack, Module Federation 2.0, Tailwind v4, pnpm workspaces |
| Path UI source | `apps/shell/src/components/WorkspaceContent.vue` has `tabContentPath`, `ResizeObserver`, toolbar, panel open refs |
| Logic UI owner | `apps/adaccounts/src/features/workspace/pages/AdAccountsWorkspace.vue` wires table/tool slots by active tab |
| Current remote frame gap | `WorkspaceTabFrame.vue` renders a simple rounded section instead of SVG path frame |
| Shared-ui pattern | Components live under `packages/shared-ui/src/components/ui/<group>/` with narrow entrypoints like `form-controls.ts`, `card.ts` |
| Repo constraint | Project CLAUDE.md requires shared changes additive and not mixed with app changes in one commit/PR |

## Evaluated approaches

### Approach A — Copy shell `WorkspaceContent.vue` into remote

**Pros**

- Fastest path to restore visuals.
- Minimal design work.

**Cons**

- Copies placeholder state and fake counts unless heavily edited.
- Duplicates shell UI logic.
- Easy to break real slot/data flow.
- Harder to maintain when path math changes.

**Verdict:** Rejected. Too brittle.

### Approach B — Port path logic directly into `WorkspaceTabFrame.vue`

**Pros**

- Smallest code movement inside app.
- Keeps existing `AdAccountsWorkspace.vue` slots.
- Low implementation overhead.

**Cons**

- `WorkspaceTabFrame.vue` becomes large: path math + toolbar + panels + tab slots.
- Not actually reusable beyond adaccounts.
- Future shell/remote alignment remains manual.

**Verdict:** Viable fallback, but not the selected direction.

### Approach C — Add shared-ui `WorkspacePathFrame`, then integrate in adaccounts

**Pros**

- Long-term reusable frame component.
- Keeps path math, toolbar, panel shell separate from business logic.
- Lets `WorkspaceTabFrame.vue` stay as app adapter.
- Additive shared-ui change; no breaking public API.

**Cons**

- Must respect shared/app split.
- Requires catalog docs update.
- Slightly more setup than app-local component.

**Verdict:** Selected.

## Final recommended solution

Create a shared-ui frame component:

```text
packages/shared-ui/src/components/ui/workspace-path-frame/
  WorkspacePathFrame.vue
  index.ts

packages/shared-ui/src/workspace-path-frame.ts
```

Expose via narrow entrypoint:

```ts
import { WorkspacePathFrame } from '@mf2/shared-ui/workspace-path-frame';
```

Then update adaccounts frame:

```text
apps/adaccounts/src/features/workspace/components/WorkspaceTabFrame.vue
  -> imports WorkspacePathFrame
  -> keeps Tabs model/emit
  -> renders TabsList/TabsTrigger through frame slots
  -> renders current main/panel slots inside frame
```

Keep `AdAccountsWorkspace.vue` as the domain adapter. It should continue owning which table/tool appears for each active tab.

## Implementation considerations

### Component API sketch

The shared component should not know business tab names. Suggested slots:

- `tabs` — caller renders `TabsList`/`TabsTrigger`, with `data-tab-value` on each trigger.
- `toolbar` — default toolbar provided, caller can override later.
- `main` — active tab content area.
- `panel-one` — right panel 1 content.
- `panel-two` — right panel 2 content.

Suggested props:

- `activeTab: string`
- `firstTabValue?: string`
- `panelOneOpen?: boolean`
- `panelTwoOpen?: boolean`
- optional labels for aria.

Suggested emits:

- `update:panelOneOpen`
- `update:panelTwoOpen`

Keep panel open state simple. If uncontrolled support adds complexity, prefer controlled props owned by `WorkspaceTabFrame.vue`.

### Path behavior

Port from `WorkspaceContent.vue`:

- `tabContentPath`
- `tabShapeViewBox`
- `measureTabShape`
- `scheduleMeasureTabShape`
- `ResizeObserver`
- `watch(activeTab, scheduleMeasureTabShape)`

Do not port shell fake data:

- shell `tabs` array counts
- shell `activeTab` ref
- placeholder main content
- shell-specific route assumptions

### Boundary split

Because `packages/shared-*` and `apps/*` must not mix in one PR/commit:

1. Shared-ui boundary:
   - add `WorkspacePathFrame`
   - export narrow entrypoint
   - update `.claude/components-catalog.md`
   - verify catalog/shared-ui
2. App boundary:
   - update adaccounts `WorkspaceTabFrame.vue`
   - update feature docs
   - verify adaccounts/features

If implemented in one working tree for convenience, stage/commit in two focused commits.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Shared component accidentally knows adaccounts domain | Use generic `string` active tab and slots; no TKQC/BM labels inside shared-ui |
| Path measurement breaks because triggers are slotted | Require `data-tab-value` on caller trigger; document in catalog |
| Shared/app mixed commit fails guard | Plan explicit shared phase then app phase; commit separately |
| Toolbar buttons need app actions later | Provide default toolbar now and `toolbar` slot override for future actions |
| Panel close state conflicts with resizable layout | Keep panel open state in frame/adapter and conditionally render panels like shell prototype |
| Existing table/tool logic regresses | Do not touch domain composables/stores/API; only frame presentation changes |

## Success metrics and validation criteria

Automated:

```bash
pnpm --filter @mf2/shared-ui typecheck
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
pnpm verify:catalog
pnpm verify:features
pnpm verify:all
```

Manual smoke:

- Open `/app/adaccounts`.
- Confirm tab frame has SVG path shape.
- Confirm toolbar is visible.
- Confirm panel 1/2 open/close behavior matches intended prototype shape.
- Switch TKQC/BM/Page/Pixel.
- Confirm each tab renders correct table and Function panel 1.
- Confirm Pixel remains truthful empty, no API call/fake data.

## Next steps

Recommended next command: `/ck:plan --tdd` using this report as context.

Why TDD/default verification mode:

- This is behavior-preserving refactor across shared-ui and app integration.
- Tests/render coverage is limited, so plan must force narrow typecheck/build/manual-smoke gates per phase.
- Shared/app boundary needs explicit phase control.

## Unresolved questions

- Exact toolbar action set is deferred. Sếp said toolbar/nút trong đó will receive table actions later.
- Whether shell placeholder should eventually migrate to the shared component is deferred. Current decision: keep shell placeholder unchanged.
