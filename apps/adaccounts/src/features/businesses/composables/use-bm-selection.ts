import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useBmSelectionStore } from '../stores/bm-selection-store';

// Thin behavior layer over the BM selection store. Mirrors use-account-selection
// but keyed by BM id. Callers pass the id list they want to act on so selection
// stays decoupled from the BM data.
export function useBmSelection() {
  const { selectedBmIds } = storeToRefs(useBmSelectionStore());

  const isSelected = (id: string) => selectedBmIds.value.has(id);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedBmIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedBmIds.value = next;
  };

  // Toggle against a caller-supplied id list: if all are already selected, clear
  // them; otherwise select all of them.
  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every((id) => selectedBmIds.value.has(id));
    selectedBmIds.value = allSelected ? new Set() : new Set(ids);
  };

  const clear = () => {
    selectedBmIds.value = new Set();
  };

  const selectedCount = computed(() => selectedBmIds.value.size);

  return { selectedBmIds, isSelected, toggleSelect, toggleSelectAll, clear, selectedCount };
}
