---
title: "Module Architecture Standardization + AI Memory Layer"
status: pending
created: 2026-06-04
source: brainstorm
design_doc: docs/module-architecture-and-ai-memory.md
blockedBy: []
blocks: []
---

# Module Architecture Standardization + AI Memory Layer

Chuẩn hóa cấu trúc module layer-based cho shell + remotes, đổi MF contract để remote tự khai báo route, và dựng lớp AI memory `.claude/features/` để AI điều hướng codebase từ tên feature / bug report.

Design doc (nguồn sự thật): [docs/module-architecture-and-ai-memory.md](../../docs/module-architecture-and-ai-memory.md)

## Governance (MFE — bắt buộc)
- `packages/shared-*` chỉ thay đổi ADDITIVE (không rename/remove/retype public API đang dùng).
- PR-split: mỗi phase = 1 PR độc lập; KHÔNG trộn `packages/shared-*` với `apps/*` trong 1 PR.
- Deploy per-app; CI affected-graph giữ main green.

## Phases

| # | Phase | Status | Priority | PR scope |
|---|-------|--------|----------|----------|
| 1 | [Refactor shell về layout chuẩn + fold bug fixes](phase-01-shell-standard-layout-and-fixes.md) | ✅ done | P1 | shell + shared-store (tách PR con) |
| 2 | [MF contract: remote expose `./routes` + shell dynamic addRoute](phase-02-remote-routes-contract.md) | ✅ done | P1 | shell + remotes |
| 3 | [Áp khung remote chuẩn cho home + ads_asset](phase-03-remote-standard-skeleton.md) | ✅ done | P2 | apps/home, apps/ads_asset |
| 4 | [Dựng `.claude/features/` memory layer](phase-04-ai-memory-feature-docs.md) | ✅ done | P1 | docs/meta (no code) |
| 5 | [Sửa doc drift + cập nhật docs convention](phase-05-fix-doc-drift-and-update-docs.md) | ✅ done | P3 | docs only |

## Key dependencies
- Phase 2 phụ thuộc Phase 1 (shell router phải đã ở `src/router/` mới chuyển sang dynamic addRoute sạch).
- Phase 3 phụ thuộc Phase 2 (khung remote cần biết contract `./routes`).
- Phase 4 nên sau Phase 1–3 (feature doc liệt kê file path thật → phải có cấu trúc trước, tránh drift ngày 1).
- Phase 5 độc lập, làm bất kỳ lúc nào (docs only).

## Success criteria (toàn plan)
- [ ] `pnpm typecheck` + `pnpm build` xanh sau mỗi phase.
- [ ] Shell theo layout chuẩn; component/page không gọi `api_get`/`fetch` trực tiếp.
- [ ] 4 bug từ code review được sửa và verify (401, race, dead logic, initialize retry).
- [ ] Remote load route con qua `./routes` (deep-link + back/forward hoạt động).
- [ ] `.claude/features/` có README index + template + 3 feature doc thật, mỗi doc liệt kê file path thật.
- [ ] README hết claim sai (timeout 500ms, 315KB meets budget).

## Out of scope
- Không nhồi business feature thật vào remote (chỉ dựng khung).
- Không thêm knowledge-graph/RAG (đã bác trong brainstorm).
- Không thêm test/ESLint (ghi nhận là nợ kỹ thuật, để plan riêng).

## Validation Log

### Verification Results (Session 1)
- Tier: Full (5 phases)
- Claims checked: 4 trọng yếu
- VERIFIED: route cha CHƯA có `name` (router.ts:28,36 chỉ là prop, không phải route name) → Phase 2 phải thêm name route cha — đúng plan.
- VERIFIED: components/pages shell KHÔNG gọi `api_get`/`api_post`/`fetch` trực tiếp (grep rỗng) → tiền đề "tách shell/src/api/" sai → Phase 1 sửa: api layer đặt ở shared-store, không tạo shell/src/api/ rỗng.
- VERIFIED: `is_sync_asset` chỉ ở shared-types/index.ts:51 + auth-store.ts (set), KHÔNG UI/remote nào đọc → gỡ an toàn.
- Failed: 0

### Decisions Confirmed (Session 1)
1. **API layer** → helper 401/timeout/error-phân-loại đặt trong `shared-store/api-client.ts` (additive). KHÔNG tạo `shell/src/api/` rỗng. Convention `api/` chỉ áp cho remote khi có fetch thật. (Phase 1 updated)
2. **is_sync_asset** → BỎ HẲN (cả hardcode lẫn type field). Lý do user: đang xây khung xương, field chưa dùng. (Phase 1 updated)
3. **Remote skeleton** → tạo dần khi cần; chỉ `pages/` + `router/` ngay, không full skeleton rỗng. (Phase 3 updated)
4. **Remote route render** → shell render từng route con qua `RemoteView` + `RemoteErrorBoundary`; gating ở host. (Phase 2 đã đúng hướng)

### Whole-Plan Consistency Sweep (Session 1)
- Đã rà 5 phase + plan.md sau propagation.
- Phase 1: "shell/src/api/" đã thay bằng shared-store api layer — nhất quán.
- Phase 3: full skeleton → tạo dần — nhất quán.
- Phase 4: feature doc `remote-loading-recovery` vẫn map RemoteView/ErrorBoundary — khớp quyết định #4.
- Phase 2 success criteria "ProtectedRoute chặn ads-asset" — khớp gating-ở-host (#4).
- Không còn mâu thuẫn chưa giải quyết.
