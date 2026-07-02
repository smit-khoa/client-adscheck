import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAccountSelectionStore } from '../stores/account-selection-store';

// Thin behavior layer over the selection store. Only explicit selection is
// implemented today (toggle a row, toggle the visible set). Account-selection
// never imports account-list — callers pass the id list they want to act on.
export function useAccountSelection() {
  const { selectedIds } = storeToRefs(useAccountSelectionStore());

  const isSelected = (id: string) => selectedIds.value.has(id);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds.value = next;
  };

  // Toggle against a caller-supplied id list: if all are already selected, clear
  // them; otherwise select all of them. Keeps selection decoupled from account data.
  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.value.has(id));
    selectedIds.value = allSelected ? new Set() : new Set(ids);
  };

  const selectedCount = computed(() => selectedIds.value.size);

  return { selectedIds, isSelected, toggleSelect, toggleSelectAll, selectedCount };
}
