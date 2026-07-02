---
phase: 3
title: "Docs and Verification"
status: pending
priority: P2
dependencies: [1, 2]
---

# Phase 3: Docs and Verification

## Overview

Cập nhật feature doc `auth-flow.md` để reflect startup flow mới (thêm session selection step), chạy typecheck và verify:features để đảm bảo không có regression.

## Requirements

- Functional:
  - `auth-flow.md` mô tả đúng flow mới: `hydrateUser → loadEntitlements → checkSessionSelection → runHashGate`
  - `auth-flow.md` ghi rõ trigger condition, skip conditions, và full-slot behavior
  - Files list trong feature doc phản ánh `SessionSelectionDialog.vue` mới
- Non-functional:
  - Không sửa code trong phase này — chỉ docs và verify
  - Không tạo docs mới ngoài việc update file hiện có

## Related Code Files

- Modify: `.claude/features/auth-flow.md`
- Read (verify): `apps/shell/src/composables/use-startup-gate.ts` — confirm flow đúng với doc
- Read (verify): `apps/shell/src/components/SessionSelectionDialog.vue` — confirm file tồn tại

## Implementation Steps

1. Đọc lại `apps/shell/src/composables/use-startup-gate.ts` sau Phase 2 để verify actual flow.
2. Update `.claude/features/auth-flow.md`:
   - Thêm bước 9 vào **Flow** section: `checkSessionSelection()` sau `loadEntitlements()`
   - Thêm trigger/skip conditions vào **Decisions / Gotchas**
   - Thêm `SessionSelectionDialog.vue` vào **Files** list
   - Cập nhật **APIs used**: `POST /ads-check/sessions/active` — mô tả context (startup dialog)
3. Chạy verification commands.

## Docs Delta — auth-flow.md

**Flow section** — thêm sau bước 8 (loadEntitlements):
```
9. Nếu authenticated, shell kiểm tra session selection: nếu `session_actived=false`
   và `use_normal_session=false`, hiện `SessionSelectionDialog` blocking.
   User chọn Pro → `POST /ads-check/sessions/active`; chọn Normal hoặc dismiss →
   `useNormalSession()` (persists localStorage). Startup tiếp tục sau khi dialog resolve.
10. Shell chạy SMIT Connect check-hash gate.
```

**Files section** — thêm:
```
- apps/shell/src/components/SessionSelectionDialog.vue — startup session selection dialog,
  2 UI states: normal (slots available) và full slot (Pro button disabled).
```

**Decisions / Gotchas** — thêm:
```
- Session selection dialog blocks startup between loadEntitlements and hash gate.
  Skip conditions: !is_authenticated, session_actived=true, use_normal_session=true.
- Full slot (session_used >= session_limited): Pro button disabled, user buộc chọn Normal.
  Slot refresh chỉ xảy ra khi restart app.
- Dialog dismiss (X) tương đương chọn Normal — gọi useNormalSession() để persist.
- Nếu entitlements_error=true (loadEntitlements fail), checkSessionSelection skip —
  manager null, không đủ data để show dialog.
```

## Success Criteria

- [ ] `auth-flow.md` có đủ 10 bước flow phản ánh đúng implementation
- [ ] `SessionSelectionDialog.vue` có trong Files list của feature doc
- [ ] Trigger/skip/full-slot behavior documented trong Decisions
- [ ] `pnpm --filter @mf2/shell typecheck` pass (không có TS error mới)
- [ ] `pnpm verify:features` pass
- [ ] `pnpm verify:all` pass hoặc failures là pre-existing (không phải do changes này)

## Verification Commands

```bash
pnpm --filter @mf2/shell typecheck
pnpm verify:features
pnpm verify:all
```

## Risk Assessment

- Thấp. Phase này chỉ docs + verify, không thay đổi code logic.
- Nếu `pnpm verify:all` fail vì unrelated issues: report pre-existing failures rõ ràng, không fix ngoài scope.
