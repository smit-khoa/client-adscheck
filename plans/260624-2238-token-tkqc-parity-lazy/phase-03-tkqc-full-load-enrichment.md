---
phase: 3
title: "TKQC full-load enrichment"
status: completed
priority: P1
dependencies: [2]
---

# Phase 3: TKQC Full-Load Enrichment

## Overview

Wire TKQC full-load to the token policy layer and expand the load groups carefully. Keep current seed/detail/payment/hidden/check-hold strengths, add spend insights as a controlled enrichment group, and leave unconfirmed hidden-BM behavior disabled.

## Requirements

- Functional: current TKQC source modes remain: `all`, `tkqcIds`, `bmIds`, `permission`, `accountType`.
- Functional: current detail/payment/hidden limit/check hold behavior remains isolated by group.
- Functional: Graph read calls use `readGraph` policy instead of ad-hoc `getToken()` where appropriate.
- Functional: add spend insights group only with explicit config and isolated failure.
- Functional: full-load mode can request all known groups in one submit.
- Non-functional: do not block base rows when spend/hidden/check-hold fails.

## Architecture

Current TKQC config:

```ts
options: {
  basic: true,
  payment: true,
  finance: true,
  admin: true,
  checkHold: false,
  hiddenBm: false,
}
```

Plan changes:

- Keep `hiddenBm` disabled until API source is confirmed.
- Add `spendInsights` or fold spend into a named `insights` group if field naming fits current types.
- Add spend fields through detail batch only when group is enabled:
  - old source supports `insights.date_preset(lifetime){spend}` or `insights.time_range({since,until}){spend}`;
  - first implementation should use a safe default matching old behavior, or expose date preset only if UI already has a place for it.
- Existing fields remain mapped through `AdAccount` type and table adapters.

## Related Code Files

- Modify: `apps/adaccounts/src/features/adaccounts/components/LoadAdAccountsConfigDialog.vue`
- Modify: `apps/adaccounts/src/features/adaccounts/types/account-list.types.ts`
- Modify: `apps/adaccounts/src/features/adaccounts/api/adaccount-field-groups.ts`
- Modify: `apps/adaccounts/src/features/adaccounts/api/load-adaccounts-flow.ts`
- Modify: `apps/adaccounts/src/features/adaccounts/api/adaccount-batch.ts`
- Modify: `apps/adaccounts/src/features/adaccounts/api/adaccount-mappers.ts`
- Modify: `apps/adaccounts/src/api/fb-graph.ts`
- Maybe modify: `apps/adaccounts/src/features/adaccounts/components/AdAccountTable.vue` if a new spend column/slot is needed
- Tests: existing or new pure tests near `load-adaccounts-flow.ts`, `adaccount-field-groups.ts`, `adaccount-mappers.ts`

## Implementation Steps

1. Read current `LoadAdAccountsConfig`, field builders, mappers, and table columns before editing.
2. Migrate seed/detail/payment Graph calls to endpoint-level token policy while preserving existing function signatures where possible. Existing endpoints that are currently stable on `token_b` should not be flipped to `token_i` until validated; `token_i` is introduced as a resolver and can become primary per endpoint after proof.
3. Add optional spend insights group:
   - update config type;
   - update config dialog checkbox;
   - add field builder for spend;
   - map response into existing `spend`/finance field if present, otherwise add a clearly named optional field.
4. Keep hidden limit tied to finance unless product chooses a separate checkbox.
5. Keep check hold default off unless Sếp explicitly wants full-load default on; for “load all”, config submit should allow enabling it.
6. Ensure group failures are captured as row fields or group errors, not thrown past the whole flow.
7. Update cache payload after successful full-load merge.
8. Add tests for field builder and mapper behavior.

## Success Criteria

- [ ] TKQC default behavior remains compatible.
- [ ] Full-load config can include basic, finance, payment, admin, check hold, hidden limit, and spend insights.
- [ ] Spend insights failure does not remove base/detail rows.
- [ ] Graph read calls use token policy.
- [ ] `hiddenBm` stays disabled/unwired with clear comment until source confirmed.
- [ ] Typecheck catches no missing fields.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Spend insights increases request cost | Make it explicit group/config; keep concurrency bounded |
| Table column naming unclear | Reuse existing `spend` field if already present; avoid new UI column unless needed |
| Token_i fails on some sessions | Policy fallback to token_b for readGraph |
