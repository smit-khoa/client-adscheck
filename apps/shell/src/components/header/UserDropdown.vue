<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@mf2/shared-store';
import { Icon } from '@mf2/shared-ui/icons';
import { useClickOutside } from '../../composables/use-click-outside';
import DropdownPanel from './DropdownPanel.vue';

const auth = useAuthStore();
const isOpen = ref(false);
const root = ref<HTMLElement | null>(null);
useClickOutside(root, () => (isOpen.value = false));

const userName = computed(() => auth.user?.name || auth.user?.email || 'User');
const initial = computed(() => userName.value.slice(0, 1).toUpperCase());

function onLogout() {
  isOpen.value = false;
  auth.logout();
}
</script>

<template>
  <div v-if="auth.user" ref="root" class="relative">
    <button
      type="button"
      class="flex h-9 max-w-[200px] items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] pl-1 pr-2.5 transition-all hover:bg-white/5 active:scale-95"
      @click="isOpen = !isOpen"
    >
      <span
        aria-hidden="true"
        class="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-[#22c55e] to-[#14b8a6] text-[11px] font-bold text-[#0a1628]"
      >
        {{ initial }}
      </span>
      <span class="max-w-[110px] truncate text-[12.5px] font-bold text-white/70">
        {{ userName }}
      </span>
      <Icon
        name="chevron-down"
        :size="12"
        class="text-white/20 transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>
    <DropdownPanel v-if="isOpen" :width="260">
      <div class="flex items-center gap-3 px-3 py-3">
        <span
          aria-hidden="true"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#22c55e] to-[#14b8a6] text-[14px] font-semibold text-[#0a1628]"
        >
          {{ initial }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[13px] font-semibold text-white">
            {{ auth.user.name || 'Người dùng' }}
          </span>
          <span class="block truncate text-[11.5px] text-white/45">{{ auth.user.email }}</span>
        </span>
      </div>
      <div class="my-1 h-px w-full bg-white/10" />
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-white/75 transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        <span class="text-white/55"><Icon name="user" :size="16" /></span>
        Hồ sơ cá nhân
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-white/75 transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        <span class="text-white/55"><Icon name="settings" :size="16" /></span>
        Cài đặt tài khoản
      </button>
      <div class="my-1 h-px w-full bg-white/10" />
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[#ef4444] transition-colors hover:bg-[#ef4444]/10"
        @click="onLogout"
      >
        <Icon name="log-out" :size="16" />
        Đăng xuất
      </button>
    </DropdownPanel>
  </div>
</template>
