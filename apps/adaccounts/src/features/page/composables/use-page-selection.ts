import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePageSelectionStore } from '../stores/page-selection-store';

// Thin behavior layer over the Page selection store. Mirrors account-selection
// (TKQC): callers pass the id list they want to act on — this never imports the
// page-manager data, keeping selection decoupled from Page data.
export function usePageSelection() {
  const { selectedIds } = storeToRefs(usePageSelectionStore());

  const isSelected = (id: string) => selectedIds.value.has(id);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds.value = next;
  };

  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.value.has(id));
    selectedIds.value = allSelected ? new Set() : new Set(ids);
  };

  const selectedCount = computed(() => selectedIds.value.size);

  return { selectedIds, isSelected, toggleSelect, toggleSelectAll, selectedCount };
}
