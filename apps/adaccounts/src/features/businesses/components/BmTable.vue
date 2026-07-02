<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { Badge } from '@mf2/shared-ui';
import { Table } from '@mf2/shared-ui/table';
import type { BmAdvancedGroup, BmLoadConfig, BmRow } from '../types/bm-data-loading.types';
import { useBmSelection } from '../composables/use-bm-selection';

interface Props {
  rows: BmRow[];
  loading: boolean;
  config: BmLoadConfig | null;
  toolbarTarget?: string | HTMLElement;
}

interface Emit {
  (e: 'refresh'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emit>();

const { selectedBmIds } = useBmSelection();

// shared-ui Table owns the row/header checkboxes and mutates checkedConfig.selected
// directly. Mirror it both ways with the Pinia BM-selection store as the single
// source of truth (member-equality guards so neither watcher loops). Same pattern
// as AdAccountTable — the BM action panel reads selectedBmIds to run on chosen BMs.
const checkedConfig = reactive({
  selected: [...selectedBmIds.value],
  is_select_all: false,
});

const sameMembers = (list: string[], set: Set<string>) =>
  list.length === set.size && list.every((id) => set.has(id));

watch(
  () => checkedConfig.selected,
  (next) => {
    if (sameMembers(next, selectedBmIds.value)) return;
    selectedBmIds.value = new Set(next);
  },
  { deep: true }
);

watch(
  selectedBmIds,
  (next) => {
    if (sameMembers(checkedConfig.selected, next)) return;
    checkedConfig.selected = [...next];
  },
  { deep: true }
);

const baseColumns = [
  { field: 'status', name: 'Trạng thái', width: 140 },
  { field: 'bmId', name: 'ID BM', width: 160 },
  { field: 'name', name: 'Tên BM', width: 220 },
  { field: 'type', name: 'Loại BM', width: 140 },
  { field: 'role', name: 'Quyền', width: 140 },
  { field: 'createdDate', name: 'Ngày tạo', width: 120 },
  { field: 'notify', name: 'Xác minh DN', width: 140 },
  { field: 'tier', name: 'BM hạng', width: 110 },
  { field: 'appCount', name: 'Ứng dụng', width: 110 },
];

const groupColumns: Record<BmAdvancedGroup, Array<{ field: string; name: string; width: number }>> = {
  status: [
    { field: 'appealLabel', name: 'Nút Kháng', width: 150 },
    { field: 'appealDaysLeft', name: 'Ngày Die', width: 130 },
  ],
  page: [
    { field: 'pageCount', name: 'SL Page', width: 110 },
    { field: 'assetSummary', name: 'Tài sản', width: 230 },
  ],
  limit: [
    { field: 'limit', name: 'Limit', width: 120 },
    { field: 'currency', name: 'Tiền tệ', width: 110 },
    { field: 'spend', name: 'Chi tiêu', width: 120 },
  ],
  bmAccount: [
    { field: 'accountBm', name: 'SL Account BM', width: 210 },
  ],
  partner: [
    { field: 'partnerCount', name: 'SL đối tác', width: 110 },
  ],
  admin: [
    { field: 'admin', name: 'SL Admin', width: 220 },
  ],
  instagram: [
    { field: 'instagramCount', name: 'SL IG', width: 100 },
  ],
  whatsapp: [],
  share: [
    { field: 'accountShare', name: 'SL Account Share', width: 210 },
  ],
  legacyType: [
    { field: 'legacyType', name: 'Legacy type', width: 140 },
  ],
  legacyQuality: [
    { field: 'legacyQuality', name: 'Legacy quality', width: 150 },
    { field: 'legacyStatus', name: 'Legacy status', width: 150 },
  ],
};

const columns = computed(() => {
  const result = [...baseColumns];
  const config = props.config;
  if (!config?.advEnabled) return result;
  for (const group of Object.keys(groupColumns) as BmAdvancedGroup[]) {
    if (config.adv[group]) result.push(...groupColumns[group]);
  }
  return result;
});
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-transparent">
    <Table
      :data="rows"
      :columns="columns"
      :loading="loading"
      :checked-config="checkedConfig"
      :table_info="{ name: 'bm-data-loading', key_id: 'bmId' }"
      :tools="['refresh', 'time', 'custom-column', 'zoom']"
      :toolbar-target="toolbarTarget"
      enable-range-select
      show-checkbox
      @refresh="emit('refresh')"
    >
      <template #status="{ value }">
        <Badge :variant="value === 'Live' ? 'secondary' : 'destructive'">{{ value }}</Badge>
      </template>
    </Table>
  </div>
</template>
