import { defineStore } from 'pinia';
import { ref } from 'vue';

// Remote-local Pinia store owning the set of selected account ids. State
// intentionally persists across navigation (the remote is an MF singleton), so
// leaving and returning to this app keeps the user's selection.
export const useAccountSelectionStore = defineStore('adaccounts-selection', () => {
  const selectedIds = ref<Set<string>>(new Set());

  return { selectedIds };
});
