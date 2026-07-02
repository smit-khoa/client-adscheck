<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import draggable from 'vuedraggable';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
import { toast } from '@mf2/shared-ui/sonner';
import { useWorkspacePanels } from '@/composables/workspace/use-workspace-panels';
import ToolStepFrame from '@/features/adaccounts/tools/components/ToolStepFrame.vue';
import BmActionForm from './BmActionForm.vue';
import BmManagerDialog from './BmManagerDialog.vue';
import BmAppealLinkDialog from './BmAppealLinkDialog.vue';
import { useBmActions } from '../composables/use-bm-actions';
import { parseEmails, parseLines, useBmRunner } from '../composables/use-bm-runner';
import type { ToolFunction } from '../types';

interface Props {
  selectedBmIds: string[];
}

const props = defineProps<Props>();

const {
  selectedFunctions,
  expandedStepIds,
  valuesFor,
  removeSelectedFunction,
  reorderSelectedFunctions,
  toggleStepExpanded,
} = useBmActions();
const { threads, delayMs, isRunning, getRunner, run } = useBmRunner();
const { panelTwoOpen } = useWorkspacePanels();

const dialogOpen = ref(false);
const dialogFnId = ref<string | null>(null);
const dialogBmId = ref<string | null>(null);
const appealDialogOpen = ref(false);
const appealBmIds = ref<string[]>([]);
const editingDelayIndex = ref<number | null>(null);
const delayInputRef = ref<HTMLInputElement | null>(null);
const delaySecondsInput = ref('');
const stepDelaySeconds = ref<Record<number, number>>({});

const selectedCount = computed(() => props.selectedBmIds.length);
const selectedStepItems = computed<ToolFunction[]>({
  get: () => selectedFunctions.value,
  set: (next) => reorderSelectedFunctions(next.map((fn) => fn.id)),
});

function isStepExpanded(id: string): boolean {
  return expandedStepIds.value.has(id);
}

function requiresBm(fn: ToolFunction): boolean {
  return getRunner(fn.id)?.requiresBm ?? fn.requiresBm ?? true;
}

function canRunFunction(fn: ToolFunction): boolean {
  if (requiresBm(fn) && selectedCount.value === 0) return false;
  if (fn.kind === 'viewer' || fn.kind === 'appeal') return true;

  const values = valuesFor(fn);
  if (fn.id === 'share-bm-users') return parseEmails(String(values.emails ?? '')).length > 0;
  if (fn.id === 'cancel-pending-invites')
    return values.mode !== 'by-email' || parseEmails(String(values.emails ?? '')).length > 0;
  if (fn.id === 'create-bm')
    return String(values.bmName ?? '').trim().length > 0 && Number(values.bmCount) > 0;
  if (fn.id === 'delete-bm') return String(values.confirm ?? '') === 'XOA';
  if (fn.id === 'create-adaccount')
    return String(values.accName ?? '').trim().length > 0 && Number(values.count) > 0;
  if (fn.id === 'claim-adaccount') return parseLines(String(values.adAccountIds ?? '')).length > 0;
  if (fn.id === 'create-bag') return String(values.bagName ?? '').trim().length > 0;
  if (fn.id === 'bag-add-assets')
    return String(values.bagId ?? '').trim().length > 0 && parseLines(String(values.assetIds ?? '')).length > 0;
  if (fn.id === 'assign-assets-to-user')
    return String(values.userId ?? '').trim().length > 0 && parseLines(String(values.assetIds ?? '')).length > 0;
  return true;
}

const canRun = computed(() => selectedFunctions.value.length > 0 && !isRunning.value);

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

async function runSingleFunction(fn: ToolFunction): Promise<void> {
  if (requiresBm(fn) && selectedCount.value === 0) {
    toast.warning(`Vui lòng chọn ít nhất 1 BM trước khi chạy · ${fn.label}`);
    return;
  }

  if (fn.kind === 'viewer') {
    dialogFnId.value = fn.id;
    dialogBmId.value = props.selectedBmIds[0] ?? null;
    dialogOpen.value = true;
    return;
  }

  if (fn.kind === 'appeal') {
    appealBmIds.value = props.selectedBmIds;
    appealDialogOpen.value = true;
    return;
  }

  if (!canRunFunction(fn)) {
    toast.warning(`Thiếu cấu hình bắt buộc · ${fn.label}`);
    return;
  }

  const res = await run(fn.id, {
    bmIds: props.selectedBmIds,
    values: { ...valuesFor(fn) },
  });

  if (res.ok > 0) toast.success(`Thành công ${res.ok}/${res.total} · ${fn.label}`);
  if (res.warnings.length > 0) {
    toast.warning(`${res.warnings.length}/${res.total} không khớp · ${fn.label}`, {
      description: res.warnings.join('\n'),
      duration: 8000,
    });
  }
  if (res.errors.length > 0) {
    toast.error(`${res.errors.length}/${res.total} thất bại · ${fn.label}`, {
      description: res.errors.join('\n'),
      duration: 8000,
    });
  }
}

async function runSelectedWorkflow(): Promise<void> {
  if (selectedFunctions.value.length === 0) {
    toast.warning('Vui lòng chọn ít nhất một chức năng BM trước khi chạy');
    return;
  }

  isRunning.value = true;
  try {
    for (const [index, fn] of selectedFunctions.value.entries()) {
      await runSingleFunction(fn);
      const nextDelayMs = delayMsAt(index);
      if (index < selectedFunctions.value.length - 1 && nextDelayMs > 0) await sleep(nextDelayMs);
    }
  } catch (error) {
    toast.error(`Lỗi: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isRunning.value = false;
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] bg-[#EEF6F1]/70 text-[#1F2A24]">
    <div class="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
      <div class="min-w-0">
        <p class="text-sm font-normal tracking-[-0.02em] text-[#17211B]">Quy trình BM - <span class="text-[#093]">{{ selectedFunctions.length }} bước</span></p>
        <p class="mt-1 text-xs text-[#6C7A72]">{{ selectedCount }} BM đã chọn</p>
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
              <ToolStepFrame :fn="fn" :step-number="index + 1" :expanded="isStepExpanded(fn.id)" :runnable="Boolean(getRunner(fn.id)) || fn.kind === 'viewer' || fn.kind === 'appeal'" @toggle="toggleStepExpanded(fn.id)" @remove="removeSelectedFunction(fn.id)">
                <BmActionForm :fn="fn" :selected-count="selectedCount" :values="valuesFor(fn)" :show-header="false" variant="panel-two" />
                <p v-if="requiresBm(fn) && selectedCount === 0" class="mt-3 rounded-[16px] bg-[#FFF6DF] px-3 py-2 text-xs text-[#936A12] ring-1 ring-[#F3DEAA]">
                  Chọn ít nhất 1 BM để chạy chức năng này.
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
        Chọn chức năng BM ở Panel 1 để thêm bước vào quy trình.
      </div>
    </div>

    <div class="space-y-3 border-t border-[#D7E6DD] bg-[#E7F1EB]/80 px-4 py-4">
      <div class="grid grid-cols-2 gap-2">
        <Select v-model="threads">
          <SelectTrigger class="h-10 w-full rounded-full border-0 bg-white px-4 text-xs font-medium text-[#3E4B44] shadow-sm ring-1 ring-[#DCEBE3]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="1">1 luồng</SelectItem>
            <SelectItem :value="2">2 luồng</SelectItem>
            <SelectItem :value="5">5 luồng</SelectItem>
            <SelectItem :value="10">10 luồng</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="delayMs">
          <SelectTrigger class="h-10 w-full rounded-full border-0 bg-white px-4 text-xs font-medium text-[#3E4B44] shadow-sm ring-1 ring-[#DCEBE3]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="0">Không delay</SelectItem>
            <SelectItem :value="200">Delay 200ms</SelectItem>
            <SelectItem :value="500">Delay 500ms</SelectItem>
            <SelectItem :value="1000">Delay 1s</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button class="h-11 w-full rounded-full" :disabled="!canRun" @click="runSelectedWorkflow">
        <Icon :name="isRunning ? 'loader-2' : 'play'" :size="16" :class="isRunning ? 'animate-spin' : ''" />
        <span>{{ isRunning ? 'Đang chạy...' : `Chạy ${selectedFunctions.length} bước` }}</span>
      </Button>
    </div>

    <BmManagerDialog v-model:open="dialogOpen" :function-id="dialogFnId" :bm-id="dialogBmId" />
    <BmAppealLinkDialog v-model:open="appealDialogOpen" :bm-ids="appealBmIds" />
  </div>
</template>
