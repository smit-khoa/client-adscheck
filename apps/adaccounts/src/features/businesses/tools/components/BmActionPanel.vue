<script setup lang="ts">
import { computed, ref } from 'vue';
import draggable from 'vuedraggable';
import { Input } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
import { useWorkspacePanels } from '@/composables/workspace/use-workspace-panels';
import { useBmActions } from '../composables/use-bm-actions';
import type { ToolFunction } from '../types';

interface ToolGroup {
  id: string;
  label: string;
  functions: ToolFunction[];
}

const { panelOneOpen } = useWorkspacePanels();
const { functions, selectedFunctionIds, selectFunction } = useBmActions();

const keyword = ref('');
const pinnedIds = ref<Set<string>>(new Set());
const openGroupIds = ref<Set<string>>(new Set(['group-1', 'group-2']));
const groups = ref<ToolGroup[]>(buildGroups());

const selectedSet = computed(() => new Set(selectedFunctionIds.value));
const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

function buildGroups(): ToolGroup[] {
  const midpoint = Math.ceil(functions.length / 2);
  return [
    { id: 'group-1', label: 'Group 1', functions: functions.slice(0, midpoint) },
    { id: 'group-2', label: 'Group 2', functions: functions.slice(midpoint) },
  ];
}

function isPinned(id: string): boolean {
  return pinnedIds.value.has(id);
}

function togglePinned(id: string): void {
  const next = new Set(pinnedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  pinnedIds.value = next;
}

function sortPinnedFirst(items: ToolFunction[]): ToolFunction[] {
  return [...items].sort((a, b) => Number(isPinned(b.id)) - Number(isPinned(a.id)));
}

const filteredGroups = computed(() => {
  const query = normalizedKeyword.value;
  return groups.value
    .map((group) => {
      const filtered = query
        ? group.functions.filter((fn) => `${group.label} ${fn.label}`.toLowerCase().includes(query))
        : group.functions;
      return { ...group, functions: sortPinnedFirst(filtered) };
    })
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
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] bg-transparent text-black">
    <div class="flex items-center justify-between px-5 py-4">
      <div>
        <h2 class="text-sm font-normal tracking-[-0.02em] text-black">Kho chức năng BM</h2>
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
        <button
          type="button"
          class="grid size-7 place-items-center rounded-full bg-white/60 text-black/75 transition-colors hover:bg-white"
          title="Thu gọn panel"
          aria-label="Thu gọn Function panel 1"
          @click="panelOneOpen = false"
        >
          <Icon name="chevron-right" :size="12" />
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2 px-5 pb-4">
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
        title="Chức năng đã ghim hiển thị trên từng dòng"
      >
        <Icon name="map-pin" :size="12" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto px-5 pb-5">
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
            <Icon name="folder" :size="18" class="shrink-0 text-sky-500" />
            <span class="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.02em]">{{ group.label }}</span>
            <span class="text-[13px] font-semibold text-emerald-600">{{ group.functions.length }}</span>
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
              handle=".bm-tool-drag-handle"
              :animation="160"
              ghost-class="opacity-40"
            >
              <template #item="{ element: fn }">
                <div
                  role="button"
                  tabindex="0"
                  class="flex h-[40px] w-full items-center gap-3 border-b border-black/[0.06] px-3 py-3 text-left last:border-b-0 transition-colors hover:bg-emerald-50/70"
                  :class="selectedSet.has(fn.id) ? 'bg-black/[0.025] opacity-60' : 'text-black'"
                  @click="selectFunction(fn.id)"
                  @keydown.enter.prevent="selectFunction(fn.id)"
                  @keydown.space.prevent="selectFunction(fn.id)"
                >
                  <span class="bm-tool-drag-handle -ml-1 grid size-7 shrink-0 cursor-grab place-items-center text-black/25 active:cursor-grabbing" @click.stop>
                    <Icon name="grip-vertical" :size="17" />
                  </span>
                  <Icon v-if="fn.icon" :name="fn.icon" :size="18" class="shrink-0 text-black" />
                  <span class="min-w-0 flex-1 truncate text-[13px] tracking-[-0.02em]">{{ fn.label }}</span>
                  <button
                    type="button"
                    class="grid size-6 shrink-0 place-items-center rounded-full text-black/35 transition hover:bg-emerald-50 hover:text-emerald-600"
                    :class="isPinned(fn.id) ? 'text-emerald-600' : ''"
                    :title="isPinned(fn.id) ? 'Bỏ ghim' : 'Ghim chức năng'"
                    @click.stop="togglePinned(fn.id)"
                  >
                    <Icon name="map-pin" :size="14" :class="isPinned(fn.id) ? 'fill-emerald-500' : ''" />
                  </button>
                  <Icon v-if="selectedSet.has(fn.id)" name="check" :size="14" class="shrink-0 text-emerald-600" />
                </div>
              </template>
            </draggable>

            <div
              v-for="fn in group.functions"
              v-else
              :key="fn.id"
              role="button"
              tabindex="0"
              class="flex h-[40px] w-full items-center gap-3 border-b border-black/[0.06] px-3 py-3 text-left last:border-b-0 transition-colors hover:bg-emerald-50/70"
              :class="selectedSet.has(fn.id) ? 'bg-black/[0.025] opacity-60' : 'text-black'"
              @click="selectFunction(fn.id)"
              @keydown.enter.prevent="selectFunction(fn.id)"
              @keydown.space.prevent="selectFunction(fn.id)"
            >
              <span class="-ml-1 grid size-7 shrink-0 place-items-center text-black/25">
                <Icon name="grip-vertical" :size="17" />
              </span>
              <Icon v-if="fn.icon" :name="fn.icon" :size="18" class="shrink-0 text-black" />
              <span class="min-w-0 flex-1 truncate text-[13px] tracking-[-0.02em]">{{ fn.label }}</span>
              <button
                type="button"
                class="grid size-6 shrink-0 place-items-center rounded-full text-black/35 transition hover:bg-emerald-50 hover:text-emerald-600"
                :class="isPinned(fn.id) ? 'text-emerald-600' : ''"
                :title="isPinned(fn.id) ? 'Bỏ ghim' : 'Ghim chức năng'"
                @click.stop="togglePinned(fn.id)"
              >
                <Icon name="map-pin" :size="14" :class="isPinned(fn.id) ? 'fill-emerald-500' : ''" />
              </button>
              <Icon v-if="selectedSet.has(fn.id)" name="check" :size="14" class="shrink-0 text-emerald-600" />
            </div>
          </div>
        </section>
      </div>

      <div v-else class="rounded-[24px] bg-white/80 px-4 py-8 text-center text-sm text-black/50">
        Không tìm thấy chức năng phù hợp.
      </div>
    </div>
  </div>
</template>
