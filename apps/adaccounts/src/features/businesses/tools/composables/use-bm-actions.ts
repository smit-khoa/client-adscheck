import { computed, reactive, ref } from 'vue';
import { BM_TOOL_FUNCTIONS } from '../data/bm-tool-functions';
import type { ToolFunction } from '../types';

// BM action state. Kept BM-local because BM tools have extra metadata
// (`requiresBm`, `kind`) and runner behavior that differs from TKQC/Page.
const expandedId = ref<string | null>(null);
const selectedFunctionId = ref<string | null>(null);
const selectedFunctionIds = ref<string[]>([]);
const expandedStepIds = ref<Set<string>>(new Set());
const formValuesById = reactive<Record<string, Record<string, string | boolean>>>({});

const functions = BM_TOOL_FUNCTIONS;

const expandedFunction = computed(
  () => functions.find((f) => f.id === expandedId.value) ?? null
);

const selectedFunction = computed(
  () => functions.find((f) => f.id === selectedFunctionId.value) ?? null
);

const selectedFunctions = computed(() => {
  const byId = new Map(functions.map((fn) => [fn.id, fn]));
  return selectedFunctionIds.value.map((id) => byId.get(id)).filter((fn): fn is ToolFunction => Boolean(fn));
});

// Legacy live form object for old callers. It mirrors the expanded function's
// values so existing imports keep compiling while the new Panel 2 uses valuesFor.
const formValues = reactive<Record<string, string | boolean>>({});

function seedValues(fn: ToolFunction): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of fn.fields ?? []) {
    values[field.key] =
      field.type === 'switch' ? Boolean(field.default ?? false) : String(field.default ?? '');
  }
  return values;
}

function valuesFor(fn: ToolFunction): Record<string, string | boolean> {
  if (!formValuesById[fn.id]) {
    formValuesById[fn.id] = seedValues(fn);
  }
  return formValuesById[fn.id]!;
}

function replaceFormValues(next: Record<string, string | boolean>): void {
  for (const key of Object.keys(formValues)) delete formValues[key];
  Object.assign(formValues, next);
}

function focusFunction(id: string): void {
  const fn = functions.find((f) => f.id === id);
  if (!fn) return;
  selectedFunctionId.value = id;
  expandedId.value = id;
  replaceFormValues(valuesFor(fn));
}

export function useBmActions() {
  const toggleExpand = (id: string): void => {
    if (expandedId.value === id) {
      expandedId.value = null;
      return;
    }
    focusFunction(id);
  };

  const selectFunction = (id: string): void => {
    const fn = functions.find((f) => f.id === id);
    if (!fn) return;

    focusFunction(id);
    if (!selectedFunctionIds.value.includes(id)) {
      selectedFunctionIds.value = [...selectedFunctionIds.value, id];
      expandedStepIds.value = new Set([id]);
      return;
    }

    const next = new Set(expandedStepIds.value);
    next.add(id);
    expandedStepIds.value = next;
  };

  const removeSelectedFunction = (id: string): void => {
    selectedFunctionIds.value = selectedFunctionIds.value.filter((selectedId) => selectedId !== id);
    const expanded = new Set(expandedStepIds.value);
    expanded.delete(id);
    expandedStepIds.value = expanded;

    if (selectedFunctionId.value === id) {
      const nextId = selectedFunctionIds.value.at(-1) ?? null;
      selectedFunctionId.value = nextId;
      expandedId.value = nextId;
      if (nextId) {
        const fn = functions.find((f) => f.id === nextId);
        if (fn) replaceFormValues(valuesFor(fn));
      } else {
        replaceFormValues({});
      }
    }
  };

  const reorderSelectedFunctions = (nextIds: string[]): void => {
    const selectedIds = selectedFunctionIds.value;
    const selectedSet = new Set(selectedIds);
    const nextSelectedIds = nextIds.filter((id) => selectedSet.has(id));
    const nextSet = new Set(nextSelectedIds);
    const missingIds = selectedIds.filter((id) => !nextSet.has(id));
    selectedFunctionIds.value = [...nextSelectedIds, ...missingIds];
  };

  const toggleStepExpanded = (id: string): void => {
    if (!selectedFunctionIds.value.includes(id)) return;
    focusFunction(id);
    const next = new Set(expandedStepIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedStepIds.value = next;
  };

  return {
    functions,
    expandedId,
    expandedFunction,
    formValues,
    selectedFunctionId,
    selectedFunctionIds,
    selectedFunction,
    selectedFunctions,
    expandedStepIds,
    valuesFor,
    selectFunction,
    removeSelectedFunction,
    reorderSelectedFunctions,
    toggleStepExpanded,
    toggleExpand,
  };
}
