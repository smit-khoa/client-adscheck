---
slug: <kebab-case-id>
remote: shell | home | ads_asset
route: /business/:bid/<path>     # or n/a for cross-cutting
roles: []                        # required role codes, [] if none
feature_flag: <key>              # business_features key, or n/a
status: planned | in-progress | done
---

## Purpose
One sentence — what this feature does for the user.

## Flow
Step 1 -> 2 -> 3 (user action -> API -> state -> UI). Keep it the actual sequence. Include loading/error/empty states when relevant.

## Entry points / Routes
- Route/menu/action that starts this feature, or "n/a" for reusable/shared features.

## Files (MANDATORY — real paths, verified to exist)
- path/to/file.vue — role of this file
- path/to/other.ts — role

## APIs used
- METHOD /endpoint -> ResponseShape   (or "none")

## State
- Store/composable/local state involved, or "none".

## Permissions / Flags
- Roles/feature flags/business constraints, or "none".

## Verification
- Command/manual check that proves this feature works.

## Related
[[other-slug]] ...

## Decisions / Gotchas
Explain WHY (invariant / race / trade-off). Never reference plan or phase numbers.
