# Brainstorm: Session Selection Popup Design
**Date:** 2026-06-26 | **Branch:** smit-khoa/feat-system-starter

---

## Problem Statement

Khi user đăng nhập trên thiết bị mới (hoặc bị revoke session), app cần hỏi user muốn dùng **phiên Pro** (tốn 1 slot) hay **phiên thường** (miễn phí). Hiện tại v7 có đủ store logic nhưng **chưa có UI** và **chưa integrate vào startup flow**.

---

## Context — Hiện trạng v7

| Thành phần | Trạng thái |
|---|---|
| `activateProSession()` / `useNormalSession()` | Có trong `auth-store.ts:137-164` nhưng chưa có UI gọi |
| `session_actived`, `session_limited`, `session_used` | Có trong `AdscheckManager` (shared-types:31-40) |
| localStorage key `setting_use_free` | Đọc/ghi trong store, chưa check trong startup gate |
| Session selection popup | **Chưa tồn tại** |
| Startup flow | `hydrateUser → loadEntitlements → hashGate` — không có bước session check |

---

## Reference — V6 Logic

**Trigger (v6 `SessionUpgrade.vue:173-178`):**
```js
// Emitted từ LoadInsightData.js khi dùng feature mà !session_actived
if (e.first_check && localStorage.setting_use_free == 1) return  // skip nếu đã chọn Normal
this.show = true
```

**3 UI states trong v6:**
| State | Điều kiện | UI |
|---|---|---|
| New session | `!is_logout && !is_max` | Pro button `(used/total)` + Normal button |
| Session bị revoke | `is_logout && !is_max` | Khác title, cùng 2 button |
| Full slot | `session_used >= session_limited` | "Mua thêm" button + Normal button |

---

## Quyết định thiết kế đã chốt

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Full slot UX | **Disable Pro button** | Đơn giản, không cần API revoke sessions |
| Integration point | **Sau `loadEntitlements()`, trước `runHashGate()`** | Cần session type trước khi validate extension |
| Re-ask on repeat visit | **Không hỏi lại nếu `setting_use_free` = "1" (Normal)** | Respect user choice |
| Dismissible | **Có thể đóng → auto dùng Normal session** | UX thoải mái hơn |
| Sau full slot + chọn Normal | **Restart app để thử lại** | Đơn giản, không cần real-time tracking |

---

## Trigger Condition (v7 design)

```
loadEntitlements() thành công
→ !is_authenticated?                     → skip
→ session_actived === true?              → skip (đang active)
→ setting_use_free === "1"?             → skip (đã chọn Normal trước đó)
→ Hiện SessionSelectionDialog (blocking)
```

---

## Integration Point

Thêm bước `checkSessionSelection()` vào `use-startup-gate.ts` sau `loadEntitlements()` và trước `runHashGate()`:

```
hydrateUser() → loadEntitlements() → [NEW] checkSessionSelection() → runHashGate()
```

**Lý do vị trí này:** Session type có thể ảnh hưởng tới tính năng hash gate cần kiểm tra.

---

## Popup UI States

### State 1 — Thiết bị mới (session_actived = false, !is_max)
Ảnh tham khảo: design ảnh của sếp.
```
Title:   "Đăng nhập trên thiết bị mới"
Body:    "Để sử dụng các tính năng nâng cao hãy chọn sử dụng
          phiên Pro hoặc chọn phiên đăng nhập thường..."
Button1: [primary]  "Sử dụng phiên đăng nhập PRO (1/5)"    ← session_used/session_limited
Button2: [outline]  "Sử dụng phiên đăng nhập thường"
Info:    "Bạn còn 4 phiên đăng nhập Pro"                   ← session_limited - session_used
Close:   [X] → auto dùng Normal session
```

### State 2 — Hết slot Pro (session_used >= session_limited)
```
Title:   "Đăng nhập trên thiết bị mới"
Body:    (giống)
Button1: [disabled] "Sử dụng phiên đăng nhập PRO (5/5)"
         tooltip:   "Đã hết phiên Pro, cần restart app để thử lại"
Button2: [outline]  "Sử dụng phiên đăng nhập thường"
Info:    "Bạn đã sử dụng hết 5 phiên đăng nhập Pro"
Close:   [X] → auto dùng Normal session
```

### State 3 — Session bị revoke runtime
Phát hiện khi: `session_actived` từ `true → false` (poll/reload).
```
Title:   "Phiên đăng nhập đã hết hạn"
(cùng 2 button, cùng logic)
```

> **Note:** State 3 xử lý runtime, ngoài scope startup gate. Có thể dùng lại cùng component với prop `is_expired`.

---

## Files cần tạo/sửa

| File | Action | Nội dung |
|---|---|---|
| `apps/shell/src/components/SessionSelectionDialog.vue` | **Tạo mới** | Dialog với 2 UI states (normal + full slot) |
| `apps/shell/src/composables/use-startup-gate.ts` | **Sửa** | Thêm `checkSessionSelection()` step |
| `apps/shell/src/App.vue` | **Sửa** | Mount `SessionSelectionDialog` |
| `.claude/features/auth-flow.md` | **Sửa** | Cập nhật startup flow mới |

---

## Props / Emits của `SessionSelectionDialog`

```typescript
// Props
interface Props {
  manager: AdscheckManager  // session_actived, session_limited, session_used
  is_expired?: boolean       // State 3: session revoke runtime
}

// Emits
type Emits = {
  'select-pro': []
  'select-normal': []
}
// Đóng dialog (X) → emit 'select-normal'
```

---

## Risks

1. **Race condition**: `loadEntitlements()` fail → `manager` null → phải guard `manager?.session_limited`
2. **session_used increment**: Store tự increment local sau activate thành công — không phải từ server response. Nếu server có discrepancy thì counter lệch.
3. **localStorage key conflict**: v6 dùng `setting_use_free`, v7 dùng `NORMAL_SESSION_KEY = "setting_use_free"` — cùng key, OK để backward compat.

---

## Success Criteria

- [ ] Popup hiện đúng khi `session_actived === false` và `setting_use_free !== "1"`
- [ ] Skip popup khi `session_actived === true` hoặc `setting_use_free === "1"`
- [ ] Pro button disabled khi `session_used >= session_limited`
- [ ] Đóng popup (X) → dùng Normal session, không block startup
- [ ] Sau chọn Pro/Normal → startup tiếp tục `runHashGate()`
- [ ] Không ask lại nếu đã chọn Normal (localStorage persisted)

---

## Next Steps

→ Tạo plan để implement `SessionSelectionDialog` + integrate vào startup gate.
