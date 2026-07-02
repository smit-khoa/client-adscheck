# Code Standards & Style Guide

Conventions for writing maintainable, consistent code across the codebase.

## Build & Development Commands

### Via Turborepo (Monorepo-aware)

```bash
pnpm build              # node scripts/build.mjs: pick apps → turbo build → mirror selected dist into deployment repo
pnpm build --apps adaccounts,shell   # build and mirror only those apps (skips the menu)
pnpm typecheck          # turbo run typecheck (all workspaces, enforced in CI)
pnpm dev:shell          # pnpm --filter @mf2/shell dev
pnpm verify:same-origin # assert prod remote URLs are BASE_PATH-relative (no absolute domain)
pnpm verify:dist <app>  # assert that apps/<app>/dist is complete (shell: index; remote: remoteEntry)
pnpm verify:dist assembled # assert deployment repo has shell + every remote entry file
pnpm verify:catalog     # assert every shared-ui component group is documented in .claude/components-catalog.md
pnpm verify:features    # assert .claude/features docs have no drift (file paths exist, README index consistent)
pnpm verify:pr-split    # assert packages/shared-* changes are not mixed with apps/* changes
pnpm verify:all         # verify:catalog + verify:features + verify:pr-split (AI/architecture guards)
pnpm clean              # pnpm -r exec rm -rf dist (raw, not Turbo)
```

**AI/architecture guards (husky).** A husky `pre-commit` hook runs `verify:catalog` +
`verify:features` + `verify:pr-split --staged` (fast, markdown/regex/git-path only) and blocks the
commit on drift or mixed shared/app changes; it also prints a soft reminder (non-blocking) when
`apps/*/src` changes without touching `.claude/features/`. Installed via `prepare: husky` on
`pnpm install`. Note: `--no-verify` bypasses the hook locally — run `pnpm run verify:all` in any CI
you add later as a backstop.

`pnpm build` wraps Turbo via `scripts/build.mjs`: a checkbox app-picker (TTY only; non-TTY/CI
builds all), then mirrors the selected app outputs into the deployment repo at
`../client-adscheck-deployment` (sibling directory next to this project). Shell files are mirrored at the
repo root, while remotes are mirrored under their URL segment (`adaccounts/`, `ads-manager/`).
CI can call `turbo run build` directly when it needs build-only behavior.

**Turbo Optimization:**
- `build` outputs to `dist/**`
- `typecheck` depends on `^typecheck` (workspace deps type-check first)
- CI gates PRs with `--filter=...[origin/main]` (affected-only)
- Shared packages (`@mf2/*`) have no `build` script (export TS source, no build step)

### Key Detail: Env Vars in Build

`turbo.json` `build.env` lists the vars rspack reads at build time:

```json
"build": {
  "outputs": ["dist/**"],
  "env": ["NODE_ENV", "DASHBOARD_URL", "BASE_PATH",
          "ADACCOUNTS_REMOTE_URL", "ADS_MANAGER_REMOTE_URL",
          "EXTENDED_PAYMENT_REMOTE_URL"]
}
```

If you make a NEW var build-time consumed, add it here too — otherwise Turbo serves cached
builds even after the var changes. API gateway URL is intentionally not a build-time var; the
shared api-client resolves `gateway.<suffix>` at runtime from `window.location.hostname`.
`BASE_PATH` prefixes `output.publicPath` and the relative
remote URLs; `ADACCOUNTS_REMOTE_URL` / `ADS_MANAGER_REMOTE_URL` override a remote's URL when set
(unused by the default same-origin flow, but listed so an override does not serve a stale cache).

---

## File Naming

| Type | Format | Example |
|------|--------|---------|
| Vue components | PascalCase file | AuthLayout.vue, AppHeader.vue |
| Composables | use-{name}.ts | use-click-outside.ts |
| Stores | {domain}-store.ts | auth-store.ts, layout-store.ts |
| Utils/lib | kebab-case | api-client.ts, colors.ts |
| Types | Exported from index | (no separate files) |
| Config | Descriptive kebab-case | dev-proxy-config.ts, rspack.config.ts |
| Tests | `<source>.test.ts` in `__tests__/` beside source | api-client.test.ts, run-batch.test.ts |

**Goal:** LLM tools (grep, find) can understand purpose from filename alone.

---

## TypeScript

### Strict Mode Required

```typescript
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

Violations fail `pnpm typecheck`.

### Type Annotations

Always annotate function parameters + return types:

```typescript
// ✓ Good
function setCurrentBusiness(business: Business): void {
  localStorage.setItem(STORAGE_KEY, business.business_id);
}

async function fetchBusinesses(): Promise<Business[]> {
  const data = await api_get<{ data: Business[] }>(...);
  return data.data || [];
}

// ✗ Bad
function setCurrentBusiness(business) { ... }  // implicit any
function fetchBusinesses() { ... }  // implicit any return
```

### Generic Types

Use generics for API responses:

```typescript
// ✓ Good
const data = await api_get<{ user: User }>('/public/authentication');
const roles = await api_get<BusinessRole>('/gate/:bid/me');

// ✗ Bad
const data = await api_get('/public/authentication');  // unknown type
```

### Exported Interfaces

All shared types in `packages/shared-types/src/index.ts`:

```typescript
// ✓ Good
export interface User { ... }
export interface Business { ... }

// ✗ Bad
interface User { ... }  // local, not exported
type Business = { ... };  // use interface for object types
```

Prefer `interface` for object shapes, `type` for unions/literals.

---

## Vue Components

### Script Setup + Composition API (Mandatory)

```vue
<script setup lang="ts">
// Imports first
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@mf2/shared-store';
import SomeComponent from './SomeComponent.vue';

// Define types
interface Props {
  name: string;
  disabled?: boolean;
}

interface Emit {
  (e: 'update:modelValue', value: string): void;
  (e: 'click'): void;
}

// Props + emits
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<Emit>();

// Reactive state
const count = ref(0);
const auth = useAuthStore();
const { user, is_authenticated } = storeToRefs(auth);

// Computed
const doubled = computed(() => count.value * 2);

// Lifecycle
onMounted(() => {
  console.log('mounted');
});

// Methods
function increment() {
  count.value++;
  emit('click');
}
</script>

<template>
  <div>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<style scoped>
button {
  @apply px-4 py-2 bg-blue-500 text-white rounded;
}
</style>
```

**Rules:**
- NO Options API (no data, methods, computed blocks)
- NO this (use refs + functions)
- defineProps + defineEmits for type safety
- storeToRefs for reactive store destructuring
- Scoped CSS mandatory (prevent style leaks)

### Max 150 LOC per File

If component exceeds 150 lines:
1. Extract complex logic to composable
2. Split into smaller sub-components
3. Move template to separate markup file (only if unavoidable)

Example:

```typescript
// Before: AuthLayout.vue (200 LOC, complex guard logic)

// After:
// composables/use-auth-guard.ts (60 LOC, pure logic)
export function useAuthGuard() {
  const evaluateRedirect = () => { ... };
  watch([...], evaluateRedirect);
  return { evaluateRedirect };
}

// AuthLayout.vue (70 LOC, template only)
<script setup lang="ts">
const { evaluateRedirect } = useAuthGuard();
</script>
```

### Props Interface Pattern

```typescript
// ✓ Good: Explicit Props type
interface Props {
  modelValue?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  variant: 'primary',
});

// ✗ Bad: Loose object syntax
const props = defineProps({
  modelValue: String,  // type inference weak
  disabled: Boolean,
});
```

### Event Naming

Emit names: lowercase, hyphenated:

```typescript
// ✓ Good
emit('update:modelValue', newValue);
emit('submit-form');
emit('error-retry');

// ✗ Bad
emit('updateModelValue');  // camelCase in template
emit('submit_form');  // snake_case
```

---

## Pinia Stores

### Setup Store Pattern (Mandatory)

```typescript
// ✓ Good: Setup store
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const is_loading = ref(true);

  // Actions
  async function checkAuth() {
    try {
      const data = await api_get<{ user: User }>('/...');
      user.value = data.user;
    } catch {
      user.value = null;
    }
  }

  // Getters (computed)
  const displayName = computed(() => user.value?.name || 'Guest');

  return {
    user,
    is_loading,
    checkAuth,
    displayName,
  };
});

// ✗ Bad: Options pattern (Vuex-style)
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null }),
  mutations: { setUser(state, user) { ... } },  // no mutations in Composition
  actions: { ... },
});
```

**Rules:**
- Use setup() function, NOT { state, mutations, actions }
- Return object lists public API (state + actions + getters)
- No private helper functions (extract to utils if needed)
- Module-level guards for initialization (see auth-store.ts example)

### Naming Convention

```typescript
// ✓ Good
const user = ref(null);
const is_authenticated = ref(false);
const fetchBusinesses = async () => { ... };

// ✗ Bad
const _user = ref(null);  // underscore private (not needed in setup)
const isAuthenticated = ref(false);  // inconsistent snake_case
```

Use snake_case for reactive state to match API response fields.

---

## Composables

### Naming: use-{name}.ts

```typescript
// use-click-outside.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useClickOutside(element: Ref<HTMLElement | null>) {
  const isOpen = ref(false);

  function handleClickOutside(event: MouseEvent) {
    if (element.value && !element.value.contains(event.target as Node)) {
      isOpen.value = false;
    }
  }

  onMounted(() => document.addEventListener('click', handleClickOutside));
  onUnmounted(() => document.removeEventListener('click', handleClickOutside));

  return { isOpen };
}

// Usage in component
<script setup lang="ts">
const dropdownEl = ref<HTMLElement | null>(null);
const { isOpen } = useClickOutside(dropdownEl);
</script>

<template>
  <div ref="dropdownEl">...</div>
</template>
```

**Rules:**
- Return object with reactive state + methods
- No side effects until onMounted
- Cleanup in onUnmounted
- Generic-friendly for reusability

---

## Tool Action State Pattern

Use this pattern for tab function panels that select several tools before running them. It keeps Panel 1 (catalog) and Panel 2 (workflow details) decoupled without creating global cross-tab state.

```typescript
const toolActions = createToolActions({
  functions: PAGE_TOOL_FUNCTIONS,
  orderKey: 'adaccounts.page.tool-order.v1',
  enabledKey: 'adaccounts.page.tool-enabled.v1',
});
```

**Panel responsibilities:**
- **Function panel 1** reads the catalog (`orderedFunctions` or domain `functions`) plus `selectedFunctionIds`; selecting a row calls `selectFunction(id)` to append/focus a workflow step.
- **Function panel 2** reads `selectedFunctions`, `expandedStepIds`, and `valuesFor(fn)`; it owns reorder/remove/expand controls and runner UI.
- **Forms** bind to `valuesFor(fn)` (or a panel-provided context) so each tool has independent reactive form values.
- **Persistence** is explicit: only order/enabled sets and shared runner settings use localStorage. Selected workflow steps and form values are session state unless the product asks to persist them.
- **BM exception:** BM tools can keep a BM-local composable when their metadata or runner behavior differs, but should still expose the same selected-step concepts (`selectedFunctionIds`, `selectedFunctions`, `expandedStepIds`, `valuesFor`).

**Anti-patterns:**
- Do not use one module-scoped tool-action instance for multiple tabs; catalogs and localStorage keys will collide.
- Do not make Panel 1 mutate Panel 2 form values directly; select/focus a function and let Panel 2 edit `valuesFor(fn)`.
- Do not fake runners for UI-only tools. Render the catalog/detail flow, then warn clearly until an API runner exists.

---

## API Client

### Pattern: api_get / api_post

```typescript
// ✓ Good: Type-safe, error-handled
async function fetchBusinesses() {
  try {
    const data = await api_get<{ data: Business[] }>('/gate/me/businesses', {
      page: '1',
      limit: '100',
    });
    return data.data || [];
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error: ${error.status}`, error.data);
    }
    return [];
  }
}

// ✗ Bad: Loose fetch, no error handling
const response = await fetch('/gate/me/businesses');
const data = await response.json();
```

**Rules:**
- Always use `api()` / `api_get` / `api_post` (not `fetch`). Components/pages never call the API directly — go through a remote's `api/` layer or the store.
- Generic type the response shape
- Catch ApiError + handle gracefully
- Query params as object (not URL string)
- Need a custom timeout? `api({ url, timeout_ms })` (default 15s, `0` disables).

### Error Handling

`ApiError.kind` classifies the failure: `http` | `auth` (401) | `network` | `timeout` | `aborted`.
`ApiError.is_transient` is true for `network`/`timeout` — a transient failure must NOT be treated as logged-out.

401 is centralized: api-client invokes a single registered handler (auth-store registers `logout`), so you do NOT handle 401 per call. An `aborted` error means a newer request superseded this one — ignore it, don't clear state.

```typescript
// ✓ Good — react to the classified kind, let 401 be handled centrally
try {
  await fetchBusinessRoles(id, signal);
} catch (error) {
  if (error instanceof ApiError && error.kind === 'aborted') return; // superseded
  // transient vs real failure handled by caller; 401 already triggered logout
}

// ✗ Bad
try {
  await fetchBusinesses();
} catch {
  console.error('error');  // vague, no action
}
```

---

## CSS & Tailwind

### Scoped Styles

```vue
<style scoped>
/* ✓ Good: Scoped, Tailwind utilities */
.button {
  @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600;
}

/* ✗ Bad: Global class (no scope) */
button {
  padding: 1rem;
  background: blue;
}
</style>
```

### Design Tokens

Use color tokens from `shared-ui/lib/colors.ts`:

```typescript
// colors.ts
export const colors = {
  primary: 'oklch(50% 0.2 280)',  // semantic color
  success: 'oklch(70% 0.15 142)',
  error: 'oklch(60% 0.25 20)',
};

// Component
<style scoped>
.error-box {
  color: var(--color-error, oklch(60% 0.25 20));
}
</style>
```

### No Inline Styles

```vue
<!-- ✓ Good: Tailwind classes -->
<div class="flex gap-4 p-4 bg-slate-100 rounded-lg">

<!-- ✗ Bad: Inline style -->
<div style="display: flex; gap: 1rem; padding: 1rem;">
```

---

## Comments

### Document WHY, Not WHAT

```typescript
// ✓ Good: Explains intention
// Module-level guard prevents initialize() from running twice,
// preserving the original contract that first call triggers all API calls.
let initialize_promise: Promise<void> | null = null;

// ✗ Bad: Restates code
// Initialize promise
let initialize_promise: Promise<void> | null = null;
```

### Avoid Plan/Artifact References

```typescript
// ✓ Good: Self-contained rationale
// Credentials included to support cross-domain auth (cookies + headers).
// Dashboard redirect on 401 allows external signin flow.

// ✗ Bad: References plan artifact
// Per F13 advisory-lock fix, serialize concurrent reassigns.
```

### JSDoc for Public APIs

```typescript
/**
 * Fetch businesses owned by current user.
 * 
 * @param limit - Max results per page (default: 100)
 * @returns Array of Business objects, empty if API fails
 */
export async function fetchBusinesses(limit = 100): Promise<Business[]> {
  // ...
}
```

---

## Imports

### Order

```typescript
// 1. Vue + framework imports
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

// 2. External libraries
import { storeToRefs } from 'pinia';

// 3. Local packages (@mf2/*)
import { useAuthStore } from '@mf2/shared-store';
import { Icon } from '@mf2/shared-ui/icons';
import { Table } from '@mf2/shared-ui/table';

// 4. Local files (absolute path via @/)
import { api_get } from '@/lib/api';
import AuthLayout from './AuthLayout.vue';
```

### Shared UI Import Entrypoints

Prefer narrow `@mf2/shared-ui/*` subpath imports in apps so shell/remote initial chunks do not pull the whole shared-ui barrel.

```typescript
// ✓ Good: narrow entrypoints
import { Icon, SpriteProvider } from '@mf2/shared-ui/icons';
import { SmitLogo, SmitLoading } from '@mf2/shared-ui/core';
import { RemoteErrorBoundary, RemoteLoadingFallback } from '@mf2/shared-ui/remote';
import { Table } from '@mf2/shared-ui/table';
import { Card } from '@mf2/shared-ui/card';

// Acceptable only for showcase/demo pages that intentionally render most shared-ui groups.
import { Button, Dialog, Tabs } from '@mf2/shared-ui';
```

The root `@mf2/shared-ui` export stays for backward compatibility and component showcases, but feature/page code should use subpaths when it only needs icons, loading components, remote boundary components, cards, or the data-grid table.

### Absolute Paths

Use `@/` alias (configured in tsconfig.base.json):
```typescript
// ✓ Good
import { useClickOutside } from '@/composables/use-click-outside';

// ✗ Bad
import { useClickOutside } from '../../../composables/use-click-outside';
```

**Exception — `packages/shared-*` MUST use relative imports, never `@/`.** Each app's
rspack aliases `@`→that app's `src/`, and shared packages are consumed from source by the
app's build. An `@/lib/utils` inside `shared-ui` would resolve to `apps/<x>/src/lib/utils`
(nonexistent) and break the build. shadcn-vue CLI generates `@/` imports — rewrite them to
relative (`../../../lib/utils`) after `add`.

---

## Error Handling

### No console.log in Production Code

```typescript
// ✓ Good: Silent failure in production, logged in dev
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info', { user, business });
}

// Errors logged via error boundary
<script setup lang="ts">
onErrorCaptured((error) => {
  console.error('Component error:', error);
  return false;  // Don't propagate
});
</script>

// ✗ Bad: console.log everywhere
console.log('User:', user);
console.log('Loading...');
```

### Throw vs Return Error

```typescript
// ✓ Good: Throw in async, caller decides retry
export async function fetchBusinesses(): Promise<Business[]> {
  const data = await api_get<{ data: Business[] }>('/...');
  if (!data.data) throw new Error('No businesses returned');
  return data.data;
}

// Caller
try {
  await fetchBusinesses();
} catch (error) {
  // Retry or fallback
}

// ✗ Bad: Return error object (ambiguous)
export async function fetchBusinesses(): Promise<Business[] | null> {
  try { ... } catch { return null; }  // Caller must check for null
}
```

---

## Testing

**Live:** Vitest unit tests run per-package (each package owns its `vitest.config.ts` — no central
root config, matching the MFE isolation principle). `pnpm turbo run test` aggregates all suites
(Turbo task `test` in `turbo.json`). **116 tests** across three packages:

| Package | Command | Env | Coverage |
|---------|---------|-----|----------|
| `@mf2/shared-ui` | `pnpm --filter @mf2/shared-ui test` | jsdom | data-grid table composables: range coords/copy, checkbox row-range selection, export (46 tests) |
| `@mf2/shared-store` | `pnpm --filter @mf2/shared-store test` | jsdom | `api-client` (runtime gateway resolver, timeout/abort/401 one-shot/error classification/composeSignals), `auth-store` (single startup hydrate flow: response normalization, dedupe, loading flags, logout), `layout-store` (31 tests total across package) |
| `@mf2/adaccounts` | `pnpm --filter @mf2/adaccounts test` | node | No package `test` script after workspace-tab port; restore pure runner/composable/store tests (run-batch, tool workers, fb-token, use-bm-data-loader, use-page-manager) before expanding FB automation logic |

**Conventions (fixed decisions):**
- **Pure logic only** — composables, api transforms, store actions. NO `.vue` render tests (brittle, low ROI in MFE).
- **`environment`**: `jsdom` when the code touches `localStorage`/`window` (shared-ui, shared-store); `node` otherwise (adaccounts — network is mocked, no DOM needed).
- **`*.test.ts` excluded from `tsc`/`vue-tsc`** in each package's `tsconfig.json` (tests are type-checked by Vitest at run time, not strict-typed by the build).
- **Mock at the network boundary**: adaccounts mocks `graph`/`graphql`/`extFetch`/`getToken` — it does NOT use `@mf2/shared-store` for network. shared-store mocks `api-client`.
- **`passWithNoTests: true`** so a package with no tests yet stays green under `turbo run test`.

**Test file placement:** `__tests__/` folder beside the source, file named `<source>.test.ts`.

```typescript
// shared-store: mock the api-client boundary, drive a Pinia store manually
const apiMock = vi.fn();
vi.mock('./api-client', async () => ({ ...(await vi.importActual('./api-client')), api: (...a) => apiMock(...a) }));
beforeEach(() => setActivePinia(createPinia()));

it('runs the registered 401 handler exactly once for a burst', async () => {
  apiMock.mockResolvedValue({ user: null });
  // ... assert one-shot guard holds
});

// adaccounts: pure logic — no network, inject the worker
it('never exceeds the configured thread count', async () => {
  const results = await runBatch(accounts(10), worker, { threads: 3, delayMs: 0 });
  expect(peak).toBeLessThanOrEqual(3);
});
```

**Still pending:** CI gate (run `turbo run test --filter=...[origin/main]` in GitHub Actions) and Playwright e2e — see [project-roadmap.md](./project-roadmap.md).

---

## Micro-frontend Discipline (Shared Packages)

**Read [docs/micro-frontend-governance.md](./micro-frontend-governance.md) for full rationale.**

When editing `packages/shared-*`:

1. **Additive only** — never break existing API
   - ✓ Add optional fields (`field?: type`)
   - ✓ Add params with defaults
   - ✓ Add new functions/components/store members
   - ✗ Rename/remove public API that another app uses

2. **PR-split required** — never mix `packages/shared-*` with `apps/*` in one PR
   - Shared change PR #1 (merge first)
   - App change PR #2 (built on #1)
   - Reason: isolates broken app PRs, enables per-path revert, keeps app commits clean of `packages/`

3. **CODEOWNERS enforced** — tech-lead review required on `packages/shared-*` changes (GitHub branch protection)

4. **CI gate blocks main** — broken shared code cannot merge (Turbo affected-graph catches all dependents)

---

## Commit Messages

### Conventional Commits

```
feat: add password reset flow
fix: prevent duplicate auth initialize calls
docs: update auth flow diagram in README
refactor: extract remote loading logic to composable
test: add useAuthStore initialization tests
chore: upgrade vue to 3.5.1
```

**Format:** `{type}: {description}` (lowercase, imperative)

**Types:** feat, fix, docs, refactor, test, chore, perf, ci, style, build

No plan artifact references (F13, audit-A4, etc.) in commit messages.

---

## Pre-commit / Pre-push Checklist

- [ ] `pnpm typecheck` passes (no TS errors)
- [ ] No console.log left (except dev-guarded)
- [ ] Tests pass (when available)
- [ ] Import order correct (Vue → external → @mf2/* → @/)
- [ ] Component < 150 LOC (or composable extracted)
- [ ] Props + emits typed
- [ ] No inline styles (use Tailwind @apply)
- [ ] Comments explain WHY, not WHAT
- [ ] No plan/artifact references in code

---

**Document Version:** 1.1  
**Last Updated:** 2026-06-11  
**Status:** Active, enforced in code review
