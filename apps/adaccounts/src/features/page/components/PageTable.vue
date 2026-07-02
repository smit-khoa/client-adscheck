<script setup lang="ts">
import { reactive, watch } from 'vue';
import { Table } from '@mf2/shared-ui/table';
import { usePageManager } from '../composables/use-page-manager';
import { usePageSelection } from '../composables/use-page-selection';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();

const { rows, isLoading, error, loadPages } = usePageManager();
const { selectedIds } = usePageSelection();

// Same two-way mirror as AdAccountTable: shared-ui Table mutates checkedConfig
// directly, so we mirror it to/from the Pinia selection store with member-equality
// guards (neither watcher loops). key_id is `pageId` so selected ids match the
// Page id the tool panel acts on.
const checkedConfig = reactive({
  selected: [...selectedIds.value],
  is_select_all: false,
});

const sameMembers = (list: string[], set: Set<string>) =>
  list.length === set.size && list.every((id) => set.has(id));

watch(
  () => checkedConfig.selected,
  (next) => {
    if (sameMembers(next, selectedIds.value)) return;
    selectedIds.value = new Set(next);
  },
  { deep: true }
);

watch(
  selectedIds,
  (next) => {
    if (sameMembers(checkedConfig.selected, next)) return;
    checkedConfig.selected = [...next];
  },
  { deep: true }
);

const columns = [
  { field: 'status', name: 'Trạng thái', width: 120 },
  { field: 'name', name: 'Tên Page', width: 240 },
  { field: 'pageId', name: 'Page ID', width: 160 },
  { field: 'role', name: 'Quyền', width: 150 },
  { field: 'bm', name: 'BM', width: 160 },
  { field: 'adminCount', name: 'SL Admin', width: 110 },
  { field: 'createdDate', name: 'Ngày tạo', width: 120 },
  { field: 'likes', name: 'Like', width: 100 },
  { field: 'follows', name: 'Follow', width: 110 },
  { field: 'type', name: 'Loại', width: 120 },
  { field: 'postCount', name: 'SL Post', width: 100 },
  { field: 'pageTick', name: 'Page tích', width: 120 },
  { field: 'pageLive', name: 'Page live', width: 120 },
  { field: 'monetize', name: 'Kiếm tiền', width: 180 },
  { field: 'profileId', name: 'ID Profile', width: 160 },
  { field: 'error', name: 'Lỗi', width: 220 },
];

const formatCopyValue = (key: string, row: Record<string, any>): string | undefined => {
  const value = row[key];
  if (value === null || value === undefined) return '';
  return undefined;
};
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <p v-if="error" class="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
      {{ error }}
    </p>

    <Table
      :data="rows"
      :columns="columns"
      :loading="isLoading"
      :checked-config="checkedConfig"
      :table_info="{ name: 'pages', key_id: 'rowKey' }"
      :tools="['refresh', 'time', 'custom-column', 'zoom']"
      :toolbar-target="toolbarTarget"
      :format-copy-value="formatCopyValue"
      enable-range-select
      show-checkbox
      @refresh="loadPages"
    >
      <template #status="{ value }">
        <span
          class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
          :class="value === 'Live' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'"
        >
          {{ value || '--' }}
        </span>
      </template>
      <template #name="{ row, value }">
        <div class="flex items-center gap-2">
          <img v-if="row.avatar" :src="row.avatar" alt="" class="h-6 w-6 rounded-full" />
          <span>{{ value }}</span>
        </div>
      </template>
      <template #pageId="{ value }">
        <span class="font-mono text-xs text-white/40">{{ value }}</span>
      </template>
      <template #bm="{ row, value }">
        <span class="font-mono text-xs text-white/50">{{ row.bmName || value || '--' }}</span>
      </template>
      <template #error="{ value }">
        <span class="text-xs text-red-300">{{ value }}</span>
      </template>
    </Table>
  </div>
</template>
