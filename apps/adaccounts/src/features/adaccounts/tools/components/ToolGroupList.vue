<script setup lang="ts">
import { computed, ref } from 'vue';
import draggable from 'vuedraggable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mf2/shared-ui';
import { Input } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
import type { ToolFunction, ToolGroup } from '@/types/tool-action.types';

interface Props {
  groups: ToolGroup[];
  selectedFunctionId: string | null;
  selectedFunctionIds: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-function', id: string): void;
}>();

const GROUP_ORDER_STORAGE_KEY = 'adaccounts.tool-ui-group-order.v1';
const PINNED_FUNCTION_IDS = new Set(['share-partner']);
const DISABLED_FUNCTION_IDS = new Set(['add-user', 'add-card', 'change-info']);

const keyword = ref('');
const openGroupIds = ref<Set<string>>(new Set([props.groups[0]?.id ?? '']));
const uiGroups = ref<ToolGroup[]>(buildInitialGroups());

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

function loadGroupOrder(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(GROUP_ORDER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function orderFunctions(functions: ToolFunction[], savedIds: string[] | undefined): ToolFunction[] {
  if (!savedIds?.length) return [...functions];

  const byId = new Map(functions.map((fn) => [fn.id, fn]));
  const ordered: ToolFunction[] = [];
  for (const id of savedIds) {
    const fn = byId.get(id);
    if (fn) {
      ordered.push(fn);
      byId.delete(id);
    }
  }
  for (const fn of functions) {
    if (byId.has(fn.id)) ordered.push(fn);
  }
  return ordered;
}

function buildInitialGroups(): ToolGroup[] {
  const savedOrder = loadGroupOrder();
  return props.groups.map((group) => ({
    ...group,
    functions: orderFunctions(group.functions, savedOrder[group.id]),
  }));
}

function persistGroupOrder(): void {
  const payload = Object.fromEntries(
    uiGroups.value.map((group) => [group.id, group.functions.map((fn) => fn.id)])
  );
  try {
    localStorage.setItem(GROUP_ORDER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / unavailable storage — order still applies this session
  }
}

function selectedStepNumber(id: string): number | null {
  const index = props.selectedFunctionIds.indexOf(id);
  return index >= 0 ? index + 1 : null;
}

function isSelected(id: string): boolean {
  return props.selectedFunctionIds.includes(id);
}

function isPinned(id: string): boolean {
  return PINNED_FUNCTION_IDS.has(id);
}

function isDisabled(id: string): boolean {
  return DISABLED_FUNCTION_IDS.has(id);
}

function selectedCount(group: ToolGroup): number {
  return group.functions.filter((fn) => isSelected(fn.id)).length;
}

const filteredGroups = computed(() => {
  const query = normalizedKeyword.value;
  if (!query) return uiGroups.value;

  return uiGroups.value
    .map((group) => ({
      ...group,
      functions: group.functions.filter((fn) =>
        `${group.label} ${fn.label}`.toLowerCase().includes(query)
      ),
    }))
    .filter((group) => group.functions.length > 0);
});

function isGroupOpen(id: string): boolean {
  return openGroupIds.value.has(id) || Boolean(normalizedKeyword.value);
}

function toggleGroup(id: string): void {
  const next = new Set(openGroupIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  openGroupIds.value = next;
}

function selectFunction(id: string): void {
  if (isDisabled(id)) return;
  emit('select-function', id);
}

function rowClasses(id: string): string[] {
  if (isDisabled(id)) {
    return ['cursor-not-allowed bg-black/[0.015] opacity-50'];
  }
  if (isSelected(id)) {
    return ['bg-black/[0.025] opacity-50'];
  }
  return ['text-black hover:bg-emerald-50/70'];
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="flex h-full min-h-0 flex-col gap-4">
    <div class="flex items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <Icon name="search" :size="12" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/70" />
        <Input v-model="keyword" class="h-8 pl-10 text-sm" placeholder="Tìm kiếm" />
      </div>
      <button
        type="button"
        disabled
        class="grid size-8 shrink-0 cursor-not-allowed place-items-center rounded-full bg-white/60 text-black/35"
        title="Lịch sử thao tác — chưa hỗ trợ"
      >
        <Icon name="clock" :size="12" />
      </button>
      <button
        type="button"
        disabled
        class="grid size-8 shrink-0 cursor-not-allowed place-items-center rounded-full bg-white/60 text-black/35"
        title="Chức năng đã ghim — chưa hỗ trợ"
      >
        <Icon name="map-pin" :size="12" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto pr-1">
      <div v-if="filteredGroups.length > 0" class="space-y-3">
        <section
          v-for="group in filteredGroups"
          :key="group.id"
          class="overflow-hidden rounded-[20px] bg-white text-black shadow-[0_16px_32px_0_rgba(0,177,115,0.06)]"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-black/[0.03]"
            @click="toggleGroup(group.id)"
          >
            <Icon v-if="group.icon" :name="group.icon" :size="18" class="shrink-0 text-sky-500" />
            <span class="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.02em]">{{ group.label }}</span>
            <span class="text-[13px] font-semibold text-emerald-600">{{ selectedCount(group) }}/{{ group.functions.length }}</span>
            <Icon
              name="chevron-down"
              :size="16"
              class="shrink-0 text-black/25 transition-transform"
              :class="isGroupOpen(group.id) ? 'rotate-180' : ''"
            />
          </button>

          <div v-if="isGroupOpen(group.id)" class="border-t border-black/[0.06]">
            <draggable
              v-if="!normalizedKeyword"
              v-model="group.functions"
              item-key="id"
              handle=".tool-group-drag-handle"
              :animation="160"
              ghost-class="opacity-40"
              @end="persistGroupOrder"
            >
              <template #item="{ element: fn }">
                <button
                  type="button"
                  class="flex h-[40px] w-full items-center gap-3 border-b border-black/[0.06] px-3 py-3 text-left last:border-b-0 transition-colors"
                  :class="rowClasses(fn.id)"
                  :aria-disabled="isDisabled(fn.id)"
                  @click="selectFunction(fn.id)"
                >
                  <span
                    class="tool-group-drag-handle -ml-1 grid size-7 shrink-0 cursor-grab place-items-center text-black/30 transition-colors hover:text-black/50 active:cursor-grabbing"
                    title="Kéo để sắp xếp"
                    @click.stop
                  >
                    <Icon name="grip-vertical" :size="17" />
                  </span>
                  <Icon
                    v-if="fn.icon"
                    :name="fn.icon"
                    :size="18"
                    class="shrink-0"
                    :class="isSelected(fn.id) || isDisabled(fn.id) ? 'text-current' : 'text-black'"
                  />
                  <span class="min-w-0 flex-1 truncate text-[13px] tracking-[-0.02em]">{{ fn.label }}</span>
                  <Icon v-if="isPinned(fn.id)" name="map-pin" :size="14" class="shrink-0 fill-emerald-500 text-emerald-600" />
                  <Icon v-if="isSelected(fn.id)" name="check" :size="14" class="shrink-0 text-emerald-600" />
                  <Tooltip v-else-if="isDisabled(fn.id)">
                    <TooltipTrigger as-child>
                      <span class="grid size-6 shrink-0 place-items-center text-black/45">
                        <Icon name="square-lock-02" :size="14" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent class="max-w-[220px]">
                      Chưa đủ quyền hoặc chưa đăng nhập
                    </TooltipContent>
                  </Tooltip>
                </button>
              </template>
            </draggable>

            <button
              v-for="fn in group.functions"
              v-else
              :key="fn.id"
              type="button"
              class="flex h-[40px] w-full items-center gap-3 border-b border-black/[0.06] px-3 py-3 text-left last:border-b-0 transition-colors"
              :class="rowClasses(fn.id)"
              :aria-disabled="isDisabled(fn.id)"
              :title="isDisabled(fn.id) ? 'Chưa đủ quyền hoặc chưa đăng nhập' : undefined"
              @click="selectFunction(fn.id)"
            >
              <span class="-ml-1 grid size-7 shrink-0 place-items-center text-black/20">
                <Icon name="grip-vertical" :size="17" />
              </span>
              <Icon
                v-if="fn.icon"
                :name="fn.icon"
                :size="22"
                class="shrink-0"
                :class="isSelected(fn.id) || isDisabled(fn.id) ? 'text-current' : 'text-black'"
              />
              <span class="min-w-0 flex-1 truncate text-[13px] tracking-[-0.02em]">{{ fn.label }}</span>
              <Icon v-if="isPinned(fn.id)" name="map-pin" :size="14" class="shrink-0 fill-emerald-500 text-emerald-600" />
              <Icon v-if="isSelected(fn.id)" name="check" :size="14" class="shrink-0 text-emerald-600" />
              <Tooltip v-else-if="isDisabled(fn.id)">
                <TooltipTrigger as-child>
                  <span class="grid size-6 shrink-0 place-items-center text-black/45">
                    <Icon name="square-lock-02" :size="14" />
                  </span>
                </TooltipTrigger>
                <TooltipContent class="max-w-[220px]">
                  Chưa đủ quyền hoặc chưa đăng nhập
                </TooltipContent>
              </Tooltip>
            </button>
          </div>
        </section>
      </div>

      <div v-else class="rounded-[24px] bg-white/80 px-4 py-8 text-center text-sm text-black/50">
        Không tìm thấy chức năng phù hợp.
      </div>
    </div>
    </div>
  </TooltipProvider>
</template>
