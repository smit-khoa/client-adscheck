import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { WorkspaceTab, WorkspaceTabMeta } from '../types/workspace.types';

export const WORKSPACE_TABS: WorkspaceTabMeta[] = [
  {
    value: 'adaccounts',
    label: 'TKQC',
    description: 'Tài khoản quảng cáo và công cụ thao tác nhanh.',
    countLabel: '0',
    tablePlaceholder: 'Bảng TKQC sẽ được nối ở phase TKQC.',
    functionPanelTitle: 'Công cụ TKQC',
    functionPanelDescription: 'Function panel 1 sẽ hiển thị tool TKQC sau khi migrate tab TKQC.',
  },
  {
    value: 'businesses',
    label: 'BM',
    description: 'Business Manager và công cụ quản lý liên quan.',
    countLabel: '0',
    tablePlaceholder: 'Bảng BM sẽ được nối ở phase BM.',
    functionPanelTitle: 'Công cụ BM',
    functionPanelDescription: 'Function panel 1 sẽ hiển thị tool BM sau khi port logic BM.',
  },
  {
    value: 'page',
    label: 'Page',
    description: 'Danh sách Page và công cụ thao tác Page.',
    countLabel: '0',
    tablePlaceholder: 'Bảng Page sẽ được nối ở phase Page.',
    functionPanelTitle: 'Công cụ Page',
    functionPanelDescription: 'Function panel 1 sẽ hiển thị tool Page sau khi port logic Page.',
  },
  {
    value: 'pixel',
    label: 'Pixel',
    description: 'Không gian Pixel placeholder, chưa có API trong đợt port này.',
    countLabel: '0',
    tablePlaceholder: 'Pixel chưa có API/data trong scope này.',
    functionPanelTitle: 'Công cụ Pixel',
    functionPanelDescription: 'Pixel panel đang để trống đúng scope; không dùng dữ liệu giả.',
  },
];

export const DEFAULT_WORKSPACE_TAB: WorkspaceTab = 'adaccounts';
const DEFAULT_WORKSPACE_TAB_META = WORKSPACE_TABS[0] as WorkspaceTabMeta;

export const useWorkspaceTabStore = defineStore('adaccounts-workspace-tabs', () => {
  const activeTab = ref<WorkspaceTab>(DEFAULT_WORKSPACE_TAB);

  const activeTabMeta = computed(
    () => WORKSPACE_TABS.find((tab) => tab.value === activeTab.value) ?? DEFAULT_WORKSPACE_TAB_META
  );

  function setActiveTab(tab: WorkspaceTab): void {
    activeTab.value = tab;
  }

  return {
    activeTab,
    activeTabMeta,
    setActiveTab,
    tabs: WORKSPACE_TABS,
  };
});
