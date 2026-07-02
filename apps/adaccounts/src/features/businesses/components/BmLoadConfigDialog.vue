<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Textarea,
} from '@mf2/shared-ui';
import { Icon } from '@mf2/shared-ui/icons';
import {
  BM_ADVANCED_GROUPS,
  DEFAULT_BM_LOAD_CONFIG,
  type BmAdvancedGroup,
  type BmLoadConfig,
  type BmLoadSource,
} from '../types/bm-data-loading.types';

interface Props {
  disabled?: boolean;
}

interface Emit {
  (e: 'submit', value: BmLoadConfig): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});
const emit = defineEmits<Emit>();

const open = ref(false);
const form = reactive({
  source: DEFAULT_BM_LOAD_CONFIG.source,
  idsText: '',
  advEnabled: DEFAULT_BM_LOAD_CONFIG.advEnabled,
  adv: { ...DEFAULT_BM_LOAD_CONFIG.adv },
  concurrency: String(DEFAULT_BM_LOAD_CONFIG.concurrency),
});

const groupLabels: Record<BmAdvancedGroup, string> = {
  status: 'Trạng thái',
  page: 'Page',
  limit: 'Limit',
  bmAccount: 'Tài khoản BM',
  partner: 'Đối tác',
  admin: 'Admin',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  share: 'Share',
  legacyType: 'Legacy type',
  legacyQuality: 'Legacy quality',
};

const parsedConcurrency = computed(() => Math.max(1, Math.floor(Number(form.concurrency) || 50)));

function parseIds(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean))];
}

function submit(): void {
  emit('submit', {
    source: form.source as BmLoadSource,
    ids: parseIds(form.idsText),
    advEnabled: form.advEnabled,
    adv: { ...form.adv },
    concurrency: parsedConcurrency.value,
  });
  open.value = false;
}
</script>

<template>
  <Dialog v-model:open="open">
    <TooltipProvider :delay-duration="300">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            class="data-grid-toolbar-icon-button"
            :disabled="props.disabled"
            aria-label="Cấu hình tải"
            @click="open = true"
          >
            <Icon name="settings" :size="18" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Cấu hình tải</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <DialogContent class="max-w-3xl border-white/10 bg-slate-950 text-white">
      <DialogHeader>
        <DialogTitle>Cấu hình tải Business Manager</DialogTitle>
        <DialogDescription class="text-white/50">
          Chọn nguồn BM và nhóm dữ liệu cần tải. Nhóm tắt sẽ không gọi API.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <div class="space-y-3">
          <Label>Nguồn tải dữ liệu</Label>
          <RadioGroup v-model="form.source" class="grid gap-2 sm:grid-cols-2">
            <label class="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm">
              <RadioGroupItem value="all" />
              <span>Tải toàn bộ BM</span>
            </label>
            <label class="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm">
              <RadioGroupItem value="byId" />
              <span>Tải theo BM ID</span>
            </label>
          </RadioGroup>
        </div>

        <div v-if="form.source === 'byId'" class="space-y-2">
          <Label for="bm-ids">Danh sách BM ID</Label>
          <Textarea id="bm-ids" v-model="form.idsText" placeholder="Mỗi dòng một BM ID" class="min-h-28" />
        </div>

        <div class="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div class="flex items-center justify-between rounded-lg border border-white/10 p-3">
            <div>
              <Label>Dữ liệu nâng cao</Label>
              <p class="mt-1 text-xs text-white/50">Tắt để chỉ tải base BM list.</p>
            </div>
            <Switch v-model="form.advEnabled" />
          </div>
          <div class="space-y-2">
            <Label for="bm-concurrency">Số luồng song song</Label>
            <Input id="bm-concurrency" v-model="form.concurrency" type="number" min="1" />
          </div>
        </div>

        <div v-if="form.advEnabled" class="grid gap-2 sm:grid-cols-3">
          <label
            v-for="group in BM_ADVANCED_GROUPS"
            :key="group"
            class="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm"
          >
            <Checkbox v-model="form.adv[group]" />
            <span>{{ groupLabels[group] }}</span>
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="open = false">Huỷ</Button>
        <Button type="button" :disabled="props.disabled" @click="submit">Bắt đầu tải</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
