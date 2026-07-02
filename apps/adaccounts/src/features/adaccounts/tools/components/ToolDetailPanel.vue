<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import draggable from 'vuedraggable';
import { Button } from '@mf2/shared-ui/form-controls';
import { toast } from '@mf2/shared-ui/sonner';
import { Icon } from '@mf2/shared-ui/icons';
import ToolStepFrame from './ToolStepFrame.vue';
import ToolFunctionForm from '@/components/tool-actions/ToolFunctionForm.vue';
import { provideToolActions } from '@/composables/tool-actions/tool-actions-context';
import { useToolRunnerSettings } from '@/composables/tool-actions/use-tool-runner-settings';
import { useWorkspacePanels } from '@/composables/workspace/use-workspace-panels';
import { runBatch } from '../../../../api/run-batch';
import { TOOL_RUNNERS } from '../../../../api/tools';
import { useAccountList } from '../../composables/use-account-list';
import { useToolActions } from '../composables/use-tool-actions';
import type { AdAccount } from '../../types/account-list.types';
import type { ToolFunction } from '@/types/tool-action.types';

interface Props {
  selectedAccounts: AdAccount[];
}

const props = defineProps<Props>();

const { accounts, applyPatches } = useAccountList();
const toolActions = useToolActions();
provideToolActions(toolActions);

const {
  selectedFunctions,
  expandedStepIds,
  valuesFor,
  removeSelectedFunction,
  reorderSelectedFunctions,
  toggleStepExpanded,
} = toolActions;
const { threads, delayMs } = useToolRunnerSettings();
const { panelTwoOpen } = useWorkspacePanels();

const running = ref(false);
const editingDelayIndex = ref<number | null>(null);
const delayInputRef = ref<HTMLInputElement | null>(null);
const delaySecondsInput = ref('');
const stepDelaySeconds = ref<Record<number, number>>({});

const selectedCount = computed(() => props.selectedAccounts.length);
const runnableFunctionCount = computed(() => selectedFunctions.value.filter((fn) => TOOL_RUNNERS[fn.id]).length);
const canRun = computed(() =>
  Boolean(selectedFunctions.value.length > 0 && selectedCount.value > 0 && runnableFunctionCount.value > 0 && !running.value)
);

const selectedStepItems = computed<ToolFunction[]>({
  get: () => selectedFunctions.value,
  set: (next) => reorderSelectedFunctions(next.map((fn) => fn.id)),
});

function isStepExpanded(id: string): boolean {
  return expandedStepIds.value.has(id);
}

function stepRunner(fn: ToolFunction) {
  return TOOL_RUNNERS[fn.id];
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

// Run all selected workflow steps sequentially for a single account.
// Step delay (stepDelaySeconds) is applied between steps within the same account.
async function runWorkflowForAccount(
  account: AdAccount,
  index: number,
  nameById: Map<string, string>,
  allAccounts: AdAccount[]
): Promise<{ ok: boolean; message: string }> {
  for (const [stepIndex, fn] of selectedFunctions.value.entries()) {
    const runner = stepRunner(fn);
    if (!runner) {
      toast.warning(`TKQC ${nameById.get(account.id) ?? account.id} — "${fn.label}" chưa được đấu API`);
    } else {
      const values = { ...valuesFor(fn) };
      const ctx = { allAccounts, delayMs: 0 };
      try {
        const result = await runner(account, values, index, ctx);
        if (result.ok) {
          if (result.patch) applyPatches(new Map([[account.id, result.patch]]));
          toast.success(`✓ ${nameById.get(account.id) ?? account.id} · ${fn.label}`);
        } else {
          toast.error(`✗ ${nameById.get(account.id) ?? account.id} · ${fn.label}`, {
            description: result.message,
            duration: 6000,
          });
        }
      } catch (err) {
        toast.error(`✗ ${nameById.get(account.id) ?? account.id} · ${fn.label}`, {
          description: err instanceof Error ? err.message : String(err),
          duration: 6000,
        });
      }
    }

    // Delay between steps within this account (not between accounts)
    const nextStepDelayMs = delayMsAt(stepIndex);
    if (stepIndex < selectedFunctions.value.length - 1 && nextStepDelayMs > 0) {
      await sleep(nextStepDelayMs);
    }
  }
  return { ok: true, message: '' };
}

async function runSelectedWorkflow(): Promise<void> {
  if (selectedFunctions.value.length === 0) {
    toast.warning('Vui lòng chọn ít nhất một chức năng trước khi chạy');
    return;
  }

  if (selectedCount.value === 0) {
    toast.warning('Vui lòng chọn ít nhất 1 TKQC trước khi thao tác');
    return;
  }

  running.value = true;
  const nameById = new Map(props.selectedAccounts.map((acc) => [acc.id, acc.name]));
  const allAccounts = accounts.value;

  try {
    // Each worker pulls one account at a time, runs ALL steps for that account,
    // then waits `delayMs` before picking up the next one.
    await runBatch(
      props.selectedAccounts,
      (account, index) => runWorkflowForAccount(account, index, nameById, allAccounts),
      { threads: threads.value, delayMs: delayMs.value }
    );
  } catch (error) {
    toast.error(`Lỗi: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] bg-[#EEF6F1]/70 text-[#1F2A24]">
    <div class="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
      <div class="min-w-0">
        <p class="text-sm font-normal tracking-[-0.02em] text-[#17211B]">Quy trình - <span class="text-[#093]">{{ selectedFunctions.length }} bước</span></p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled
          class="flex h-7 items-center gap-1.5 rounded-full bg-white/85 px-2 text-xs font-semibold text-[#4C5A52] shadow-sm ring-1 ring-[#DCEBE3] disabled:cursor-not-allowed disabled:opacity-70"
          title="Template — chưa hỗ trợ"
        >
          <Icon name="folder" :size="12" />
          <span>Template</span>
        </button>
        <button
          type="button"
          class="grid size-7 place-items-center rounded-full bg-white/70 text-[#4C5A52] shadow-sm ring-1 ring-[#DCEBE3] transition-colors hover:bg-white"
          title="Thu gọn panel"
          aria-label="Thu gọn Function panel 2"
          @click="panelTwoOpen = false"
        >
          <Icon name="chevron-right" :size="12" />
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto px-4 pb-4">
      <div v-if="selectedFunctions.length > 0" class="relative min-h-full pl-3">
        <div class="absolute bottom-4 left-[22px] top-2 w-px bg-[#CFE2D8]" />

        <draggable
          v-model="selectedStepItems"
          item-key="id"
          handle=".tool-step-drag-handle"
          :animation="160"
          ghost-class="opacity-40"
        >
          <template #item="{ element: fn, index }">
            <div>
              <ToolStepFrame
                :fn="fn"
                :step-number="index + 1"
                :expanded="isStepExpanded(fn.id)"
                :runnable="Boolean(stepRunner(fn))"
                @toggle="toggleStepExpanded(fn.id)"
                @remove="removeSelectedFunction(fn.id)"
              >
                <ToolFunctionForm
                  :key="fn.id"
                  :fn="fn"
                  :selected-count="selectedCount"
                  :show-header="false"
                  variant="panel-two"
                />
                <p v-if="!stepRunner(fn)" class="mt-3 rounded-[16px] bg-[#FFF6DF] px-3 py-2 text-xs text-[#936A12] ring-1 ring-[#F3DEAA]">
                  Chức năng này chưa được đấu API, nên khi chạy quy trình sẽ chỉ báo cảnh báo.
                </p>
              </ToolStepFrame>

              <div v-if="index < selectedFunctions.length - 1" class="relative my-4 flex justify-start pl-2">
                <input
                  v-if="editingDelayIndex === index"
                  ref="delayInputRef"
                  v-model="delaySecondsInput"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  class="rounded-[999px] border-0 bg-white px-2.5 py-1.5 text-[13px] font-normal text-[#6F7773] shadow-[0_16px_32px_0_rgba(0,177,115,0.06)] outline-none ring-1 ring-[#DCEBE3] transition focus:ring-2 focus:ring-[#BFD8CC]"
                  aria-label="Nhập số giây delay giữa các bước"
                  placeholder="Giây Delay"
                  @blur="commitDelay"
                  @keyup.enter="commitDelay"
                  @keyup.esc="clearDelay"
                />
                <button
                  v-else
                  type="button"
                  class="flex items-center gap-2 rounded-[999px] bg-white px-2.5 py-1.5 text-[13px] font-normal text-[#7B807D] shadow-[0_16px_32px_0_rgba(0,177,115,0.06)] ring-1 ring-[#E3ECE7] transition hover:bg-[#FAFCFB] hover:text-[#59615D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BFD8CC]"
                  aria-label="Thêm delay giữa các bước"
                  @click="startEditingDelay(index)"
                >
                  <Icon name="plus" :size="18" />
                  <span v-if="delaySecondsAt(index) > 0">
                    Delay <span class="font-normal text-[#00A32E]">{{ delaySecondsAt(index) }}s</span>
                  </span>
                  <span v-else>Giây Delay</span>
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <div v-else class="flex h-full items-center justify-center rounded-[22px] bg-white/75 px-6 text-center text-sm text-[#6C7A72] ring-1 ring-[#DCEBE3]">
        Chọn chức năng ở Panel 1 để thêm bước vào quy trình.
      </div>
    </div>

    <div class="space-y-2 border-t border-[#D7E6DD] bg-[#E7F1EB]/80 px-3 py-3">
      <!-- Luồng + Delay(ms) pill inputs — thiết kế theo Figma 1364:14866 -->
      <div class="flex items-center gap-2">
        <!-- Luồng: fixed width pill -->
        <label class="flex w-[112px] shrink-0 cursor-pointer items-center justify-between rounded-full bg-white py-[6px] pl-3 pr-[6px] shadow-[0_16px_16px_rgba(0,177,115,0.06)]">
          <span class="shrink-0 text-[13px] tracking-[0.13px] text-black/60">Luồng</span>
          <div class="relative flex h-6 w-11 items-center rounded-full bg-black/5">
            <input
              v-model.number="threads"
              type="number"
              min="1"
              max="20"
              inputmode="numeric"
              class="h-full w-full bg-transparent pr-4 text-center text-[13px] tracking-[0.13px] text-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <div class="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col">
              <Icon name="chevron-up" :size="8" class="text-black/40" />
              <Icon name="chevron-down" :size="8" class="text-black/40" />
            </div>
          </div>
        </label>
        <!-- Delay(ms): flex-1 pill -->
        <label class="flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-full bg-white py-[6px] pl-3 pr-[6px] shadow-[0_16px_16px_rgba(0,177,115,0.06)]">
          <span class="shrink-0 text-[13px] tracking-[0.13px] text-black/60">Delay(ms)</span>
          <div class="relative flex h-6 w-[60px] shrink-0 items-center rounded-full bg-black/5">
            <input
              v-model.number="delayMs"
              type="number"
              min="0"
              step="50"
              inputmode="numeric"
              class="h-full w-full bg-transparent pr-4 text-center text-[13px] tracking-[0.13px] text-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <div class="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col">
              <Icon name="chevron-up" :size="8" class="text-black/40" />
              <Icon name="chevron-down" :size="8" class="text-black/40" />
            </div>
          </div>
        </label>
      </div>

      <div class="flex items-center gap-2">
        <!-- Lưu Template: shrink-0, white bg, green text -->
        <button
          type="button"
          disabled
          class="shrink-0 cursor-not-allowed rounded-full bg-white px-[14px] py-[10px] text-[13px] tracking-[0.13px] text-[#006622] opacity-60 shadow-[0_16px_16px_rgba(0,177,115,0.06)]"
        >
          Lưu Template
        </button>
        <!-- Chạy: flex-1, gradient green -->
        <button
          type="button"
          class="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-full py-[10px] text-[13px] font-medium tracking-[0.13px] text-white disabled:cursor-not-allowed disabled:opacity-50"
          style="background: linear-gradient(270deg, rgb(124, 210, 73) 0%, rgb(51, 157, 54) 100%)"
          :disabled="!canRun"
          @click="runSelectedWorkflow"
        >
          <Icon :name="running ? 'loader-2' : 'play'" :size="14" :class="running ? 'mr-1.5 shrink-0 animate-spin' : 'mr-1.5 shrink-0'" />
          <span class="truncate">{{ running ? 'Đang chạy...' : `Chạy ${selectedFunctions.length} bước/${selectedCount} tài khoản` }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
