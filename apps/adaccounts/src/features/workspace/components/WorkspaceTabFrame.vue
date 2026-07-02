<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from "vue";
import { Tabs, TabsContent, TabsList, TabsTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@mf2/shared-ui";
import { Button } from "@mf2/shared-ui/form-controls";
import { Icon } from "@mf2/shared-ui/icons";
import { WorkspacePathFrame } from "@mf2/shared-ui/workspace-path-frame";
import { useWorkspacePanels } from "@/composables/workspace/use-workspace-panels";
import FunctionPanelSlot from "./FunctionPanelSlot.vue";
import type { WorkspaceTab, WorkspaceTabMeta } from "../types/workspace.types";

interface Props {
  tabs: WorkspaceTabMeta[];
  activeTab: WorkspaceTab;
  activeTabMeta: WorkspaceTabMeta;
}

interface Emits {
  (e: "update:activeTab", value: WorkspaceTab): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { panelOneOpen, panelTwoOpen, panelOneSize, panelTwoSize } =
  useWorkspacePanels();

// Suppress layout event for 1 tick after toggling a panel to prevent Radix
// from overwriting the stored sizes with proportionally-rescaled values.
const suppressLayout = ref(false);
watch([panelOneOpen, panelTwoOpen], () => {
  suppressLayout.value = true;
  nextTick(() => { suppressLayout.value = false; });
});

const tabModel = computed({
  get: () => props.activeTab,
  set: (value: WorkspaceTab) => emit("update:activeTab", value),
});

const firstTabValue = computed(() => props.tabs[0]?.value ?? "");

function handleLayout(sizes: number[]): void {
  if (suppressLayout.value) return;
  if (panelOneOpen.value && panelTwoOpen.value) {
    if (sizes[1] !== undefined) panelOneSize.value = sizes[1];
    if (sizes[2] !== undefined) panelTwoSize.value = sizes[2];
    return;
  }

  if (panelOneOpen.value && sizes[1] !== undefined) {
    panelOneSize.value = sizes[1];
  }

  if (panelTwoOpen.value && sizes[1] !== undefined) {
    panelTwoSize.value = sizes[1];
  }
}

function syncPanelState() {
  window.dispatchEvent(
    new CustomEvent("shell:panel-one-state", { detail: panelOneOpen.value }),
  );
  window.dispatchEvent(
    new CustomEvent("shell:panel-two-state", { detail: panelTwoOpen.value }),
  );
}

watch([panelOneOpen, panelTwoOpen], syncPanelState, { immediate: true });

onMounted(() => {
  window.addEventListener("shell:request-panel-state", syncPanelState);
});

onUnmounted(() => {
  window.removeEventListener("shell:request-panel-state", syncPanelState);
});
</script>

<template>
  <Tabs v-model="tabModel" class="flex h-full min-h-0 flex-col text-[#163322]">
    <WorkspacePathFrame
      v-model:panel-one-open="panelOneOpen"
      v-model:panel-two-open="panelTwoOpen"
      :panel-one-size="panelOneSize"
      :panel-two-size="panelTwoSize"
      :active-tab="activeTab"
      :first-tab-value="firstTabValue"
      panel-one-label="Function panel 1"
      panel-two-label="Function panel 2"
      @layout="handleLayout"
    >
      <template #tabs>
        <TabsList
          data-tabs-list
          class="relative z-10 flex h-9 items-start gap-3 bg-transparent p-0 shadow-none"
        >
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            :data-tab-value="tab.value"
            class="h-8 w-[84px] flex-none rounded-full border border-white/18 bg-[#436e58]/78 px-0 text-[12px] font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300 data-[state=active]:bg-[#58bf3f] data-[state=active]:text-white data-[state=active]:shadow-[0_8px_18px_rgba(75,179,63,0.26)]"
          >
            {{ tab.label }} ({{ tab.countLabel }})
          </TabsTrigger>
        </TabsList>
      </template>

      <template v-if="$slots.toolbar" #toolbar>
        <slot
          name="toolbar"
          :active-tab="activeTab"
          :active-tab-meta="activeTabMeta"
        />
      </template>

      <template #main>
        <Transition name="workspace-tab" mode="out-in">
          <TabsContent
            :key="activeTab"
            :value="activeTab"
            class="m-0 h-full outline-none"
          >
            <div class="flex h-full flex-col rounded-[14px] bg-transparent">
              <slot
                name="main"
                :active-tab="activeTab"
                :active-tab-meta="activeTabMeta"
              >
                <div
                  class="flex h-full w-full items-center justify-center text-center text-[#2c5a3c]/50"
                >
                  <div>
                    <p class="text-sm font-semibold">
                      {{ activeTabMeta.tablePlaceholder }}
                    </p>
                    <p class="mt-1 text-xs">Table slot placeholder</p>
                  </div>
                </div>
              </slot>
            </div>
          </TabsContent>
        </Transition>
      </template>

      <template #panel-one>
        <div class="function-panel-one-text h-full min-h-0">
          <slot
            name="function-panel-one"
            :active-tab="activeTab"
            :active-tab-meta="activeTabMeta"
          >
            <FunctionPanelSlot
              panel-label="Function panel 1"
              :title="activeTabMeta.functionPanelTitle"
              :description="activeTabMeta.functionPanelDescription"
            />
          </slot>
        </div>
      </template>

      <template #panel-two>
        <div class="function-panel-one-text h-full min-h-0">
          <slot
            name="panel-two"
            :active-tab="activeTab"
            :active-tab-meta="activeTabMeta"
          >
            <FunctionPanelSlot
              panel-label="Function panel 2"
              title="Panel phụ"
              description="Placeholder cho Function panel 2. Đợt port này chưa gắn business logic."
            />
          </slot>
        </div>
      </template>
    </WorkspacePathFrame>

    <div
      v-if="!panelOneOpen || !panelTwoOpen"
      class="fixed right-4 top-[170px] z-50 flex flex-col gap-2"
    >
      <TooltipProvider :delay-duration="400">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              v-if="!panelOneOpen"
              type="button"
              variant="ghost"
              size="icon-sm"
              class="cursor-pointer h-fit w-fit p-[12px] rounded-full border border-white/10 bg-[#204730]/70 text-[#14FF89] transition-colors hover:bg-white/20 flex flex-col gap-2"
              aria-label="Mở kho chức năng"
              @click="panelOneOpen = true"
            >
              <Icon name="layout-dashboard" :size="14" />
              <Icon name="arrow-right-double" :size="14" class="text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mở kho chức năng</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              v-if="!panelTwoOpen"
              type="button"
              variant="ghost"
              size="icon-sm"
              class="cursor-pointer h-fit w-fit p-[12px] rounded-full border border-white/10 bg-[#204730]/70 text-[#14FF89] transition-colors hover:bg-white/20 flex flex-col gap-2"
              aria-label="Mở quy trình"
              @click="panelTwoOpen = true"
            >
              <Icon name="folder" :size="14" />
              <Icon name="arrow-right-double" :size="14" class="text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mở quy trình</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </Tabs>
</template>

<style scoped>
.function-panel-one-text {
  color: #1b3d2a;
}

.function-panel-one-text :deep(*) {
  color: inherit;
}

.workspace-tab-enter-active,
.workspace-tab-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.workspace-tab-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.workspace-tab-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

</style>
