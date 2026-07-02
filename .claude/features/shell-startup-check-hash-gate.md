---
slug: shell-startup-check-hash-gate
remote: shell
route: n/a (startup gate)
roles: []
feature_flag: n/a
status: done
---

## Purpose

Block normal shell rendering when SMIT Connect is missing, unreadable, stale, or has extension-local files whose MD5 hashes do not match the gateway-provided file list.

This is an integrity/compatibility gate under the normal extension trust model. It is not proof against a malicious extension lying about its own file reads.

## Flow

1. `useStartupGate().runStartupChecks()` runs after the shell app mounts.
2. Shell hydrates SMIT login via `auth.hydrateUser()`.
3. If authenticated, shell loads Adscheck entitlements via `auth.loadEntitlements()`.
4. Shell calls `verifySmitConnectHashGate()`.
5. Gate detects an installed SMIT Connect extension by probing known extension IDs with `chrome.runtime.getManifest`.
6. Gate posts `{ manifest_version, name, version }` to `POST /public/tools/check-hash`.
7. For every returned `{ path, hash }`, gate strips a legacy `dist/` prefix, resolves extension-local URL through `chrome.runtime.getURL`, fetches the file through the extension, computes MD5 with `js-md5`, and compares with the expected hash.
8. `valid` renders the normal router view. Any failure renders `StartupGateError.vue` with Retry.

## Entry points / Routes

- Startup entry: `apps/shell/src/main.ts`.
- Gate UI: `apps/shell/src/App.vue` renders before `<router-view>`.
- No route paths are added by this feature.

## Files (MANDATORY — real paths, verified to exist)

- apps/shell/src/composables/use-startup-gate.ts — shell-local startup state and retry orchestration.
- apps/shell/src/services/check-hash-gate.ts — typed check-hash result, API call, path normalization, MD5 comparison.
- apps/shell/src/services/smit-connect-extension.ts — shell-local Chrome extension messaging helper.
- apps/shell/src/components/StartupGateError.vue — retryable blocking error UI.
- apps/shell/src/services/__tests__/check-hash-gate.test.ts — focused gate result tests.
- apps/shell/src/App.vue — switches between startup loading, blocked error, and normal router view.
- apps/shell/src/main.ts — mounts app early and starts checks after mount.
- apps/shell/package.json — owns `js-md5` dependency and shell test script.

## APIs used

- Chrome extension message: `{ key, cmd: 'execute', function: 'chrome.runtime.getManifest', parameter: false }`.
- Chrome extension message: `{ key, cmd: 'execute', function: 'chrome.runtime.getURL', args: path }`.
- Chrome extension message: `{ key, cmd: 'fetch', url, options }`.
- POST /public/tools/check-hash -> `{ success?: boolean, fileHash?: Array<{ path?: string, hash?: string }>, message?: string }`.

## State

`use-startup-gate.ts` shell-local singleton state:

- `status: 'idle' | 'checking' | 'ready' | 'blocked'`
- `error: CheckHashGateResult | null`
- `is_checking: boolean`

Gate result statuses:

- `valid`
- `extension_missing`
- `api_error`
- `extension_error`
- `hash_mismatch`

## Permissions / Flags

- No dev bypass flag exists. Missing extension blocks startup by default.
- No route-level auth/session/feature gating is added.
- Shell helper is intentionally local and does not import `apps/adaccounts/src/api/smit-connect.ts`.

## Verification

- Unit: `pnpm --filter @mf2/shell test`.
- Typecheck: `pnpm --filter @mf2/shell typecheck`.
- Feature docs: `pnpm verify:features`.
- Manual smoke needs gateway + SMIT Connect extension:
  - valid extension reaches normal routes.
  - missing extension shows retryable startup gate error.
  - hash mismatch blocks normal routes and lists mismatched paths.

## Related

[[auth-flow]] [[remote-loading-recovery]]

## Decisions / Gotchas

- Browser WebCrypto does not support MD5, so shell owns explicit `js-md5` dependency for this gate.
- Hashing follows legacy behavior: hash the exact text returned by extension fetch.
- Paths with `dist/` prefix are normalized before `chrome.runtime.getURL`, matching v6 behavior.
- Retry re-runs only the hash gate. It does not reload SMIT auth or entitlement state.
- A malicious extension could potentially return forged content. The gate checks expected files under normal extension trust assumptions, not against a fully hostile extension runtime.
