---
phase: 5
title: "Sửa doc drift + cập nhật docs convention"
status: completed
priority: P3
effort: "0.5d"
dependencies: []
---

# Phase 5: Sửa doc drift + cập nhật docs convention

## Overview
Gỡ claim sai trong README (chống drift đã phát hiện), và cập nhật docs/CLAUDE.md cho các convention mới (remote layout chuẩn, `./routes` contract, api layer). Docs only — không đụng code.

## Requirements
- Functional: README không còn claim sai. Docs phản ánh đúng MF contract mới + cấu trúc remote.
- Non-functional: docs khớp code thực tế sau Phase 1-3.

## Architecture
- Sửa README claims:
  - Gỡ "Network timeout handling (500ms default in RemoteErrorBoundary)" — không tồn tại (hoặc sửa thành mô tả timeout thật ở api layer sau Phase 1).
  - Sửa "Total shell dist: ~315KB (meets budget)" — 315 > 300, không meets. Ghi số thật sau build hoặc bỏ chữ "meets budget".
- Cập nhật `docs/system-architecture.md` + `docs/code-standards.md`: thêm remote layer convention + api layer rule (component không gọi fetch trực tiếp).
- Cập nhật CLAUDE.md "MF2 Contract": remote giờ expose `./App` + `./routes`.
- Trỏ link tới `docs/module-architecture-and-ai-memory.md` (design doc nguồn).

## Related Code Files
- Modify: `README.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/code-standards.md`
- Modify: `CLAUDE.md` (MF2 Contract + exposes)
- Verify: `docs/micro-frontend-governance.md` còn đúng không

## Implementation Steps
1. Đo bundle thật sau Phase 1-3 (`pnpm --filter @mf2/shell build`), cập nhật số README đúng.
2. Gỡ/sửa claim timeout theo implementation thật ở api layer.
3. Thêm section remote layout + api layer rule vào code-standards.
4. Cập nhật MF2 Contract (exposes `./routes`).
5. Đọc lại docs đảm bảo không còn mâu thuẫn.

## Success Criteria
- [ ] README không còn claim timeout 500ms sai + số bundle đúng thực tế.
- [ ] code-standards có remote layer + api layer rule.
- [ ] CLAUDE.md MF2 Contract phản ánh `./routes`.
- [ ] Không mâu thuẫn docs↔code (spot-check).

## Risk Assessment
- Thấp (docs only). Rủi ro duy nhất: docs lại drift nếu số bundle đo sai thời điểm — đo sau build cuối cùng của Phase 1-3.
