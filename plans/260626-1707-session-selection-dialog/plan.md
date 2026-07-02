---
title: "Session Selection Dialog"
status: pending
created: 260626-1707
source: plans/reports/brainstorm-260626-1707-session-selection-popup-design-report.md
priority: P1
effort: small
blockedBy: [260625-1829-auth-session-check-hash-gate]
blocks: []
---

# Plan: Session Selection Dialog

## Overview

Thêm popup chọn phiên đăng nhập (Pro vs Normal) vào startup flow của shell. Khi user đăng nhập lần đầu trên thiết bị mới hoặc chưa có session active, app hiện dialog cho user chọn. Store actions (`activateProSession`, `useNormalSession`) và types (`AdscheckManager`) đã có sẵn — plan này chỉ cần thêm UI component và wire vào startup gate.

Approved design: [brainstorm report](../reports/brainstorm-260626-1707-session-selection-popup-design-report.md)

## Fixed Decisions

- **Trigger**: Hiện popup khi `session_actived === false` VÀ `use_normal_session === false` (setting_use_free ≠ "1")
- **Skip**: Không hỏi nếu `session_actived === true` hoặc `use_normal_session === true`
- **Full slot**: Disable Pro button (không redirect, không inline management)
- **Dismiss (X)**: Auto dùng Normal session — gọi `useNormalSession()` rồi tiếp tục
- **Retry Pro**: User cần restart app (không có real-time slot refresh)
- **Integration point**: Sau `loadEntitlements()`, trước `runHashGate()` trong `use-startup-gate.ts`
- **Shared package**: KHÔNG sửa `packages/shared-*` — tất cả logic trong `apps/shell`

## Scope

In scope:
- `SessionSelectionDialog.vue` (shell-local, `apps/shell/src/components/`)
- `use-startup-gate.ts` — thêm `checkSessionSelection()` step
- `App.vue` — mount dialog (nếu cần reactive ref)
- Feature docs update

Out of scope:
- Session management / revoke sessions
- Real-time slot tracking
- Runtime session revoke detection (State 3 — "phiên đã hết hạn")
- Route gating dựa trên session type
- Sửa `packages/shared-store` hoặc `packages/shared-types`

## Target Architecture

```text
runStartupChecks() trong use-startup-gate.ts:
  hydrateUser()
  loadEntitlements()
  [NEW] checkSessionSelection()   ← blocking, awaits user choice
  runHashGate()

checkSessionSelection():
  skip nếu !is_authenticated
  skip nếu session_actived === true
  skip nếu use_normal_session === true
  → show SessionSelectionDialog → await user choice → tiếp tục

SessionSelectionDialog.vue:
  Props: manager (AdscheckManager | null), open (boolean)
  Emits: 'select-pro', 'select-normal'
  Computed: is_max = session_used >= session_limited
  State 1 (normal): Pro button (used/total) + Normal button
  State 2 (full slot): Pro button disabled + Normal button
```

## Phases

| # | Phase | Status | Priority | Purpose |
|---|---|---|---|---|
| 1 | [Session selection UI component](phase-01-session-selection-ui-component.md) | pending | P1 | Tạo SessionSelectionDialog.vue với 2 UI states |
| 2 | [Startup gate integration](phase-02-startup-gate-integration.md) | pending | P1 | Wire dialog vào use-startup-gate.ts, update App.vue |
| 3 | [Docs and verification](phase-03-docs-and-verification.md) | pending | P2 | Cập nhật auth-flow.md, chạy typecheck/test |

## Dependency Graph

```text
260625-1829-auth-session-check-hash-gate (completed)
  → Phase 1 (UI component, standalone)
  → Phase 2 (wire vào startup gate, dùng Phase 1 component)
  → Phase 3 (docs + verify)
```

Phase 1 không depend Phase 2, có thể implement song song nhưng Phase 2 cần Phase 1 done.

## Acceptance Criteria

- [ ] Popup hiện đúng khi `session_actived === false` && `use_normal_session === false`
- [ ] Skip popup khi `session_actived === true` hoặc `use_normal_session === true`
- [ ] Pro button disabled khi `session_used >= session_limited`
- [ ] Dismiss (X) → `useNormalSession()` → startup tiếp tục không bị block
- [ ] Chọn Pro → `activateProSession()` → nếu thành công startup tiếp tục; nếu fail show lỗi inline
- [ ] Chọn Normal → `useNormalSession()` → startup tiếp tục
- [ ] Lần sau mở app: nếu `use_normal_session === true` → skip popup luôn
- [ ] `pnpm --filter @mf2/shell typecheck` pass
- [ ] Feature doc auth-flow.md updated

## Verification Commands

```bash
pnpm --filter @mf2/shell typecheck
pnpm verify:features
pnpm verify:all
```

## Risks

| Risk | Mitigation |
|---|---|
| `adscheck_manager` null khi `loadEntitlements()` fail | Guard: skip popup nếu `manager` null (user vào với Normal silently) |
| `activateProSession()` fail server side (không phải slot full) | Show inline error trong dialog, cho retry |
| `session_used`/`session_limited` undefined (API không trả) | Treat as not-full: hiện Pro button active |
| Hash gate fail nhưng session chưa chọn | Đã xử lý: checkSessionSelection chạy trước runHashGate |
