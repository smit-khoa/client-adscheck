<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import draggable from 'vuedraggable';
import { Button, Input } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
import { toast } from '@mf2/shared-ui/sonner';
import { useWorkspacePanels } from '@/composables/workspace/use-workspace-panels';
import { provideToolActions } from '@/composables/tool-actions/tool-actions-context';
import ToolFunctionForm from '@/components/tool-actions/ToolFunctionForm.vue';
import ToolStepFrame from '@/features/adaccounts/tools/components/ToolStepFrame.vue';
import { usePageToolActions } from '../composables/use-page-tool-actions';
import type { ToolFunction } from '@/types/tool-action.types';

interface Props {
  selectedCount: number;
}

const props = defineProps<Props>();

const pageToolActions = usePageToolActions();
provideToolActions(pageToolActions);

const {
  selectedFunctions,
  expandedStepIds,
  removeSelectedFunction,
  reorderSelectedFunctions,
  toggleStepExpanded,
} = pageToolActions;
const { panelTwoOpen } = useWorkspacePanels();

const running = ref(false);
const editingDelayIndex = ref<number | null>(null);
const delayInputRef = ref<HTMLInputElement | null>(null);
const delaySecondsInput = ref('');
const stepDelaySeconds = ref<Record<number, number>>({});

const selectedStepItems = computed<ToolFunction[]>({
  get: () => selectedFunctions.value,
  set: (next) => reorderSelectedFunctions(next.map((fn) => fn.id)),
});

function isStepExpanded(id: string): boolean {
  return expandedStepIds.value.has(id);
}

function delaySecondsAt(index: number): number {
  return stepDelaySeconds.value[index] ?? 0;
}

function delayMsAt(index: number): number {
  return Math.round(delaySecondsAt(index) * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function startEditingDelay(index: number): Promise<void> {
  delaySecondsInput.value = delaySecondsAt(index) > 0 ? String(delaySecondsAt(index)) : '';
  editingDelayIndex.value = index;
  await nextTick();
  delayInputRef.value?.focus();
}

function commitDelay(): void {
  if (editingDelayIndex.value === null) return;
  const seconds = Number(delaySecondsInput.value);
  stepDelaySeconds.value = {
    ...stepDelaySeconds.value,
    [editingDelayIndex.value]: Number.isFinite(seconds) && seconds > 0 ? seconds : 0,
  };
  editingDelayIndex.value = null;
}

function clearDelay(): void {
  if (editingDelayIndex.value !== null) {
    stepDelaySeconds.value = {
      ...stepDelaySeconds.value,
      [editingDelayIndex.value]: 0,
    };
  }
  delaySecondsInput.value = '';
  editingDelayIndex.value = null;
}

async function runSelectedWorkflow(): Promise<void> {
  if (selectedFunctions.value.length === 0) {
    toast.warning('Vui lòng chọn ít nhất một chức năng Page trước khi chạy');
    return;
  }

  if (props.selectedCount === 0) {
    toast.warning('Vui lòng chọn ít nhất 1 Page trước khi thao tác');
    return;
  }

  running.value = true;
  try {
    for (const [index, fn] of selectedFunctions.value.entries()) {
      toast.warning(`Tool "${fn.label}" chưa có Page action runner thật trong code hiện tại`);
      const nextDelayMs = delayMsAt(index);
      if (index < selectedFunctions.value.length - 1 && nextDelayMs > 0) await sleep(nextDelayMs);
    }
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] bg-[#EEF6F1]/70 text-[#1F2A24]">
    <div class="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
      <div class="min-w-0">
        <p class="text-sm font-normal tracking-[-0.02em] text-[#17211B]">Quy trình Page - <span class="text-[#093]">{{ selectedFunctions.length }} bước</span></p>
        <p class="mt-1 text-xs text-[#6C7A72]">{{ selectedCount }} Page đã chọn</p>
      </div>
      <button type="button" class="grid size-7 place-items-center rounded-full bg-white/70 text-[#4C5A52] shadow-sm ring-1 ring-[#DCEBE3] transition-colors hover:bg-white" title="Thu gọn panel" aria-label="Thu gọn Function panel 2" @click="panelTwoOpen = false">
        <Icon name="chevron-right" :size="12" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto px-4 pb-4">
      <div v-if="selectedFunctions.length > 0" class="relative min-h-full pl-3">
        <div class="absolute bottom-4 left-[22px] top-2 w-px bg-[#CFE2D8]" />
        <draggable v-model="selectedStepItems" item-key="id" handle=".tool-step-drag-handle" :animation="160" ghost-class="opacity-40">
          <template #item="{ element: fn, index }">
            <div>
              <ToolStepFrame :fn="fn" :step-number="index + 1" :expanded="isStepExpanded(fn.id)" :runnable="false" @toggle="toggleStepExpanded(fn.id)" @remove="removeSelectedFunction(fn.id)">
                <ToolFunctionForm :key="fn.id" :fn="fn" :selected-count="selectedCount" :show-header="false" variant="panel-two" />
                <p class="mt-3 rounded-[16px] bg-[#FFF6DF] px-3 py-2 text-xs text-[#936A12] ring-1 ring-[#F3DEAA]">
                  Chức năng Page này chưa có runner thật trong code hiện tại. Panel chỉ lưu cấu hình UI và không gọi API action.
                </p>
              </ToolStepFrame>

              <div v-if="index < selectedFunctions.length - 1" class="relative my-4 flex justify-start pl-2">
                <Input
                  v-if="editingDelayIndex === index"
                  ref="delayInputRef"
                  v-model="delaySecondsInput"
                  type="number"
                  min="0"
                  class="h-8 w-32 rounded-full bg-white text-xs"
                  placeholder="Giây Delay"
                  @blur="commitDelay"
                  @keyup.enter="commitDelay"
                  @keyup.esc="clearDelay"
                />
                <button v-else type="button" class="flex items-center gap-2 rounded-[999px] bg-white px-2.5 py-1.5 text-[13px] font-normal text-[#7B807D] shadow-[0_16px_32px_0_rgba(0,177,115,0.06)] ring-1 ring-[#E3ECE7] transition hover:bg-[#FAFCFB]" @click="startEditingDelay(index)">
                  <Icon name="plus" :size="18" />
                  <span v-if="delaySecondsAt(index) > 0">Delay <span class="font-normal text-[#00A32E]">{{ delaySecondsAt(index) }}s</span></span>
                  <span v-else>Giây Delay</span>
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <div v-else class="flex h-full items-center justify-center rounded-[22px] bg-white/75 px-6 text-center text-sm text-[#6C7A72] ring-1 ring-[#DCEBE3]">
        Chọn chức năng Page ở Panel 1 để thêm bước vào quy trình.
      </div>
    </div>

    <div class="space-y-3 border-t border-[#D7E6DD] bg-[#E7F1EB]/80 px-4 py-4">
      <Button class="h-11 w-full rounded-full" :disabled="selectedFunctions.length === 0 || running" @click="runSelectedWorkflow">
        <Icon :name="running ? 'loader-2' : 'play'" :size="16" :class="running ? 'animate-spin' : ''" />
        <span>{{ running ? 'Đang chạy...' : `Chạy ${selectedFunctions.length} bước` }}</span>
      </Button>
    </div>
  </div>
</template>
