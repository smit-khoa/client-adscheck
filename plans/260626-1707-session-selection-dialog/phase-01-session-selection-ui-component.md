---
phase: 1
title: "Session Selection UI Component"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Session Selection UI Component

## Overview

Tạo `SessionSelectionDialog.vue` — shell-local dialog với 2 UI states: normal (slots còn) và full slot (disabled Pro button). Không sửa shared packages. Component standalone, chưa wire vào startup flow.

## Requirements

- Functional:
  - Hiển thị số slot `session_used / session_limited` trên Pro button
  - Khi `session_used >= session_limited`: disable Pro button, đổi info text
  - Emit `select-pro` khi click Pro button (nếu không disabled)
  - Emit `select-normal` khi click Normal button
  - Emit `select-normal` khi click X hoặc dismiss
  - Hiện loading state trên Pro button khi đang gọi `activateProSession()`
  - Hiện error message inline nếu `activateProSession()` trả về `false`
- Non-functional:
  - Dùng `@mf2/shared-ui` components (Dialog/Modal nếu có), không hand-roll
  - Không import `packages/shared-store` trực tiếp — nhận data qua props
  - TypeScript strict

## Architecture

```
SessionSelectionDialog.vue
  Props:
    open: boolean
    manager: AdscheckManager | null     // session_actived, session_used, session_limited
  Emits:
    select-pro  []    // parent gọi activateProSession() và xử lý kết quả
    select-normal []  // parent gọi useNormalSession()

  Computed:
    is_max  = (manager?.session_used ?? 0) >= (manager?.session_limited ?? Infinity)
    slots_used    = manager?.session_used ?? 0
    slots_total   = manager?.session_limited ?? '?'
    slots_remaining = is_max ? 0 : (slots_total - slots_used)

  Template:
    Dialog wrapper (open prop controls visibility, no backdrop dismiss)
    [X] button → emit select-normal
    Title: "Đăng nhập trên thiết bị mới"
    Body text
    Button primary: "Sử dụng phiên đăng nhập PRO ({{ slots_used }}/{{ slots_total }})"
      :disabled="is_max"
    Button outline: "Sử dụng phiên đăng nhập thường"
    Info text:
      if !is_max: "Bạn còn {{ slots_remaining }} phiên đăng nhập Pro"
      if is_max:  "Bạn đã sử dụng hết {{ slots_total }} phiên đăng nhập Pro"
```

**Note về loading/error**: Phase 1 chỉ emit events. Parent (Phase 2) xử lý loading/error state và truyền lại nếu cần. Giữ component stateless — dễ test hơn.

## Related Code Files

- Create: `apps/shell/src/components/SessionSelectionDialog.vue`
- Read (trước khi tạo):
  - `.claude/components-catalog.md` — xem Dialog/Modal component có sẵn trong shared-ui
  - `packages/shared-types/src/index.ts` — `AdscheckManager` type definition
  - `apps/shell/src/components/StartupGateError.vue` — tham khảo shell component pattern

## Implementation Steps

1. Đọc `.claude/components-catalog.md` để xác định Dialog component trong shared-ui.
2. Đọc `packages/shared-types/src/index.ts:31-40` để lấy `AdscheckManager` type.
3. Tạo `apps/shell/src/components/SessionSelectionDialog.vue`:
   - `<script setup lang="ts">` với props/emits typed
   - Computed `is_max`, `slots_used`, `slots_total`, `slots_remaining`
   - Template với 2 states (normal + full slot)
   - Dùng shared-ui Dialog/Modal nếu có, fallback là native `<dialog>` hoặc conditional render
4. Không thêm store imports — parent sẽ pass `manager` prop.

## Success Criteria

- [ ] Component render đúng với `manager.session_used=1, session_limited=5`: Pro button "(1/5)", info "Bạn còn 4 phiên"
- [ ] Component render đúng với `manager.session_used=5, session_limited=5`: Pro button disabled "(5/5)", info "hết 5 phiên"
- [ ] Click X → emit `select-normal`
- [ ] Click Normal button → emit `select-normal`
- [ ] Click Pro button (không disabled) → emit `select-pro`
- [ ] `manager=null` → safe render (treat as not-full, slots unknown)
- [ ] `pnpm --filter @mf2/shell typecheck` pass

## Risk Assessment

- **Shared-ui Dialog**: Nếu không có sẵn Dialog component → dùng conditional `v-show` + fixed overlay CSS đơn giản. Không block.
- **`manager` null guard**: `manager?.session_used ?? 0` và `manager?.session_limited ?? Infinity` đảm bảo safe defaults.
