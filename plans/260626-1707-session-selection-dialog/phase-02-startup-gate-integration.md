---
phase: 2
title: "Startup Gate Integration"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Startup Gate Integration

## Overview

Wire `SessionSelectionDialog` vào startup flow: thêm `checkSessionSelection()` vào `use-startup-gate.ts` sau `loadEntitlements()` và trước `runHashGate()`. Update `App.vue` để mount dialog và truyền reactive state.

## Requirements

- Functional:
  - `checkSessionSelection()` skip nếu `!is_authenticated`
  - `checkSessionSelection()` skip nếu `is_pro_session_active === true`
  - `checkSessionSelection()` skip nếu `use_normal_session === true`
  - Nếu không skip: show dialog, await user choice (Promise-based)
  - Chọn Pro → gọi `activateProSession()` → nếu fail (server error, không phải slot full) show inline error trong dialog và cho retry
  - Chọn Normal hoặc dismiss → gọi `useNormalSession()` → resolve
  - Sau khi resolve (bất kỳ path): tiếp tục `runHashGate()`
- Non-functional:
  - `use-startup-gate.ts` không import trực tiếp Vue component — chỉ dùng reactive refs để signal dialog state
  - `App.vue` owns dialog rendering, nhận signal từ startup gate composable
  - Không thêm global event bus

## Architecture

```
use-startup-gate.ts:
  + session_dialog_open = ref(false)
  + session_dialog_resolve: ((v: 'pro' | 'normal') => void) | null

  checkSessionSelection():
    if !is_authenticated || is_pro_session_active || use_normal_session → return
    return new Promise(resolve => {
      session_dialog_resolve = resolve
      session_dialog_open = true
    })

  + async onSessionSelectPro():
    loading_pro = true
    const ok = await auth.activateProSession()
    loading_pro = false
    if (!ok) { pro_error = true; return }   // stay open, show error
    session_dialog_open = false
    session_dialog_resolve?.('pro')

  + onSessionSelectNormal():
    auth.useNormalSession()
    session_dialog_open = false
    session_dialog_resolve?.('normal')

  runStartupChecks():
    status = 'checking'
    await auth.hydrateUser()
    if (auth.is_authenticated) await auth.loadEntitlements()
    await checkSessionSelection()           // [NEW]
    await runHashGate()

  return thêm: session_dialog_open, onSessionSelectPro, onSessionSelectNormal,
               loading_pro, pro_error

App.vue:
  const { ..., session_dialog_open, onSessionSelectPro, onSessionSelectNormal,
          loading_pro, pro_error } = useStartupGate()

  <SessionSelectionDialog
    :open="session_dialog_open"
    :manager="auth.adscheck_manager"
    :loading_pro="loading_pro"
    :pro_error="pro_error"
    @select-pro="onSessionSelectPro"
    @select-normal="onSessionSelectNormal"
  />
```

**Note**: `loading_pro` và `pro_error` cần pass xuống component (Phase 1 component có thể cần thêm props nếu chưa có — adjust Phase 1 component nếu cần).

## Related Code Files

- Modify: `apps/shell/src/composables/use-startup-gate.ts`
- Modify: `apps/shell/src/App.vue`
- Modify (có thể): `apps/shell/src/components/SessionSelectionDialog.vue` — thêm `loading_pro` và `pro_error` props nếu Phase 1 chưa có
- Read (trước khi sửa):
  - `apps/shell/src/composables/use-startup-gate.ts` (đã read trong session)
  - `apps/shell/src/App.vue` (đã read trong session)
  - `packages/shared-store/src/auth-store.ts:137-164` — `activateProSession`, `useNormalSession`

## Implementation Steps

1. Sửa `use-startup-gate.ts`:
   - Thêm refs: `session_dialog_open`, `loading_pro`, `pro_error`, closure ref `session_dialog_resolve`
   - Thêm `checkSessionSelection()` async function với Promise-based blocking
   - Thêm `onSessionSelectPro()` — gọi `activateProSession()`, handle error
   - Thêm `onSessionSelectNormal()` — gọi `useNormalSession()`, resolve
   - Inject vào `runStartupChecks()` sau `loadEntitlements()`, trước `runHashGate()`
   - Export thêm refs và handlers từ `useStartupGate()`
2. Sửa `App.vue`:
   - Import `SessionSelectionDialog`
   - Destructure thêm refs/handlers từ `useStartupGate()`
   - Import `useAuthStore` để lấy `adscheck_manager`
   - Mount `<SessionSelectionDialog>` trong template với đúng props/emits
3. Nếu `SessionSelectionDialog.vue` cần thêm `loading_pro`/`pro_error` props → sửa Phase 1 component.

## Success Criteria

- [ ] Startup flow với user mới (`session_actived=false`, `use_normal_session=false`): dialog hiện, app chờ
- [ ] Chọn Normal → `useNormalSession()` được gọi, `setting_use_free="1"` trong localStorage → hash gate chạy
- [ ] Chọn Pro (thành công) → `activateProSession()` trả `true` → dialog đóng → hash gate chạy
- [ ] Chọn Pro (fail server) → dialog vẫn open, show error message → user có thể retry hoặc chọn Normal
- [ ] Dismiss (X) → `useNormalSession()` được gọi → hash gate chạy
- [ ] Lần 2 mở app với `use_normal_session=true` → `checkSessionSelection()` skip, dialog không hiện
- [ ] `session_actived=true` → `checkSessionSelection()` skip
- [ ] `!is_authenticated` → `checkSessionSelection()` skip
- [ ] `pnpm --filter @mf2/shell typecheck` pass

## Risk Assessment

- **Promise không resolve**: Nếu component unmount trước khi user chọn → promise leak. Mitigation: `onSessionSelectNormal()` gọi trong `onUnmounted` guard hoặc accept risk vì startup gate không unmount trước khi app ready.
- **`adscheck_manager` null** (entitlements fail): Dialog vẫn có thể show — component tự guard với `manager=null` (Phase 1). Cân nhắc: nếu `entitlements_error=true` thì skip session check (user sẽ vào với state unknown).
