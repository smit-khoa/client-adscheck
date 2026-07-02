import { defineStore } from 'pinia';
import { ref } from 'vue';

// Remote-local Pinia store owning the set of selected Page ids. Mirrors
// account-selection (TKQC) — separate store so Page selection and TKQC selection
// are independent. State persists across navigation (the remote is an MF singleton).
export const usePageSelectionStore = defineStore('adaccounts-page-selection', () => {
  const selectedIds = ref<Set<string>>(new Set());

  return { selectedIds };
});
