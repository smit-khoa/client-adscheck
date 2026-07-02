<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { Table } from '@mf2/shared-ui/table';
import { useAccountList } from '../composables/use-account-list';
import { useAccountSelection } from '../composables/use-account-selection';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();

const { accounts, isLoading, error, ensureLoaded, refresh } = useAccountList();
const { selectedIds } = useAccountSelection();

// Load the real account list on first mount; the grid refresh button reloads it.
onMounted(ensureLoaded);

// Facebook account_status code -> display meta. Codes from the reference tool
// (1=active, 2=disabled, 3=unsettled, 7=pending-review, 9=pending-closure,
// 101=closed). Unknown codes fall back to a neutral chip.
const STATUS_META: Record<number, { label: string; class: string }> = {
  1: { label: 'Đang chạy', class: 'bg-emerald-500/15 text-emerald-300' },
  2: { label: 'Vô hiệu', class: 'bg-white/10 text-white/50' },
  3: { label: 'Chưa thanh toán', class: 'bg-amber-500/15 text-amber-300' },
  7: { label: 'Đang xét duyệt', class: 'bg-amber-500/15 text-amber-300' },
  9: { label: 'Chờ đóng', class: 'bg-amber-500/15 text-amber-300' },
  101: { label: 'Đã đóng', class: 'bg-red-500/15 text-red-300' },
};

const statusMeta = (code: number) =>
  STATUS_META[code] ?? { label: `Mã ${code}`, class: 'bg-white/10 text-white/50' };

// Copy formatter mirrors the on-screen text so paste into Excel matches what the
// user sees (Vietnamese status label) instead of the raw status code.
const formatCopyValue = (key: string, row: Record<string, any>): string | undefined => {
  if (key === 'status') return statusMeta(row.status as number).label;
  if (key === 'paymentStatus') return paymentStatusLabel(row.paymentStatus as string | undefined);
  if (key === 'holdNeed') return row.holdNeed as string | undefined;
  if (key === 'priskRestrictions' && Array.isArray(row.priskRestrictions)) return row.priskRestrictions.join(', ');
  return undefined;
};

const columns = [
  { field: 'status', name: 'Trạng thái', width: 150 },
  { field: 'name', name: 'Tài khoản', width: 260 },
  { field: 'id', name: 'ID TKQC', width: 180 },
  { field: 'balance', name: 'Số dư', width: 120 },
  { field: 'threshold', name: 'Ngưỡng', width: 120 },
  { field: 'limit', name: 'Limit', width: 110 },
  { field: 'spent', name: 'Tổng tiêu', width: 120 },
  { field: 'currency', name: 'Tiền tệ', width: 90 },
  { field: 'ownership', name: 'Quyền', width: 130 },
  { field: 'spendLimit', name: 'Spend Cap', width: 130 },
  { field: 'paymentStatus', name: 'Thanh toán', width: 130 },
  { field: 'created', name: 'Ngày tạo', width: 160 },
  { field: 'type', name: 'Loại TK', width: 110 },
  { field: 'timezone', name: 'Múi giờ', width: 180 },
  { field: 'bmName', name: 'BM', width: 180 },
  { field: 'country', name: 'Quốc gia', width: 100 },
  { field: 'note', name: 'Ghi chú', width: 160 },
  { field: 'remainThreshold', name: 'Ngưỡng còn lại', width: 140 },
  { field: 'billDate', name: 'Ngày lập hóa đơn', width: 150 },
  { field: 'daysToDue', name: 'Ngày đến hạn TT', width: 140 },
  { field: 'lockReason', name: 'Lý do khóa', width: 140 },
  { field: 'hiddenLimit', name: 'Limit ẩn', width: 120 },
  { field: 'adminCount', name: 'SL Admin', width: 100 },
  { field: 'line2Bm', name: 'Dòng 2 BM', width: 180 },
  { field: 'ownerName', name: 'Chủ sở hữu', width: 160 },
  { field: 'holdNeed', name: 'HOLD/NEED', width: 260 },
];

const paymentStatusLabel = (status?: string) => {
  if (status === 'loaded') return 'Đã tải';
  if (status === 'error') return 'Lỗi';
  if (status === 'unavailable') return 'Không có';
  return 'Bỏ qua';
};

// shared-ui Table owns the row/header checkboxes and mutates checkedConfig.selected
// directly (its row-select emits are declared-but-never-emitted). To keep the Pinia
// selection store as the single source of truth, mirror both ways with member-equality
// guards so neither watcher loops: Table edits checkedConfig -> store; store edits -> grid.
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
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-transparent">
    <p v-if="error" class="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
      {{ error }}
    </p>

    <div class="min-h-0 flex-1 overflow-hidden">
      <Table
        :data="accounts"
        :columns="columns"
        :loading="isLoading"
        :checked-config="checkedConfig"
        :table_info="{ name: 'ad-accounts', key_id: 'id' }"
        :tools="['refresh', 'time', 'custom-column', 'zoom', 'download']"
        :toolbar-target="toolbarTarget"
        :format-copy-value="formatCopyValue"
        enable-range-select
        show-checkbox
        @refresh="refresh"
      >
        <template #status="{ value }">
          <span
            class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusMeta(value as number).class"
          >
            {{ statusMeta(value as number).label }}
          </span>
        </template>
        <template #paymentStatus="{ value, row }">
          <span class="text-xs text-white/80">{{ paymentStatusLabel(value as string | undefined) }}</span>
          <span v-if="(row as Record<string, any>).payment" class="ml-1 text-xs text-white/35">
            {{ (row as Record<string, any>).payment }}
          </span>
        </template>
        <template #holdNeed="{ value }">
          <span class="text-xs text-amber-300">{{ value || '-' }}</span>
        </template>

      </Table>
    </div>
  </div>
</template>
