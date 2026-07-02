# AdAccounts BM Data Loading Flow

---
date: 2026-06-18
type: implementation-journal
feature: adaccounts bm-data-loading, advanced-mode
---

## Context

Implemented Business Manager (BM) data loading for the `adaccounts` remote. The work followed the existing BM loading plan and source comparison report, then tightened the table contract after user review found extra detail/debug columns that were not source-facing.

## What Changed

**Advanced BM surface**
- Basic mode now exposes “Chuyển sang bảng BM”.
- Advanced mode hosts `BmDataLoadingView` instead of a text-only placeholder.
- BM loading lives under `apps/adaccounts/src/features/bm-data-loading/`.

**BM loading flow**
- `use-bm-data-loader` loads base BM rows first, then selected advanced API groups.
- Advanced toggles control real API calls, not just visible columns.
- Patches merge by `bmId`; per-group loading/errors stay row-local.
- Session cache uses `bm:{bmId}:{group}` and does not persist after reload.
- Components call composables/API wrappers only; no direct Facebook API calls in Vue components.

**API wrappers**
- Added feature-local wrappers for base BM list, assets, ad accounts, admins, and restriction/enforcement status.
- All Facebook traffic continues through SMIT Connect / `fb-graph` / `smit-connect` extension layer.
- Removed create-limit wrapper/field after column scope was corrected.

**BM table contract**
- Final table keeps 21 source-facing columns.
- Product decisions exclude:
  - `BM tên hiển thị phụ`
  - `Ghi chú`
  - `Hoạt động`
- `Trạng thái` now means restriction/enforcement status. Base rows start as `Chưa tải`; status group updates to values such as `Live`, `Die vĩnh viễn`, `Die 3 dòng`, `Đang xem xét`.
- Detail/debug payloads are not stored/displayed: `pageDetail`, `instagramDetail`, `accountShareDetail`, `adminDetail`, `adminViewerId`, etc.

**Docs updated**
- Feature docs: `.claude/features/adaccounts-bm-data-loading.md`, `.claude/features/adaccounts-basic-mode.md`, `.claude/features/README.md`.
- Project docs: `README.md`, `docs/adaccounts-feature-architecture.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/project-overview-pdr.md`, `docs/project-roadmap.md`.

## Decisions

- Keep BM implementation local to `adaccounts`; no shared package changes.
- Do not store raw detail/debug JSON just to support hidden columns.
- Do not keep `Create limit` when it is not source-facing in the final BM table contract.
- Drop `Hoạt động` because its base Graph flag duplicated/confused the user-facing `Trạng thái` meaning.
- Keep API group toggles as behavior controls. Disabled group = no API call.

## Verification

- `pnpm verify:features` ✓
- `pnpm --filter @mf2/adaccounts typecheck` ✓
- `pnpm --filter @mf2/adaccounts build` ✓
- `pnpm verify:all` ✓

Build still emits non-blocking warnings already observed:
- CSS order warning between shared-ui dialog/table styles.
- CSS order warning between vue-sonner/table styles.
- One adaccounts JS asset exceeds the recommended size hint.

## Known Gaps / Follow-ups

- Manual runtime validation still requires SMIT Connect extension + logged-in Facebook session with BM permissions.
- Some BM source fields depend on Facebook permissions and may return empty/partial values; UI should keep base rows visible when advanced groups fail.
- No commit/push done in this session.
