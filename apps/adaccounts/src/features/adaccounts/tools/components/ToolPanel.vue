<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mf2/shared-ui';
import { Icon } from '@mf2/shared-ui/icons';
import { useWorkspacePanels } from '@/composables/workspace/use-workspace-panels';
import ToolGroupList from './ToolGroupList.vue';
import { useToolActions } from '../composables/use-tool-actions';
import { TOOL_UI_GROUPS } from '../data/adaccount-tool-catalog';
import type { AdAccount } from '../../types/account-list.types';

interface Props {
  selectedAccounts: AdAccount[];
}

defineProps<Props>();

const toolActions = useToolActions();
const { panelOneOpen } = useWorkspacePanels();
const { selectedFunctionId, selectedFunctionIds, selectFunction } = toolActions;
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] bg-transparent text-black">
    <div class="flex items-center justify-between px-5 py-4">
      <div>
        <h2 class="text-sm font-normal tracking-[-0.02em] text-black">Kho chức năng</h2>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          disabled
          class="grid size-7 cursor-not-allowed place-items-center rounded-full bg-white/60 text-black/35"
          title="Cài đặt kho chức năng — chưa hỗ trợ"
        >
          <Icon name="settings" :size="12" />
        </button>
        <TooltipProvider :delay-duration="400">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="grid size-7 place-items-center rounded-full bg-white/60 text-black/75 transition-colors hover:bg-white"
                aria-label="Thu gọn"
                @click="panelOneOpen = false"
              >
                <Icon name="chevron-right" :size="12" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Thu gọn</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <div class="min-h-0 flex-1 px-5 pb-5">
      <ToolGroupList
        :groups="TOOL_UI_GROUPS"
        :selected-function-id="selectedFunctionId"
        :selected-function-ids="selectedFunctionIds"
        @select-function="selectFunction"
      />
    </div>
  </div>
</template>
