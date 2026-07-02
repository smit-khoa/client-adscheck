import { defineStore } from 'pinia';
import { ref } from 'vue';

// Remote-local Pinia store owning the set of selected BM ids. Kept separate from
// account-selection: BMs and ad accounts are different entities acted on by
// different panels. State persists across navigation (the remote is an MF
// singleton), so leaving and returning keeps the user's BM selection.
export const useBmSelectionStore = defineStore('bm-selection', () => {
  const selectedBmIds = ref<Set<string>>(new Set());

  return { selectedBmIds };
});
