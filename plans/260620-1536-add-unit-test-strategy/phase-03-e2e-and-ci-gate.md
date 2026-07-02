---
phase: 3
title: "(Để ngỏ) E2E + nối CI gate"
status: pending
priority: P3
dependencies: [1, 2]
---

# Phase 3: Nối CI (sau G1) + (để ngỏ) E2E

## Overview
**Nối CI** không còn để ngỏ — làm **ngay sau G1** (đã chốt Validation S1) để enforce test shared-store sớm (test không CI dễ mục). **E2E** vẫn để ngỏ — kích hoạt khi user duyệt.

<!-- Updated: Validation Session 1 - CI nối ngay sau G1 (không đợi G2); .github/workflows tạo mới -->


## Requirements
- Functional: CI chặn merge khi unit test đỏ; 1–2 E2E happy path quan trọng.
- Non-functional: không ôm đồm E2E; chỉ luồng giá trị cao nhất.

## Architecture

### Nối CI (khuyến nghị làm NGAY sau G1, không đợi hết G2)
- `turbo.json`: `test` task đã có (G0). Thêm `test` vào pipeline CI.
- Mở rộng `verify:all` hoặc thêm step riêng: `turbo run test --filter=...[origin/main]` (chỉ affected — đúng pattern CLAUDE.md).
- GitHub Actions: thêm job chạy `pnpm turbo run test --filter=...[origin/main]`, required trước merge.
- Branch protection: test xanh = điều kiện merge.

### E2E (Playwright) — chỉ khi cần
- Cài `@playwright/test` ở root (devDep), config riêng.
- 1–2 kịch bản: (a) shell load + điều hướng vào remote `adaccounts` render được; (b) 1 luồng nghiệp vụ chính (chọn account → chạy 1 tool).
- KHÔNG cố phủ mọi tool — E2E đắt, giòn, chậm.

## Related Code Files
- Modify: `turbo.json` (nối test vào CI pipeline nếu chưa)
- Modify: `package.json` (script `verify:all` thêm test, hoặc CI step)
- Create: `.github/workflows/*.yml` (job test) — đọc workflow hiện có trước
- Create (E2E): `playwright.config.ts`, `e2e/*.spec.ts`

## Implementation Steps
1. (đã chốt Validation S1) Nối CI **ngay sau G1**, không đợi G2. Tách bước CI ra khỏi "để ngỏ".
2. Thêm job test vào GitHub Actions (tạo `.github/workflows/` mới — hiện chưa có), dùng affected-graph.
3. Bật required check trên branch protection.
4. (Tùy chọn E2E, vẫn để ngỏ) cài Playwright, viết 1–2 happy path.

## Success Criteria
- [ ] PR có unit test đỏ → CI chặn merge.
- [ ] CI dùng affected-graph (không chạy lại toàn bộ mỗi lần).
- [ ] (Nếu làm E2E) 1 happy path shell→remote xanh trong CI.

## Risk Assessment
- **Để ngỏ quá lâu = test mục.** Mitigation: ưu tiên nối CI ngay sau G1.
- **E2E flaky** trong CI MFE (timing, port, MF runtime): chạy headless ổn định, retry 1 lần, scope tối thiểu.
- **Affected-graph footgun** (CLAUDE.md): dùng đúng `@mf2/ads-asset` (hyphen) vs `apps/ads_asset` (underscore) trong filter.
