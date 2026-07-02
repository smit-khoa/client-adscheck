---
title: "TKQC function panel redesign"
date: 2026-06-25
type: journal
---

# TKQC Function Panel Redesign

## Context

Sếp yêu cầu đại phẫu TKQC function panels theo thiết kế: Panel 1 thành kho chức năng group 4 nhóm, Panel 2 hiển thị detail thao tác/form/steps của chức năng được chọn.

## What happened

- Brainstorm report created: `plans/reports/brainstorm-260625-0157-tkqc-function-panel-redesign-report.md`.
- Implementation plan created/completed: `plans/260625-0157-tkqc-function-panel-redesign/plan.md`.
- TKQC Panel 1 changed from flat switch + inline form to grouped catalog:
  - `Super Share`
  - `Kháng TKQC`
  - `Đổi Info`
  - `Xoá QTV ẩn`
- Added multi-selected workflow-step state to tool-actions factory.
- Added TKQC Panel 2 selected workflow-step UI:
  - ordered selected function step cards
  - schema-driven form via existing `ToolFunctionForm`
  - Luồng/Delay controls
  - disabled `Lưu Template`
  - multi-step run button
- BM/Page/Pixel kept placeholder fallback in Function panel 2.
- Updated feature docs and architecture docs.

## Decisions

- Scope = TKQC only.
- Temporary group mapping is allowed; Sếp will rearrange later.
- No full workflow/template engine this round.
- No new Facebook API runner this round.
- Unwired tools warn truthfully; no fake success.
- Placeholder header actions are disabled until scoped.

## Verification

Passed:

- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`
- `pnpm verify:features`
- `pnpm verify:all`
- tester subagent static/command verification
- code-reviewer subagent after follow-up fixes
- docs-manager subagent; stale docs fixed afterward

Build warnings remain non-blocking:

- Rspack CSS order warnings around `vue-sonner`, dialog, table CSS.
- Asset size warnings for two chunks.

## Follow-up

- Manual browser smoke was not run in this session.
- Working tree has unrelated/shared-ui/style dirty files; review before commit/PR split.
- Consider adding unit tests later for `create-tool-actions` workflow-step behavior.
