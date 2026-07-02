import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import type { Component } from "vue";

export const useLayoutStore = defineStore("layout", () => {
  const title = ref<string | null>(null);
  const setTitle = (value: string | null) => {
    title.value = value;
  };

  // headerSlot bản React là ReactNode → Vue dùng Component (render qua <component :is>)
  const headerSlot = shallowRef<Component | null>(null);
  const setHeaderSlot = (node: Component | null) => {
    headerSlot.value = node;
  };

  const isSidebarOpen = ref(false);
  const setSidebarOpen = (open: boolean) => {
    isSidebarOpen.value = open;
  };

  return {
    title,
    setTitle,
    headerSlot,
    setHeaderSlot,
    isSidebarOpen,
    setSidebarOpen,
  };
});
