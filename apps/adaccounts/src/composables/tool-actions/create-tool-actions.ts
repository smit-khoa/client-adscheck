import { computed, reactive, ref, type ComputedRef, type Ref } from 'vue';
import type { ToolFunction } from '@/types/tool-action.types';

// Factory behind the tool-actions state. One instance per panel (TKQC, Page, …):
// each gets its own catalog + its own localStorage keys, so reorder/enable state
// never collides between panels. The shape is identical to the original
// module-scoped composable — only the source catalog + storage keys are injected.
export interface ToolActionsOptions {
  functions: ToolFunction[];
  orderKey: string; // localStorage key for the persisted ordering
  enabledKey: string; // localStorage key for the persisted enabled set
}

export interface ToolActionsInstance {
  orderedFunctions: Ref<ToolFunction[]>;
  expandedIds: Ref<Set<string>>;
  enabledIds: Ref<Set<string>>;
  selectedFunctionId: Ref<string | null>;
  selectedFunctionIds: Ref<string[]>;
  expandedStepIds: Ref<Set<string>>;
  enabledFunctions: ComputedRef<ToolFunction[]>;
  selectedFunction: ComputedRef<ToolFunction | null>;
  selectedFunctions: ComputedRef<ToolFunction[]>;
  valuesFor: (fn: ToolFunction) => Record<string, string | boolean>;
  selectFunction: (id: string) => void;
  removeSelectedFunction: (id: string) => void;
  reorderSelectedFunctions: (nextIds: string[]) => void;
  toggleStepExpanded: (id: string) => void;
  clearSelectedFunction: () => void;
  toggleExpand: (id: string) => void;
  toggleEnabled: (id: string) => void;
  collapse: () => void;
  reorder: (next: ToolFunction[]) => void;
}

// Seed a form-values object from a function's field defaults.
function seedValues(fn: ToolFunction): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of fn.fields ?? []) {
    values[field.key] =
      field.type === 'switch' ? Boolean(field.default ?? false) : String(field.default ?? '');
  }
  return values;
}

export function createToolActions(options: ToolActionsOptions): ToolActionsInstance {
  const { functions, orderKey, enabledKey } = options;

  function loadOrder(): string[] {
    try {
      const raw = localStorage.getItem(orderKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  // Build the initial ordered list: saved order first (filtered to still-existing
  // functions), then any new functions not yet in the saved order appended.
  function buildOrdered(): ToolFunction[] {
    const saved = loadOrder();
    const byId = new Map(functions.map((f) => [f.id, f]));
    const ordered: ToolFunction[] = [];
    for (const id of saved) {
      const fn = byId.get(id);
      if (fn) {
        ordered.push(fn);
        byId.delete(id);
      }
    }
    // Append catalog newcomers (preserve catalog order for them).
    for (const fn of functions) {
      if (byId.has(fn.id)) ordered.push(fn);
    }
    return ordered;
  }

  function loadEnabled(): Set<string> {
    try {
      const raw = localStorage.getItem(enabledKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  const orderedFunctions = ref<ToolFunction[]>(buildOrdered());
  const selectedFunctionId = ref<string | null>(null);
  const selectedFunctionIds = ref<string[]>([]);
  const expandedStepIds = ref<Set<string>>(new Set());
  // Cards whose config form is open. A Set (not a single id) so multiple tools can
  // be expanded at once — enabling several tools shows all their forms together.
  const expandedIds = ref<Set<string>>(new Set());
  const enabledIds = ref<Set<string>>(loadEnabled());
  // Per-tool form values, seeded lazily from each tool's field defaults and kept
  // independently so several enabled tools can be configured before a single run.
  const formValuesById = reactive<Record<string, Record<string, string | boolean>>>({});

  // Tools to run, in list order — drives the shared "Bắt Đầu" batch loop.
  const enabledFunctions = computed(() =>
    orderedFunctions.value.filter((f) => enabledIds.value.has(f.id))
  );

  const selectedFunction = computed(
    () => orderedFunctions.value.find((f) => f.id === selectedFunctionId.value) ?? null
  );

  const selectedFunctions = computed(() => {
    const byId = new Map(orderedFunctions.value.map((fn) => [fn.id, fn]));
    return selectedFunctionIds.value.map((id) => byId.get(id)).filter((fn): fn is ToolFunction => Boolean(fn));
  });

  function selectFunction(id: string): void {
    const fn = orderedFunctions.value.find((f) => f.id === id);
    if (!fn) return;

    selectedFunctionId.value = id;
    if (!selectedFunctionIds.value.includes(id)) {
      selectedFunctionIds.value = [...selectedFunctionIds.value, id];
      expandedStepIds.value = new Set([id]);
      return;
    }

    const next = new Set(expandedStepIds.value);
    next.add(id);
    expandedStepIds.value = next;
  }

  function removeSelectedFunction(id: string): void {
    selectedFunctionIds.value = selectedFunctionIds.value.filter((selectedId) => selectedId !== id);
    const expanded = new Set(expandedStepIds.value);
    expanded.delete(id);
    expandedStepIds.value = expanded;

    if (selectedFunctionId.value === id) {
      selectedFunctionId.value = selectedFunctionIds.value.at(-1) ?? null;
    }
  }

  function reorderSelectedFunctions(nextIds: string[]): void {
    const selectedIds = selectedFunctionIds.value;
    const selectedSet = new Set(selectedIds);
    const nextSelectedIds = nextIds.filter((id) => selectedSet.has(id));
    const nextSet = new Set(nextSelectedIds);
    const missingIds = selectedIds.filter((id) => !nextSet.has(id));
    selectedFunctionIds.value = [...nextSelectedIds, ...missingIds];
  }

  function toggleStepExpanded(id: string): void {
    if (!selectedFunctionIds.value.includes(id)) return;
    selectedFunctionId.value = id;
    const next = new Set(expandedStepIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedStepIds.value = next;
  }

  function clearSelectedFunction(): void {
    selectedFunctionId.value = null;
    selectedFunctionIds.value = [];
    expandedStepIds.value = new Set();
  }

  // Reactive values object for a tool, seeded on first access (expand or run).
  // Must return the value read back FROM the reactive store (the proxy), not the
  // raw seed object — binding v-model to the raw object would mutate it without
  // triggering re-renders (e.g. a <Select> wouldn't reflect the picked option).
  function valuesFor(fn: ToolFunction): Record<string, string | boolean> {
    if (!formValuesById[fn.id]) {
      formValuesById[fn.id] = seedValues(fn);
    }
    return formValuesById[fn.id]!;
  }

  // Toggle the inline expand for a tool card. Independent per card (no accordion)
  // so several forms can stay open at once. Editing a card is independent of
  // whether the tool is enabled to run.
  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedIds.value = next;
  };

  const collapse = () => {
    expandedIds.value = new Set();
  };

  // Toggle whether a tool runs when "Bắt Đầu" is pressed; persist the set.
  // Enabling auto-opens the config form when the tool needs input (so the user
  // fills it right away); disabling closes that form. Multiple tools can be open
  // at once — toggling one never collapses the others.
  const toggleEnabled = (id: string) => {
    const next = new Set(enabledIds.value);
    const open = new Set(expandedIds.value);
    if (next.has(id)) {
      next.delete(id);
      open.delete(id);
    } else {
      next.add(id);
      const fn = orderedFunctions.value.find((f) => f.id === id);
      if (fn?.fields && fn.fields.length > 0) open.add(id);
    }
    enabledIds.value = next;
    expandedIds.value = open;
    try {
      localStorage.setItem(enabledKey, JSON.stringify([...next]));
    } catch {
      // ignore quota / unavailable storage — enablement still applies this session
    }
  };

  // Called by the draggable list after a reorder — persist the new order.
  const reorder = (next: ToolFunction[]) => {
    orderedFunctions.value = next;
    const nextIds = new Set(next.map((fn) => fn.id));
    selectedFunctionIds.value = selectedFunctionIds.value.filter((id) => nextIds.has(id));
    expandedStepIds.value = new Set([...expandedStepIds.value].filter((id) => nextIds.has(id)));
    if (selectedFunctionId.value && !nextIds.has(selectedFunctionId.value)) {
      selectedFunctionId.value = selectedFunctionIds.value.at(-1) ?? null;
    }
    try {
      localStorage.setItem(orderKey, JSON.stringify(next.map((f) => f.id)));
    } catch {
      // ignore quota / unavailable storage — order still applies this session
    }
  };

  return {
    orderedFunctions,
    expandedIds,
    enabledIds,
    selectedFunctionId,
    selectedFunctionIds,
    expandedStepIds,
    enabledFunctions,
    selectedFunction,
    selectedFunctions,
    valuesFor,
    selectFunction,
    removeSelectedFunction,
    reorderSelectedFunctions,
    toggleStepExpanded,
    clearSelectedFunction,
    toggleExpand,
    toggleEnabled,
    collapse,
    reorder,
  };
}
