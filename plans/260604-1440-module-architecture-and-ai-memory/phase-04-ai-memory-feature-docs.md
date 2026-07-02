---
phase: 4
title: "Dựng .claude/features/ memory layer"
status: completed
priority: P1
effort: "0.5d"
dependencies: [1, 2, 3]
---

# Phase 4: Dựng `.claude/features/` memory layer

## Overview
Tạo lớp AI memory: index + template + 3 feature doc THẬT cho logic đang tồn tại ở shell. Mỗi feature doc liệt kê file path thật (yêu cầu sống còn cho layer-based — xem §2 design doc).

## Requirements
- Functional: AI đọc `.claude/features/README.md` → tìm feature → mở doc → có file list + route + API + flow + related.
- Non-functional: KHÔNG tạo doc cho feature chưa tồn tại (chống drift ngày 1). Chỉ 3 feature thật.

## Architecture
```
.claude/features/
├── README.md      # bảng index: feature | remote | route | roles | status | link
├── _TEMPLATE.md   # khuôn bắt buộc (frontmatter + sections theo §5 design doc)
├── auth-flow.md
├── role-feature-gating.md
└── remote-loading-recovery.md
```
- Template frontmatter: slug, remote, route, roles, feature_flag, status.
- Anti-drift: doc chỉ chứa thứ không suy ra được từ code (purpose, flow, decisions). Types/route tables KHÔNG chép tay.

## Related Code Files
- Create: `.claude/features/README.md`
- Create: `.claude/features/_TEMPLATE.md`
- Create: `.claude/features/auth-flow.md` (map: AuthLayout.vue, auth-store.ts, shell api/auth.ts, api-client.ts)
- Create: `.claude/features/role-feature-gating.md` (map: ProtectedRoute.vue, auth-store hasRole/hasFeature, router gating)
- Create: `.claude/features/remote-loading-recovery.md` (map: RemoteView.vue, RemoteErrorBoundary.vue, RemoteLoadingFallback.vue)

## Implementation Steps
1. Viết `_TEMPLATE.md` đúng khuôn §5 design doc.
2. Viết 3 feature doc, liệt kê file path THẬT (đã verify tồn tại sau Phase 1-3, vì path có thể đổi do refactor).
3. Viết `README.md` index bảng + ghi quy tắc cập nhật (cập nhật doc = phần bắt buộc của task sửa code — trỏ về CLAUDE.md).
4. Cross-link giữa 3 doc bằng `[[slug]]`.

## Success Criteria
- [ ] 3 feature doc + README + template tồn tại.
- [ ] Mỗi doc có frontmatter đầy đủ + danh sách file path THẬT (verify path tồn tại).
- [ ] README index khớp 3 doc.
- [ ] Không có doc rỗng/speculative.

## Risk Assessment
- **Path trong doc lệch sau refactor**: vì phase này sau Phase 1-3 nên path đã ổn định. Verify từng path bằng read/glob trước khi ghi.
- **Drift tương lai**: phụ thuộc kỷ luật. README phải ghi rõ luật cập nhật + trỏ CLAUDE.md. (Auto-check CI đã bị loại khỏi scope theo lựa chọn brainstorm — ghi nhận là nợ.)
