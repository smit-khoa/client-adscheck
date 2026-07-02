---
phase: 2
title: "Startup check-hash gate service"
status: completed
priority: P1
dependencies: []
---

# Phase 2: Startup check-hash gate service

## Overview

Create a shell-local startup service that validates the installed SMIT Connect extension through `POST /public/tools/check-hash` and MD5 comparison of extension-local files. This phase produces pure helper logic and tests; UI wiring happens in Phase 3.

## Requirements

- Functional: detect supported SMIT Connect extension IDs.
- Functional: get extension manifest through `chrome.runtime.getManifest`.
- Functional: send `{ manifest_version, name, version }` to `/public/tools/check-hash`.
- Functional: verify every returned `{ path, hash }` by reading extension-local files and computing MD5.
- Functional: return typed gate result, not vague boolean only.
- Non-functional: shell-local helper only; do not import adaccounts remote code.
- Non-functional: no new broad shared package unless absolutely necessary.

## Architecture

Add a shell-local service under `apps/shell/src/`:

```text
apps/shell/src/services/smit-connect-extension.ts
  detectExtension()
  executeExtension(fnName, args)
  fetchExtensionFile(url, options)

apps/shell/src/services/check-hash-gate.ts
  verifySmitConnectHashGate()
  normalizeHashPath(path)
  md5Content(content)
```

Result shape:

```ts
type CheckHashGateStatus =
  | 'valid'
  | 'extension_missing'
  | 'api_error'
  | 'extension_error'
  | 'hash_mismatch';

interface CheckHashGateResult {
  status: CheckHashGateStatus;
  message?: string;
  mismatches?: Array<{ path: string; expected: string; actual: string }>;
}
```

Use existing `api()` from `@mf2/shared-store` for gateway calls. Browser WebCrypto does not support MD5, and current root/shell manifests do not list an MD5 library. Implementation must explicitly choose a small dependency (or prove one already exists in the lockfile/workspace), add it to the correct shell/package scope, and document the package impact. Do not hand-roll a broad crypto helper.

## Related Code Files

- Create: `apps/shell/src/services/smit-connect-extension.ts`
- Create: `apps/shell/src/services/check-hash-gate.ts`
- Optional create: `apps/shell/src/services/__tests__/check-hash-gate.test.ts`
- Read/reference only: `apps/adaccounts/src/api/smit-connect.ts`
- Avoid: `packages/shared-*` unless Phase 1 already adds needed API contracts

## Implementation Steps

1. Copy only the minimal extension ID/key detection pattern from `apps/adaccounts/src/api/smit-connect.ts` into shell-local service.
2. Add `executeExtension()` for `chrome.runtime.getManifest` and `chrome.runtime.getURL`.
3. Add `fetchExtensionFile()` using extension message `{ cmd: 'fetch', url, options, key }`.
4. Add response type for `/public/tools/check-hash`:
   - `success?: boolean`
   - `fileHash?: Array<{ path: string; hash: string }>`
   - `message?: string`
5. Implement `verifySmitConnectHashGate()`:
   - detect extension.
   - get manifest.
   - post manifest to `/public/tools/check-hash`.
   - normalize `dist/` prefix.
   - resolve extension file URL.
   - fetch file content.
   - compute MD5 using the approved explicit dependency.
   - return `valid` only when all hashes match.
6. Add tests with mocked `chrome.runtime.sendMessage` and mocked `api()`.
7. Document the threat model limit: this verifies expected extension files under the normal extension trust model; it is not proof against a malicious extension lying about its own file reads.
8. Keep error messages user-actionable but not overly detailed with sensitive internals.

## Success Criteria

- [x] Missing `chrome.runtime` returns `extension_missing`.
- [x] No supported extension returns `extension_missing`.
- [x] API failure returns `api_error`.
- [x] Extension message/fetch failure returns `extension_error`.
- [x] Hash mismatch returns `hash_mismatch` with mismatched paths.
- [x] All hashes matching returns `valid`.
- [x] Shell service does not import `apps/adaccounts` source.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Duplicating extension helper creates drift | Keep shell helper minimal; extract only after repeated shared need |
| MD5 package adds bundle weight | Prefer existing dependency; if new dep is needed, evaluate smallest option and document |
| Extension file content encoding changes hash | Match legacy behavior: hash the returned text exactly as extension fetch returns it |
| API contract returns unexpected fileHash shape | Validate array shape and return `api_error`/`extension_error` with clear message |
