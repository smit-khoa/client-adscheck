<script setup lang="ts">
import { reactive, computed } from 'vue';
import {
  Button,
  Checkbox,
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
import type { LoadAdAccountsConfig } from '../types/account-list.types';

interface Emit {
  (e: 'load', config: LoadAdAccountsConfig): void;
}

const emit = defineEmits<Emit>();

const config = reactive<LoadAdAccountsConfig>({
  source: 'all',
  bmIds: '',
  advanced: true,
  options: {
    basic: true,
    payment: true,
    finance: true,
    spendInsights: true,
    admin: true,
    checkHold: false,
    hiddenBm: false,
  },
  permission: 'all',
  accountType: 'all',
  pageLimit: 100,
});

const needsIds = computed(() => config.source === 'tkqcIds' || config.source === 'bmIds');
const idsPlaceholder = computed(() =>
  config.source === 'tkqcIds'
    ? 'act_1234567890\n1234567891\n123,456;789'
    : '123456789012345\n234567890123456'
);

function submit(): void {
  const pageLimit = Math.min(500, Math.max(1, Math.floor(Number(config.pageLimit) || 1)));
  emit('load', {
    ...config,
    pageLimit,
    options: {
      ...config.options,
      // hiddenBm is visible for parity with bmmanager config, but not wired
      // until a real API source is confirmed.
      hiddenBm: false,
    },
  });
}
</script>

<template>
  <Dialog>
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
        <DialogTitle>Cấu hình tải dữ liệu TKQC</DialogTitle>
        <DialogDescription class="text-white/55">
          Chọn nguồn tải, nhóm dữ liệu và số luồng. Payment chạy queue riêng để lỗi thanh toán không làm mất dữ liệu cơ bản.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <Label>Nguồn tải</Label>
            <Select v-model="config.source">
              <SelectTrigger class="border-white/10 bg-white/[0.04] text-white">
                <SelectValue placeholder="Chọn nguồn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tải toàn bộ</SelectItem>
                <SelectItem value="tkqcIds">Theo ID TKQC</SelectItem>
                <SelectItem value="bmIds">Theo ID BM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Quyền TKQC</Label>
            <Select v-model="config.permission">
              <SelectTrigger class="border-white/10 bg-white/[0.04] text-white">
                <SelectValue placeholder="Chọn quyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="hasRole">Có quyền</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Loại tài khoản</Label>
            <Select v-model="config.accountType">
              <SelectTrigger class="border-white/10 bg-white/[0.04] text-white">
                <SelectValue placeholder="Chọn loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="personal">Cá nhân</SelectItem>
                <SelectItem value="bm">BM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-if="needsIds" class="space-y-2">
          <Label>{{ config.source === 'tkqcIds' ? 'Danh sách ID TKQC' : 'Danh sách ID BM' }}</Label>
          <Textarea
            v-model="config.bmIds"
            class="min-h-28 border-white/10 bg-white/[0.04] font-mono text-xs text-white"
            :placeholder="idsPlaceholder"
          />
          <p class="text-xs text-white/45">Chấp nhận ID cách nhau bằng dòng mới, dấu phẩy, dấu chấm phẩy hoặc có prefix act_.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-3 rounded-lg border border-white/10 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <Label>Dữ liệu nâng cao</Label>
                <p class="text-xs text-white/45">Tắt để chỉ lấy seed/basic tối thiểu.</p>
              </div>
              <Switch v-model="config.advanced" />
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <label class="flex items-center gap-2 text-sm text-white/80">
                <Checkbox v-model="config.options.basic" :disabled="!config.advanced" /> Cơ bản
              </label>
              <label class="flex items-center gap-2 text-sm text-white/80">
                <Checkbox v-model="config.options.finance" :disabled="!config.advanced" /> Tài chính
              </label>
              <label class="flex items-center gap-2 text-sm text-white/80">
                <Checkbox v-model="config.options.spendInsights" :disabled="!config.advanced" /> Spend insights
              </label>
              <label class="flex items-center gap-2 text-sm text-white/80">
                <Checkbox v-model="config.options.payment" :disabled="!config.advanced" /> Thanh toán
              </label>
              <label class="flex items-center gap-2 text-sm text-white/80">
                <Checkbox v-model="config.options.admin" :disabled="!config.advanced" /> Quản trị viên
              </label>
              <label class="flex items-center gap-2 text-sm text-white/80">
                <Checkbox v-model="config.options.checkHold" :disabled="!config.advanced" /> Check Hold
              </label>
            </div>
          </div>

          <div class="space-y-3 rounded-lg border border-white/10 p-3">
            <div class="space-y-2">
              <Label for="page-limit">Số luồng song song</Label>
              <Input
                id="page-limit"
                v-model="config.pageLimit"
                class="border-white/10 bg-white/[0.04] text-white"
                min="1"
                max="500"
                type="number"
              />
              <p class="text-xs text-white/45">Dùng cho detail/payment workers, không phải số dòng/trang.</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <p class="text-xs font-medium text-amber-200">Chưa bật vì thiếu source API xác nhận</p>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <label class="flex items-center gap-2 text-sm text-white/45">
              <Checkbox disabled /> TK ẩn BM
            </label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button :disabled="needsIds && !config.bmIds.trim()" @click="submit">Tải dữ liệu</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
