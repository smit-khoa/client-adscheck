<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { checkFacebookSession } from '@/api/fb-session';
import { useAccountList, LoadAdAccountsConfigDialog } from '../../adaccounts';
import { BmDetailPanel, BmFunctionPanel, BmLoadConfigDialog, BmTableView, useBmDataLoader } from '../../businesses';
import { usePageManager, PageLoadConfigDialog } from '../../page';
import { PageDetailPanel, PageFunctionPanel, PageTableView } from '../../page';
import { PixelFunctionPanel, PixelTableView } from '../../pixel';
import { TkqcDetailPanel, TkqcFunctionPanel, TkqcTableView } from '../../adaccounts';
import WorkspaceTabFrame from '../components/WorkspaceTabFrame.vue';
import FunctionPanelSlot from '../components/FunctionPanelSlot.vue';
import { useWorkspaceTabStore } from '../stores/workspace-tab-store';
import { workspaceTabFromRoute, workspaceTabPath } from '../workspace-tab-routes';
import type { WorkspaceTab } from '../types/workspace.types';

const route = useRoute();
const router = useRouter();
const workspaceTabs = useWorkspaceTabStore();
const { activeTab, activeTabMeta } = storeToRefs(workspaceTabs);
const { accounts, loadWithConfig, hydrateFromCache: hydrateAccounts } = useAccountList();
const { rows: bmRows, isLoading: isBmLoading, load: loadBmWithConfig, hydrateFromCache: hydrateBmRows } = useBmDataLoader();
const { rows: pageRows, hydrateFromCache: hydratePageRows } = usePageManager();
const tabs = computed(() =>
  workspaceTabs.tabs.map((tab) => {
    if (tab.value === 'adaccounts') return { ...tab, countLabel: String(accounts.value.length) };
    if (tab.value === 'businesses') return { ...tab, countLabel: String(bmRows.value.length) };
    if (tab.value === 'page') return { ...tab, countLabel: String(pageRows.value.length) };
    return tab;
  })
);

const TABLE_TOOLBAR_TARGET = '#adaccounts-workspace-table-toolbar';

onMounted(async () => {
  const session = await checkFacebookSession();
  if (session.status !== 'not_logged_in') {
    await Promise.all([hydrateAccounts(), hydrateBmRows(), hydratePageRows()]);
  }
});

watch(
  () => route.name,
  () => {
    const routeTab = workspaceTabFromRoute(route);
    if (routeTab && routeTab !== activeTab.value) {
      workspaceTabs.setActiveTab(routeTab);
    }
  },
  { immediate: true }
);

function handleActiveTabUpdate(value: WorkspaceTab): void {
  if (activeTab.value !== value) {
    workspaceTabs.setActiveTab(value);
  }

  const targetPath = workspaceTabPath(value);
  if (route.path !== targetPath) {
    void router.push(targetPath);
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col p-[4px]">
    <WorkspaceTabFrame
      :tabs="tabs"
      :active-tab="activeTab"
      :active-tab-meta="activeTabMeta"
      @update:active-tab="handleActiveTabUpdate"
    >
      <template #toolbar="{ activeTab: currentTab }">
        <div id="adaccounts-workspace-table-toolbar" class="contents">
          <LoadAdAccountsConfigDialog v-if="currentTab === 'adaccounts'" @load="loadWithConfig" />
          <BmLoadConfigDialog v-else-if="currentTab === 'businesses'" :disabled="isBmLoading" @submit="loadBmWithConfig" />
          <PageLoadConfigDialog v-else-if="currentTab === 'page'" />
        </div>
      </template>

      <template #main="{ activeTab: currentTab, activeTabMeta: currentTabMeta }">
        <TkqcTableView v-if="currentTab === 'adaccounts'" :toolbar-target="TABLE_TOOLBAR_TARGET" />
        <BmTableView v-else-if="currentTab === 'businesses'" :toolbar-target="TABLE_TOOLBAR_TARGET" />
        <PageTableView v-else-if="currentTab === 'page'" :toolbar-target="TABLE_TOOLBAR_TARGET" />
        <PixelTableView v-else-if="currentTab === 'pixel'" />
        <div v-else class="flex h-full w-full items-center justify-center text-center text-[#2c5a3c]/50">
          <div>
            <p class="text-sm font-semibold">{{ currentTabMeta.tablePlaceholder }}</p>
            <p class="mt-1 text-xs">Table slot placeholder</p>
          </div>
        </div>
      </template>

      <template #function-panel-one="{ activeTab: currentTab, activeTabMeta: currentTabMeta }">
        <TkqcFunctionPanel v-if="currentTab === 'adaccounts'" />
        <BmFunctionPanel v-else-if="currentTab === 'businesses'" />
        <PageFunctionPanel v-else-if="currentTab === 'page'" />
        <PixelFunctionPanel v-else-if="currentTab === 'pixel'" />
        <FunctionPanelSlot
          v-else
          panel-label="Function panel 1"
          :title="currentTabMeta.functionPanelTitle"
          :description="currentTabMeta.functionPanelDescription"
        />
      </template>

      <template #panel-two="{ activeTab: currentTab, activeTabMeta: currentTabMeta }">
        <TkqcDetailPanel v-if="currentTab === 'adaccounts'" />
        <BmDetailPanel v-else-if="currentTab === 'businesses'" />
        <PageDetailPanel v-else-if="currentTab === 'page'" />
        <FunctionPanelSlot
          v-else
          panel-label="Function panel 2"
          title="Panel phụ"
          :description="`Placeholder cho ${currentTabMeta.label}. Đợt này chỉ gắn chi tiết thao tác cho TKQC/BM/Page.`"
        />
      </template>
    </WorkspaceTabFrame>
  </div>
</template>
