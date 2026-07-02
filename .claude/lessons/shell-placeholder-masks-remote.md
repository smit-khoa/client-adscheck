---
slug: shell-placeholder-masks-remote
scope: mf
status: active
---

## Symptom
`/app/adaccounts` shows the shell `Data table placeholder` instead of the adaccounts remote-owned TKQC/BM/Page/Pixel workspace and tools.

## Root cause
The shell layout can accidentally render a local workspace skeleton over the remote branch and gate `<router-view>` behind a disabled flag. The remote route guard may still register remote child routes correctly, but the remote never mounts if `AppLayout` does not render its child `<router-view>` for `/app/<remote>`.

## How to avoid
Shell visual placeholders must be route-scoped. Keep placeholder UI only for plain shell routes such as `/app`; always render `<router-view>` for remote branches (`/app/adaccounts`, `/app/ads-manager`) so MF remotes can mount. When changing `AppLayout`, manually verify both the shell placeholder route and at least one remote route.

## Related
[[shell-workspace-content]] [[remote-loading-recovery]] [[adaccounts-workspace-tabs]]
