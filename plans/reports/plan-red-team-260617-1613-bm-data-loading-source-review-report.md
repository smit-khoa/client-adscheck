---
title: "Red-team review for BM data loading plan"
date: 260617-1613
source: ck-plan red-team
plan: plans/260617-1604-bm-data-loading-flow/plan.md
status: completed
---

# Red-team Review: BM Data Loading Plan

## Summary
Plan was directionally correct but too loose for bmmanager parity. Reviewed source at `/Users/smit_hai/Documents/Smit/tai-lieu-nghien-cuu/bmmanager/mbmanager.js` and patched plan files with concrete function-level contracts.

## Source Evidence
- `mbmanager.js:416` contains minified definitions for `Ag`, `lw`, `aw`, `V_`, `Ax`, `Q_`, `X_`, `Dx`, `Px`, `Fr`, `q_`, `G_`, `Fx`, `Z_`, `ew`, `Ox`.
- `mbmanager.js:1399` contains integration: `q_(dtsg)` overview, patch `appealStatus/appealLabel`, then `G_()` only for loaded BM ids whose status is not `live` or `unknown`.

## Findings Applied

### 1. Field naming locked
Plan now locks app field names to:
- `admin`
- `adminDetail`
- `adminViewerId`

Do not use alternate `adminLabel` / `viewerBusinessUserId` in implementation.

### 2. Raw extension fetch allowed in API layer only
Current `graph()`/`graphql()` helpers do not cover every bmmanager endpoint. Plan now allows raw `extFetch` from `smit-connect.ts` inside `features/bm-data-loading/api/*` only.

### 3. Base list mapping clarified
`Ag()` maps:
- `id: bm_${index}_${bm.id}`
- `bmId: id`
- `status: is_disabled ? 'Vô Hiệu Hóa' : 'Hoạt Động'`
- `disabled: boolean`
- `type: BM-${formatted created_time}`
- `tier: sharing_eligibility_status === enabled ? BM350 : BM50`
- `role: permitted_roles[0] || ''`
- `notify: verification_status || 'not_verified'`
- `partnerCount`, `partnerDetail`, `createdDate`

### 4. Detail runner clarified
`aw()` runs per BM with concurrency:
- assets family: `V_()` for page/instagram/whatsapp
- ad-account family: `Ax()` for bmAccount/share/limit
- admins: `Fr()`
- createLimit: `Ox()` always included in bmmanager detail include

### 5. Status flow clarified
Plan now requires:
- overview `q_()` with `doc_id=4941582179260904`
- mapping via `z_()`
- enforcement `G_()` only for loaded BM ids with status not `live` and not `unknown`
- enforcement fixed concurrency `3`
- detail `doc_id=25166016149718566`

### 6. createLimit fallback clarified
Plan now follows `Ox()`:
- If `hasBUser`: `Fx()` then `Z_()`
- Else: `ew()` then `Z_()` then `Fx()`

### 7. UI column toggle corrected
Plan now says disabled advanced groups hide columns by default, while keeping fetched data in session cache. This matches contract better than always showing `--`.

## Files Updated
- `plans/260617-1604-bm-data-loading-flow/plan.md`
- `plans/260617-1604-bm-data-loading-flow/phase-02-bm-domain-types-and-api-wrappers.md`
- `plans/260617-1604-bm-data-loading-flow/phase-03-bm-loader-composable-and-cache.md`
- `plans/260617-1604-bm-data-loading-flow/phase-04-bm-config-modal-and-table-ui.md`

## Remaining Risks
- Source is minified and all key function definitions are on one physical line (`416`), so citations are line-coarse. Implementation should copy behavior carefully by function name, not rely on line snippets alone.
- `Fx()` parses streamed/multiple JSON objects manually. This is easy to get wrong; keep parser isolated and test with real response text if available.
- `V_()` returns JSON strings for detail fields. Decide once in implementation whether UI stores strings like bmmanager or typed arrays; plan currently warns not to mix shapes.

## Unresolved Questions
None. Source provided is enough to proceed with implementation planning/cook.
