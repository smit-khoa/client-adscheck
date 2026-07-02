# Brainstorm — Chiến lược Unit Test cho SMIT Client (MFE Monorepo)

- **Date:** 2026-06-20
- **Branch:** `smit-khoa/feat-add-unit-test`
- **Mode:** brainstorm (no flags)
- **Decisions:** Mục tiêu = cả 3 theo lộ trình | Loại = pure logic + E2E sau | CI = chạy local trước

---

## 1. Problem statement

Codebase MFE (Vue 3 + Module Federation 2.0) gần như không có lưới an toàn test. Kiến trúc singleton khiến 1 lỗi ở `shared-*` sập cả 3 app cùng lúc, nhưng vùng này 0 test. Cần lộ trình test theo lớp rủi ro, không chạy theo coverage %.

## 2. Hiện trạng (scout findings)

- **Chỉ `packages/shared-ui` có test:** Vitest, 4 file trong `table/composables/__tests__/` (export/copy/range). Chất lượng tốt (pure function, có case tiếng Việt). Phủ ~3% file (4/153).
- **5/6 package 0 test:** `shell`, `adaccounts`, `ads-manager`, `shared-store`, `shared-types` — không có cả test dependency.
- **Vùng rủi ro cao nhất chưa test:**
  - `packages/shared-store` (auth-store, layout-store, api-client) — MF singleton, hệ số nhân rủi ro ×3.
  - `apps/adaccounts` (60 file) — logic nghiệp vụ thật: `run-batch`, `remove-user`, `fb-token`, `open-close-account`.
- **Hạ tầng:** chỉ shared-ui có `vitest.config.ts`. Không có root config, coverage, test trong `turbo.json`, hay CI chạy test (`verify:all` chỉ chạy verify scripts).

## 3. Tác dụng của test cho dự án NÀY (gắn CLAUDE.md)

1. **Enforce luật "shared additive-only" tự động** — hiện chỉ là kỷ luật người. Test public API của `shared-store` → đổi signature là test đỏ ngay.
2. **Mở khóa deploy per-app an toàn** — typecheck không bắt logic sai; test logic mới cho phép deploy `adaccounts` không sợ hồi quy.
3. **Test `shared-ui`/`shared-store` có hệ số nhân ×3** — 1 lỗi chặn = cứu 3 app. ROI cao nhất.
4. **Giữ tốc độ thay đổi không mục theo thời gian** — tránh "đụng shared là sợ → copy-paste né" (debt điển hình MFE).

## 4. Approaches đã cân nhắc

| Approach | Ưu | Nhược | Chọn? |
|----------|-----|-------|-------|
| Test render component (.vue) ồ ạt | Phủ rộng | Giòn, vỡ vặt, ROI thấp trong MFE | ❌ |
| Chạy theo coverage 80% toàn monorepo | Con số đẹp | Bẫy — tốn công test getter/setter vô nghĩa | ❌ |
| **Pure logic theo lớp rủi ro** | Bền, ROI cao, đúng tâm kiến trúc | Cần đọc kỹ hành vi để không khóa nhầm bug thành spec | ✅ |

## 5. Giải pháp chốt — Lộ trình 4 giai đoạn

**Nguyên tắc:** test theo hệ số nhân rủi ro (singleton trước), không theo độ dễ. Mỗi package tự config vitest (KISS, không coupling root). Tách PR `packages/*` ≠ `apps/*`.

### G0 — Hạ tầng (1 PR nhỏ, không viết test logic)
- Nhân `vitest.config.ts` mẫu cho `shared-store` + `adaccounts`; thêm script `"test": "vitest run"`.
- Thêm `test` task vào `turbo.json` (chưa nối CI).
- Env: `node` cho store/api (nhanh), `jsdom` chỉ nơi cần DOM/clipboard.

### G1 — `shared-*` (ROI cao nhất, PR riêng cho packages)
- `api-client`: timeout, xử lý 401, phân loại lỗi.
- `auth-store` / `layout-store`: action + getter.
- Bộ test = "hợp đồng public API" → enforce additive-only.
- Mở rộng `shared-ui`: composable logic chưa phủ (`use-range-copy-flow`, `range-copy-presets`). KHÔNG test render.

### G2 — `apps/adaccounts` (PR riêng cho apps)
- api thuần: `run-batch` (chia lô), `remove-user*` (xóa nhầm = hậu quả thật), `fb-token`, `open-close-account`, `rename-account`.
- composable: `use-bm-data-loader`, `use-account-selection`, `use-tool-actions`.
- `stores/mode-store.ts`. Mock `api-client`. KHÔNG test `.vue`.

### G3 — (để ngỏ) E2E + nối CI
- Playwright 1-2 happy path shell+remote.
- Nối `turbo run test` → `verify:all` + GitHub Actions khi test đủ ổn định.

## 6. Risks

- **Mock `api-client` là nút thắt G2:** nếu api `adaccounts` trộn lẫn fetch + logic, khó test thuần → đề xuất tách hàm pure transform (refactor surgical, đúng "components never call fetch directly"). Không cố mock sâu.
- **"Local trước" dễ mục:** test không CI → sửa code, test đỏ, không ai biết. Khuyến nghị giai đoạn local càng ngắn càng tốt; xong G1 nên nối CI luôn, đừng để trôi.
- **Khóa nhầm bug thành spec:** code chưa test có thể đang chứa bug; test phải xác nhận hành vi ĐÚNG, không chụp lại hành vi hiện tại một cách mù quáng.

## 7. Success criteria

- G0: `pnpm --filter @mf2/shared-store test` và `@mf2/adaccounts test` chạy được (kể cả 0 test).
- G1: public API `shared-store` (auth/layout/api-client) có test; đổi signature → đỏ.
- G2: api rủi ro cao của `adaccounts` (`run-batch`, `remove-user`) có test logic, mock mạng.
- G3: CI chặn merge khi test đỏ (khi Sếp duyệt nối).

## 8. Next steps

- Chuyển `/ck:plan` lập kế hoạch chi tiết theo phase (G0→G1→G2, G3 để ngỏ).
- Lưu ý PR-split: G1 (packages) và G2 (apps) là 2 PR tách biệt.

## Unresolved questions

- Có refactor tách pure transform khỏi api `adaccounts` khi cần test không? (quyết ở G2 sau khi đọc code thật)
- Mốc nào nối CI — ngay sau G1 hay đợi hết G2? (khuyến nghị: ngay sau G1)
