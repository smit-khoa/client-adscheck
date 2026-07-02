# AdAccounts Feature-First Architecture Refactor Implementation Plan

> **For Hermes:** Use `claude-code` / ClaudeKit as the actor of record for implementation. Do not commit/push/merge without Sếp Khoa approval.

**Goal:** Refactor `apps/adaccounts` from prototype layer/mode structure into a feature-first architecture that can scale to many ad-account capabilities without later large rewrites.

**Architecture:** Keep the existing monorepo + Module Federation boundary. `adaccounts` remains one remote for the ad-account business domain; inside the remote, split by business capability: `account-list`, `account-selection`, `tool-actions`, `basic-mode`, `advanced-mode`, and later `action-history`. Core business state lives in feature modules; basic/advanced modes only compose presentation.

**Tech Stack:** Vue 3, TypeScript strict mode, Pinia, Module Federation 2.0, Rspack, pnpm, Turborepo, shared UI via `@mf2/shared-ui`.

---

## Non-negotiable architecture decisions

1. **Remote boundary stays domain-sized.** Do not create a remote for each tool action. `share account`, `change info`, `rename`, `disable`, etc. are modules/actions inside `adaccounts`, not separate remotes.
2. **Feature-first inside remotes.** New adaccounts capabilities live under `apps/adaccounts/src/features/<capability>/`.
3. **Mode modules are presentation only.** `basic-mode` and `advanced-mode` compose `account-list`, `account-selection`, and `tool-actions`; they do not own core account/action business logic.
4. **Selection is its own capability.** Selection state must not be buried inside account-list. It is reused by tool actions, bulk operations, advanced mode, export, history, etc.
5. **API wrappers per feature.** Components/pages do not call `fetch`, `api_get`, or backend clients directly. They call feature composables/stores, which call feature `api/` wrappers.
6. **Shared packages stay conservative.** Keep adaccount-specific types/components local until at least two remotes need them. Any `packages/shared-*` change must be additive and ideally in a separate PR/commit.
7. **No premature stubs.** Create folders/files needed for the current refactor, plus docs for the future boundary. Do not create empty placeholder modules for unimplemented features unless a route/doc references them.
8. **Use shared-ui for standard primitives.** The current prototype hand-rolls `<table>`, `<button>`, and checkboxes. For a pure structural refactor, do not redesign UI unless required, but flag follow-up to migrate account table/button/checkbox to `@mf2/shared-ui` Table/Button/Checkbox.

---

## Target file structure

After this refactor, `apps/adaccounts/src` should be shaped like:

```text
apps/adaccounts/src/
  features/
    account-list/
      components/
        AdAccountTable.vue
      composables/
        use-account-list.ts
      types/
        account-list.types.ts
      index.ts
    account-selection/
      composables/
        use-account-selection.ts
      stores/
        account-selection-store.ts
      types/
        account-selection.types.ts
      index.ts
    tool-actions/
      components/
        ToolPanel.vue
        ToolGroupGrid.vue
        ToolFunctionGrid.vue
      composables/
        use-tool-actions.ts
      types/
        tool-action.types.ts
      data/
        mock-tool-groups.ts
      index.ts
    basic-mode/
      pages/
        BasicModeView.vue
      index.ts
    advanced-mode/
      pages/
        AdvancedModePlaceholder.vue
      index.ts
  pages/
    AdAccountsPage.vue
  router/
    index.ts
  stores/
    mode-store.ts
  data/
    mock-ad-accounts.ts
  components/
    DemoActionToast.vue
```

Notes:
- `data/mock-ad-accounts.ts` can temporarily stay at remote-level because it is prototype data. When real API lands, replace with `features/account-list/api/account-list-api.ts`.
- `DemoActionToast.vue` can temporarily stay in `components/` during structural refactor. Longer-term replace it with shared `Toaster` from `@mf2/shared-ui`.
- `AdvancedModePlaceholder.vue` moves from `modes/advanced` to `features/advanced-mode/pages`.
- `BasicModeView.vue` moves from `modes/basic` to `features/basic-mode/pages`.
- `AdAccountTable.vue` moves from `modes/basic` to `features/account-list/components`.
- Tool panel files move from `modes/basic/tool-panel` to `features/tool-actions/components`.

---

## Dependency rules to enforce

Allowed:

```text
pages/AdAccountsPage.vue
  -> features/basic-mode
  -> features/advanced-mode

features/basic-mode
  -> features/account-list
  -> features/tool-actions
  -> components/DemoActionToast

features/tool-actions
  -> features/account-selection

features/account-list
  -> features/account-selection
  -> data/mock-ad-accounts temporary only

features/account-selection
  -> no other adaccounts feature
```

Forbidden:

```text
features/account-selection -> features/tool-actions
features/account-selection -> features/account-list components
features/account-list -> features/tool-actions
features/tool-actions -> features/basic-mode
any component/page -> direct fetch/api_get/backend client
any app feature -> packages/shared-* breaking API change
```

Public imports should prefer feature `index.ts` exports when crossing feature boundaries.

---

## Type boundaries

Move the existing `apps/adaccounts/src/types/ad-account.ts` content into feature-owned types:

`features/account-list/types/account-list.types.ts`
```ts
export type AdAccountStatus = 'active' | 'paused' | 'disabled';

export interface AdAccount {
  id: string;
  name: string;
  status: AdAccountStatus;
  /** Daily budget in the account's currency minor->major already applied. */
  budget: number;
  currency: string;
}
```

`features/tool-actions/types/tool-action.types.ts`
```ts
import type { IconName } from '@mf2/shared-ui';

export interface ToolFunction {
  id: string;
  label: string;
  icon?: IconName;
}

export interface ToolGroup {
  id: string;
  label: string;
  icon?: IconName;
  functions: ToolFunction[];
}

export interface DemoActionResult {
  functionLabel: string;
  count: number;
}
```

`features/account-selection/types/account-selection.types.ts`
```ts
export type AccountSelectionMode = 'explicit' | 'all-filtered';

export interface AccountSelectionState {
  selectedIds: Set<string>;
  mode: AccountSelectionMode;
  excludedIds: Set<string>;
}
```

For this refactor, it is acceptable to implement only explicit selection behavior and keep `all-filtered` as a type-level future boundary if it is not used yet. Do not add complex UI for it now.

---

## Implementation tasks

### Task 1: Create architecture ADR for adaccounts feature-first boundary

**Objective:** Document the long-term module architecture before code movement so future development follows the same boundary.

**Files:**
- Create: `docs/adaccounts-feature-architecture.md`

**Steps:**
1. Create the doc with sections:
   - Purpose
   - Remote boundary
   - Feature-first structure
   - Dependency rules
   - Selection model
   - Tool actions model
   - API layer rule
   - Shared promotion rule
   - Naming conventions
   - Verification expectations
2. Explicitly state that tool actions are not separate remotes.
3. Explicitly state that basic/advanced mode are presentation modules only.

**Verification:**
- Read the file back and confirm it mentions `account-list`, `account-selection`, `tool-actions`, `basic-mode`, and `advanced-mode`.

---

### Task 2: Create feature folders and move account list types/data consumers

**Objective:** Establish `account-list` as the owner of `AdAccount` types and account table rendering.

**Files:**
- Create: `apps/adaccounts/src/features/account-list/types/account-list.types.ts`
- Create: `apps/adaccounts/src/features/account-list/composables/use-account-list.ts`
- Create: `apps/adaccounts/src/features/account-list/index.ts`
- Move/modify: `apps/adaccounts/src/modes/basic/AdAccountTable.vue` -> `apps/adaccounts/src/features/account-list/components/AdAccountTable.vue`
- Modify: `apps/adaccounts/src/data/mock-ad-accounts.ts`
- Delete after migration: `apps/adaccounts/src/types/ad-account.ts` if no imports remain.

**Steps:**
1. Copy `AdAccountStatus` and `AdAccount` into `account-list.types.ts`.
2. Update `mock-ad-accounts.ts` to import `AdAccount` from `../features/account-list` or the exact type file.
3. Create `use-account-list.ts` that owns `accounts = ref<AdAccount[]>(MOCK_AD_ACCOUNTS)` and returns `{ accounts }`.
4. Move `AdAccountTable.vue` into account-list components.
5. Update `AdAccountTable.vue` imports:
   - use account list from `../composables/use-account-list` or feature index.
   - use selection from account-selection after Task 3. If Task 3 is not done yet, temporarily keep existing selection import and complete cleanup in Task 3.
6. Export `AdAccountTable`, `useAccountList`, and account types from `features/account-list/index.ts`.

**Verification:**
- `rg "types/ad-account|modes/basic/AdAccountTable" apps/adaccounts/src` should return no production imports after all movement tasks are complete.
- `pnpm --filter @mf2/adaccounts typecheck` after Task 4, not necessarily after this partial move.

---

### Task 3: Extract account selection into its own feature store/composable

**Objective:** Make selection reusable independently from account-list and tool-actions.

**Files:**
- Create: `apps/adaccounts/src/features/account-selection/types/account-selection.types.ts`
- Create: `apps/adaccounts/src/features/account-selection/stores/account-selection-store.ts`
- Create: `apps/adaccounts/src/features/account-selection/composables/use-account-selection.ts`
- Create: `apps/adaccounts/src/features/account-selection/index.ts`
- Modify: `apps/adaccounts/src/features/account-list/components/AdAccountTable.vue`
- Modify: `apps/adaccounts/src/features/tool-actions/components/ToolPanel.vue` after Task 5
- Delete/replace: `apps/adaccounts/src/composables/use-ad-accounts.ts` after imports are gone.

**Implementation guidance:**
- Store should own `selectedIds` and explicit selection behavior.
- `use-account-selection.ts` should expose:
  - `selectedIds`
  - `isSelected(id: string): boolean`
  - `toggleSelect(id: string): void`
  - `toggleSelectAll(ids: string[]): void`
  - `selectedCount`
  - `selectedAccounts(accounts: AdAccount[]): ComputedRef<AdAccount[]>` or a function returning selected account list.
- Keep the current behavior: selection persists across navigation because Pinia/local remote state remains mounted.

**Verification:**
- Account table can still select/unselect rows.
- Tool panel still sees selected count after Task 5.
- No imports remain from `apps/adaccounts/src/composables/use-ad-accounts.ts`.

---

### Task 4: Move basic/advanced modes into feature modules

**Objective:** Make basic/advanced modes explicit presentation features.

**Files:**
- Move/modify: `apps/adaccounts/src/modes/basic/BasicModeView.vue` -> `apps/adaccounts/src/features/basic-mode/pages/BasicModeView.vue`
- Move/modify: `apps/adaccounts/src/modes/advanced/AdvancedModePlaceholder.vue` -> `apps/adaccounts/src/features/advanced-mode/pages/AdvancedModePlaceholder.vue`
- Create: `apps/adaccounts/src/features/basic-mode/index.ts`
- Create: `apps/adaccounts/src/features/advanced-mode/index.ts`
- Modify: `apps/adaccounts/src/pages/AdAccountsPage.vue`

**Steps:**
1. Move files.
2. Update `BasicModeView.vue` imports to use:
   - `AdAccountTable` from `../../account-list` or exact relative path.
   - `ToolPanel` from `../../tool-actions` after Task 5.
   - `DemoActionToast` from remote-level components.
3. Update `AdAccountsPage.vue` imports to feature index exports.
4. Remove empty `modes/` directories if fully unused.

**Verification:**
- `AdAccountsPage.vue` remains the route view and still switches between basic/advanced via `mode-store`.
- No imports remain from `../modes/basic` or `../modes/advanced`.

---

### Task 5: Move tool actions into a dedicated feature module

**Objective:** Make tool action groups/functions/action execution independent from basic-mode presentation.

**Files:**
- Move/modify: `apps/adaccounts/src/modes/basic/tool-panel/ToolPanel.vue` -> `apps/adaccounts/src/features/tool-actions/components/ToolPanel.vue`
- Move/modify: `apps/adaccounts/src/modes/basic/tool-panel/ToolGroupGrid.vue` -> `apps/adaccounts/src/features/tool-actions/components/ToolGroupGrid.vue`
- Move/modify: `apps/adaccounts/src/modes/basic/tool-panel/ToolFunctionGrid.vue` -> `apps/adaccounts/src/features/tool-actions/components/ToolFunctionGrid.vue`
- Move/modify: `apps/adaccounts/src/composables/use-tool-actions.ts` -> `apps/adaccounts/src/features/tool-actions/composables/use-tool-actions.ts`
- Move/modify: `apps/adaccounts/src/data/mock-tool-groups.ts` -> `apps/adaccounts/src/features/tool-actions/data/mock-tool-groups.ts`
- Create: `apps/adaccounts/src/features/tool-actions/types/tool-action.types.ts`
- Create: `apps/adaccounts/src/features/tool-actions/index.ts`

**Steps:**
1. Move `ToolFunction` and `ToolGroup` types from old `types/ad-account.ts` into `tool-action.types.ts`.
2. Move `DemoActionResult` from composable to `tool-action.types.ts` or export it from the composable if simpler.
3. Update `mock-tool-groups.ts` to import `ToolGroup` from feature types.
4. Update `use-tool-actions.ts` to import from `../data/mock-tool-groups` and feature types.
5. Update `ToolPanel.vue`:
   - import `useModeStore` from remote `stores/mode-store`.
   - import `useAccountSelection` from `features/account-selection`.
   - no direct import of account-list internals except type if needed.
6. Update `ToolFunctionGrid.vue` to receive selected accounts/count through account-selection composable and account-list data, or accept selected count/action callback via props if that keeps dependencies cleaner.
7. Export `ToolPanel`, `useToolActions`, and tool action types via feature index.

**Verification:**
- Click tool group still shows functions.
- Running a demo action still emits the toast with selected count/function label.
- No imports remain from `modes/basic/tool-panel`, `composables/use-tool-actions`, or `data/mock-tool-groups`.

---

### Task 6: Update feature docs to match new module map

**Objective:** Keep `.claude/features` as the AI navigation map after file moves.

**Files:**
- Modify: `.claude/features/README.md`
- Modify: `.claude/features/adaccounts-basic-mode.md`
- Create: `.claude/features/adaccounts-account-list.md`
- Create: `.claude/features/adaccounts-account-selection.md`
- Create: `.claude/features/adaccounts-tool-actions.md`

**Steps:**
1. Update `adaccounts-basic-mode.md` to list new feature module file paths and clarify it is presentation-only.
2. Add feature docs for account-list, account-selection, and tool-actions using `_TEMPLATE.md` sections.
3. Add rows to `.claude/features/README.md` for the new docs.
4. Ensure every path listed actually exists.

**Verification:**
- `pnpm verify:features` should pass.

---

### Task 7: Add an architecture lesson only if a real footgun is discovered

**Objective:** Do not create noisy lessons, but capture any non-obvious migration pitfall if encountered.

**Files:**
- Optional create: `.claude/lessons/<slug>.md`
- Optional modify: `.claude/lessons/README.md`

**Guidance:**
Create/update a lesson only if implementation uncovers a memorable trap, for example:
- feature index barrel causing circular dependency at runtime;
- Pinia singleton behavior differs between standalone remote and shell-mounted remote;
- route injection breaks due to moved entry path;
- shared-ui Table migration has a non-obvious contract issue.

**Verification:**
- If a lesson is added, `pnpm verify:all` must still pass.

---

### Task 8: Run verification and fix drift

**Objective:** Prove the refactor is behavior-preserving and docs are consistent.

**Commands:**
```bash
pnpm verify:all
pnpm --filter @mf2/adaccounts typecheck
pnpm --filter @mf2/adaccounts build
```

If package scripts are missing, do not fake success. Report exact missing script and run the nearest repo-level alternative.

**Expected result:**
- Feature docs pass path/index validation.
- Adaccounts typecheck/build pass.
- The route `/app/adaccounts` still renders basic mode by default.
- Switching to advanced mode still shows the placeholder.

---

## Claude Code handoff prompt

Use this prompt when delegating implementation:

```md
## Goal
Refactor `apps/adaccounts` into the feature-first architecture defined in `plans/260610-1523-adaccounts-feature-architecture/plan.md`, preserving current prototype behavior.

## Project context already checked
- CLAUDE.md: monorepo + MF architecture, shared packages additive-only, app/shared PR split, remote layer convention, feature docs mandatory.
- `.claude/playbook.md`: scout-first, ask-second; update docs and verify before done.
- Feature doc: `.claude/features/adaccounts-basic-mode.md` currently maps the prototype files.
- Lessons: `.claude/lessons/mf-remote-naming.md`; avoid remote naming/import path drift.
- Component catalog: `.claude/components-catalog.md`; shared-ui Table/Button/Checkbox exist. This refactor may preserve prototype UI but should not add new hand-rolled primitives beyond moved existing code.
- Code standards: `docs/code-standards.md`.
- Architecture plan: `plans/260610-1523-adaccounts-feature-architecture/plan.md`.

## Likely files / entry points
- `apps/adaccounts/src/pages/AdAccountsPage.vue` — current route view and mode switch.
- `apps/adaccounts/src/modes/basic/BasicModeView.vue` — move into `features/basic-mode/pages`.
- `apps/adaccounts/src/modes/basic/AdAccountTable.vue` — move into `features/account-list/components`.
- `apps/adaccounts/src/modes/basic/tool-panel/*` — move into `features/tool-actions/components`.
- `apps/adaccounts/src/composables/use-ad-accounts.ts` — split into account-list and account-selection.
- `apps/adaccounts/src/composables/use-tool-actions.ts` — move into tool-actions feature.
- `apps/adaccounts/src/types/ad-account.ts` — split into account-list and tool-actions feature types.
- `.claude/features/adaccounts-basic-mode.md` and `.claude/features/README.md` — update docs.

## Constraints
- Preserve user-visible behavior: default basic mode, row selection count, tool group/function interaction, demo toast, advanced placeholder.
- Components/pages must not call backend directly.
- Do not modify `packages/shared-*` for this refactor unless absolutely necessary; if necessary, stop and report split recommendation.
- Do not commit/push/merge.
- Code/comments in English.
- Avoid creating empty placeholder feature modules beyond what this refactor uses.

## Decisions Hermes already makes
- Use feature-first structure under `apps/adaccounts/src/features/`.
- `account-selection` owns selected ids; account-list owns account data/table; tool-actions owns groups/functions/action execution; basic/advanced modes compose features.
- Keep mock account data temporarily until real API work.
- Keep `DemoActionToast.vue` temporarily; replacing with shared `Toaster` is a follow-up, not part of this structural refactor.

## Decisions that must be escalated to user
- Any breaking shared package API.
- Any UX redesign beyond preserving existing behavior.
- Any real backend/API contract decision.
- Any git commit/push/merge.

## Expected implementation workflow
1. Read the plan and current files.
2. Move code feature-by-feature, preserving behavior.
3. Update `.claude/features` docs to the new file map.
4. Add/update lesson only if a memorable footgun is discovered.
5. Run verification commands and fix any failures.

## Verification commands
- `pnpm verify:all`
- `pnpm --filter @mf2/adaccounts typecheck`
- `pnpm --filter @mf2/adaccounts build`

## Final report required
- Changed files.
- Behavior preserved/changed.
- Docs/lessons updated.
- Verification command output summary.
- Risks/follow-ups.
```

---

## Expected final report format

```md
## Summary
- Refactored adaccounts into feature-first modules.
- Preserved current basic/advanced mode behavior.
- Updated AI feature docs to new paths.

## Files changed
- `<path>` — `<role>`

## Project memory updated
- Feature doc: `.claude/features/...`
- Lesson: `n/a` or `.claude/lessons/...`
- Component catalog: `n/a` unless shared-ui surface changed

## Verification
- `pnpm verify:all` → pass/fail + real output summary
- `pnpm --filter @mf2/adaccounts typecheck` → pass/fail + real output summary
- `pnpm --filter @mf2/adaccounts build` → pass/fail + real output summary

## Risks / follow-ups
- Migrate existing hand-rolled table/button/checkbox to shared-ui Table/Button/Checkbox in a separate UI cleanup task.
- Introduce real API wrappers when backend endpoints are ready.
```
