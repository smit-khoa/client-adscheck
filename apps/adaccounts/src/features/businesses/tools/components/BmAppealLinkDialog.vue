<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mf2/shared-ui';
import { Icon } from '@mf2/shared-ui/icons';
import { toast } from '@mf2/shared-ui/sonner';
import { getAppealLink, type AppealLinkResult } from '../../../../api/tools/bm/get-appeal-link';

// Appeal-link output dialog. Given the selected BM ids, it fetches one appeal link
// per BM and shows a result row each: BM id, status, link + copy/open. Distinct
// from BmManagerDialog because that one is "one BM + mutation per row"; this is a
// read-only multi-BM output table (no checkbox, no mutation). Never-throw per BM.
const props = defineProps<{ open: boolean; bmIds: string[] }>();
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>();

const rows = ref<AppealLinkResult[]>([]);
const loading = ref(false);

// Bounded concurrency (3 lanes): 2 FB calls/BM × many BMs would otherwise burst.
async function loadAll(bmIds: string[]) {
  loading.value = true;
  rows.value = [];
  const results: AppealLinkResult[] = [];
  let next = 0;
  async function worker() {
    while (true) {
      const bmId = bmIds[next++];
      if (!bmId) return;
      try {
        results.push(await getAppealLink(bmId));
      } catch (err) {
        // getAppealLink already guards extFetch, but keep the lane alive on any
        // unexpected throw so one bad BM never aborts the rest.
        results.push({
          bmId,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  const lanes = Math.min(3, Math.max(bmIds.length, 1));
  await Promise.all(Array.from({ length: lanes }, worker));
  rows.value = results;
  loading.value = false;
}

watch(
  () => [props.open, props.bmIds],
  () => {
    if (props.open) loadAll([...props.bmIds]);
  },
  { immediate: true }
);

async function copyLink(link: string) {
  try {
    await navigator.clipboard.writeText(link);
    toast.success('Đã sao chép link');
  } catch {
    toast.error('Không sao chép được (clipboard bị chặn)');
  }
}

function openLink(link: string) {
  window.open(link, '_blank');
}

function close() {
  emit('update:open', false);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl border-white/10 bg-slate-950 text-white">
      <DialogHeader>
        <DialogTitle>Link kháng BM</DialogTitle>
        <DialogDescription class="text-white/50">
          Mỗi BM một link kháng. Dòng lỗi hiện thông báo thay cho link.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-[280px] py-2">
        <p v-if="loading" class="py-8 text-center text-sm text-white/50">Đang lấy link...</p>
        <p v-else-if="rows.length === 0" class="py-8 text-center text-sm text-white/50">
          Không có dữ liệu.
        </p>
        <table v-else class="w-full text-left text-sm">
          <thead class="text-xs text-white/50">
            <tr class="border-b border-white/10">
              <th class="px-2 py-2">BM ID</th>
              <th class="px-2 py-2">Trạng thái</th>
              <th class="px-2 py-2">Link / Thông báo</th>
              <th class="px-2 py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.bmId" class="border-b border-white/5">
              <td class="px-2 py-2 font-mono text-xs">{{ row.bmId }}</td>
              <td class="px-2 py-2 text-xs text-white/70">{{ row.status ?? '—' }}</td>
              <td class="px-2 py-2">
                <span v-if="row.ok" class="block max-w-md truncate font-mono text-xs text-sky-300">
                  {{ row.link }}
                </span>
                <span v-else class="text-xs text-rose-400">{{ row.message }}</span>
              </td>
              <td class="px-2 py-2">
                <div v-if="row.ok && row.link" class="flex justify-end gap-1">
                  <Button size="sm" variant="outline" @click="copyLink(row.link)">
                    <Icon name="copy" :size="14" />
                    <span>Copy</span>
                  </Button>
                  <Button size="sm" variant="outline" @click="openLink(row.link)">
                    <Icon name="external-link" :size="14" />
                    <span>Mở</span>
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-end">
        <Button type="button" variant="ghost" @click="close">Đóng</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
