<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mf2/shared-ui';
import { Table } from '@mf2/shared-ui/table';
import { toast } from '@mf2/shared-ui/sonner';
import { VIEWER_CONFIGS, type ViewerRow } from '../data/viewer-configs';

// Generic interactive viewer modal. Given a viewer functionId + one bmId, it
// loads that BM's rows, renders them in a checkbox Table, and runs the config's
// inline actions against the checked rows (concurrently, never-throw) → toast →
// reload. One component serves manage-bag + manage-bm-admins via VIEWER_CONFIGS.
const props = defineProps<{
  open: boolean;
  functionId: string | null;
  bmId: string | null;
}>();
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>();

const config = computed(() => (props.functionId ? VIEWER_CONFIGS[props.functionId] : null) ?? null);

const rows = ref<ViewerRow[]>([]);
const selectedIds = ref<string[]>([]);
const loading = ref(false);
const running = ref(false);

async function load() {
  if (!config.value || !props.bmId) return;
  loading.value = true;
  selectedIds.value = [];
  try {
    const res = await config.value.load(props.bmId);
    if (res.ok) rows.value = res.rows;
    else {
      rows.value = [];
      toast.error(`Lỗi tải danh sách: ${res.message}`);
    }
  } catch (err) {
    // The loader tools never throw on FB errors, but extFetch itself rejects when
    // the SMIT Connect extension is missing/off — catch so the watch-triggered
    // load() doesn't become an unhandled rejection and the user sees why.
    rows.value = [];
    toast.error(`Lỗi tải danh sách: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    loading.value = false;
  }
}

// (Re)load whenever the dialog opens for a target.
watch(
  () => [props.open, props.functionId, props.bmId],
  () => {
    if (props.open) load();
  },
  { immediate: true }
);

// row-select carries the full selected set in `allSelected`; row-select-all
// carries it in `selected`. Normalise both to a string id list.
function onRowSelect(e: { allSelected: (string | number)[] }) {
  selectedIds.value = e.allSelected.map(String);
}
function onRowSelectAll(e: { selected: (string | number)[] }) {
  selectedIds.value = e.selected.map(String);
}

async function runAction(actionIndex: number) {
  const cfg = config.value;
  if (!cfg || !props.bmId || running.value) return;
  const action = cfg.actions[actionIndex];
  if (!action) return;
  const ids = [...selectedIds.value];
  if (ids.length === 0) return;

  running.value = true;
  try {
    const bmId = props.bmId;
    const results = await Promise.all(ids.map((id) => action.run(bmId, id)));
    const ok = results.filter((r) => r.ok).length;
    const errors = results.filter((r) => !r.ok).map((r) => r.message);
    if (ok > 0) toast.success(`${action.label}: thành công ${ok}/${ids.length}`);
    if (errors.length > 0) {
      toast.error(`${action.label}: ${errors.length}/${ids.length} thất bại`, {
        description: errors.join('\n'),
        duration: 8000,
      });
    }
    await load();
  } catch (err) {
    toast.error(`Lỗi: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    running.value = false;
  }
}

function close() {
  emit('update:open', false);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl border-white/10 bg-slate-950 text-white">
      <DialogHeader>
        <DialogTitle>{{ config?.title ?? 'Quản lý' }}</DialogTitle>
        <DialogDescription class="text-white/50">
          Thao tác trên BM: {{ bmId ?? '—' }} (chỉ thao tác BM đầu tiên trong danh sách đã chọn).
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-[320px] py-2">
        <p v-if="loading" class="py-8 text-center text-sm text-white/50">Đang tải...</p>
        <p v-else-if="rows.length === 0" class="py-8 text-center text-sm text-white/50">
          Không có dữ liệu.
        </p>
        <Table
          v-else
          :data="rows"
          :columns="config?.columns ?? []"
          :show-checkbox="true"
          :show-toolbar="false"
          @row-select="onRowSelect"
          @row-select-all="onRowSelectAll"
        />
      </div>

      <DialogFooter class="flex-wrap gap-2">
        <span class="mr-auto text-xs text-white/50">Đã chọn {{ selectedIds.length }}</span>
        <Button
          v-for="(action, i) in config?.actions ?? []"
          :key="action.label"
          type="button"
          :variant="action.variant ?? 'default'"
          :disabled="selectedIds.length === 0 || running"
          @click="runAction(i)"
        >
          {{ action.label }}
        </Button>
        <Button type="button" variant="ghost" @click="close">Đóng</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
