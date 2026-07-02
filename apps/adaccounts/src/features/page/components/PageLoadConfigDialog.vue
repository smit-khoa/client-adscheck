<script setup lang="ts">
import { ref } from 'vue';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Textarea,
} from '@mf2/shared-ui';
import { Icon } from '@mf2/shared-ui/icons';
import { usePageManager } from '../composables/use-page-manager';
import type { PageSource } from '../types/page-manager.types';

const { config, isLoading, loadPages } = usePageManager();

const open = ref(false);

const sourceOptions: Array<{ value: PageSource; label: string }> = [
  { value: 'all', label: 'Tải toàn bộ' },
  { value: 'mine', label: 'Page của tôi' },
  { value: 'bmIds', label: 'Theo ID BM' },
  { value: 'pageIds', label: 'Theo ID Page' },
];

const optionLabels: Array<{ key: keyof typeof config.options; label: string }> = [
  { key: 'status', label: 'Trạng thái' },
  { key: 'tick', label: 'Check tích' },
  { key: 'follow', label: 'Like + Follow' },
  { key: 'post', label: 'Check Post' },
  { key: 'pageLive', label: 'Page Live' },
  { key: 'monetize', label: 'Kiếm tiền' },
];

async function submit(): Promise<void> {
  open.value = false;
  await loadPages();
}
</script>

<template>
  <Dialog v-model:open="open">
    <TooltipProvider :delay-duration="300">
      <Tooltip>
        <TooltipTrigger as-child>
          <DialogTrigger as-child>
            <Button variant="secondary" size="icon" class="data-grid-toolbar-icon-button" aria-label="Cấu hình tải">
              <Icon name="settings" :size="18" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Cấu hình tải</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-950 text-white">
      <DialogHeader>
        <DialogTitle>Cấu hình tải dữ liệu Page</DialogTitle>
        <DialogDescription class="text-white/55">
          Chọn nguồn Page và nhóm dữ liệu cần tải. Resolve Page ID trước, sau đó tải detail bằng batch.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="page-source">Nguồn Page</Label>
            <Select v-model="config.source">
              <SelectTrigger id="page-source" class="border-white/10 bg-white/[0.04] text-white">
                <SelectValue placeholder="Chọn nguồn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in sourceOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="page-limit">Limit API</Label>
            <Input
              id="page-limit"
              v-model.number="config.pageLimit"
              class="border-white/10 bg-white/[0.04] text-white"
              type="number"
              min="1"
              max="500"
            />
          </div>
        </div>

        <div v-if="config.source === 'bmIds' || config.source === 'pageIds'" class="space-y-2">
          <Label for="page-ids">
            {{ config.source === 'bmIds' ? 'Danh sách ID BM' : 'Danh sách ID Page' }}
          </Label>
          <Textarea
            id="page-ids"
            v-model="config.ids"
            class="min-h-28 border-white/10 bg-white/[0.04] font-mono text-xs text-white"
            placeholder="Mỗi dòng hoặc cách nhau bằng dấu phẩy/khoảng trắng"
          />
        </div>

        <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div
            v-for="item in optionLabels"
            :key="item.key"
            class="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
          >
            <Label :for="`page-opt-${item.key}`" class="text-xs text-white/70">{{ item.label }}</Label>
            <Switch :id="`page-opt-${item.key}`" v-model="config.options[item.key]" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button :disabled="isLoading" @click="submit">
          {{ isLoading ? 'Đang tải...' : 'Tải dữ liệu' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
