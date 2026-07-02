<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@mf2/shared-ui/icons';
import { useClickOutside } from '../../composables/use-click-outside';
import DropdownPanel from './DropdownPanel.vue';

const unread = 3;
const isOpen = ref(false);
const root = ref<HTMLElement | null>(null);
useClickOutside(root, () => (isOpen.value = false));

const notifications = [
  { title: 'Đồng bộ tài sản hoàn tất', time: '2 phút trước', unread: true },
  { title: 'Hóa đơn tháng 4 đã sẵn sàng', time: '5 giờ trước', unread: true },
];
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      aria-label="Thông báo"
      class="relative flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-white/5 active:scale-95 text-white/60 hover:text-white"
      @click="isOpen = !isOpen"
    >
      <Icon name="bell" :size="18" />
      <span
        v-if="unread > 0"
        class="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-[#ef4444] shadow-[0_0_0_2px_#0b1421]"
      />
    </button>
    <DropdownPanel v-if="isOpen" :width="320">
      <div class="mb-1 flex items-center justify-between px-3.5 py-2">
        <span class="text-[12px] font-bold uppercase tracking-wider text-white/40">Thông báo</span>
        <button class="text-[11px] font-bold text-[#22c55e] hover:brightness-110">
          Đánh dấu đã đọc
        </button>
      </div>
      <div class="max-h-[360px] overflow-y-auto px-1">
        <button
          v-for="(n, i) in notifications"
          :key="i"
          type="button"
          class="group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span
            aria-hidden="true"
            class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            :style="{ background: n.unread ? '#22c55e' : 'transparent' }"
          />
          <span class="flex-1">
            <span class="block text-[13px]" :class="n.unread ? 'text-white' : 'text-white/65'">
              {{ n.title }}
            </span>
            <span class="mt-0.5 block text-[11.5px] text-white/35">{{ n.time }}</span>
          </span>
        </button>
      </div>
    </DropdownPanel>
  </div>
</template>
