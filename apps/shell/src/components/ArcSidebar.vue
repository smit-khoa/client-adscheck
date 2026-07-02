<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Icon, type IconName } from '@mf2/shared-ui/icons';

interface NavItem {
  label: string;
  path: string;
  iconName: IconName;
}

interface SidebarLayout {
  railWidth: number;
  topPadding: number;
  bottomPadding: number;
  primaryItemSize: number;
  primaryGap: number;
  secondaryItemSize: number;
  secondaryGap: number;
}

interface Props {
  primaryItems?: NavItem[];
  secondaryItems?: NavItem[];
  layout?: SidebarLayout;
}

const DEFAULT_PRIMARY_ITEMS: NavItem[] = [
  { label: 'Trang chính', path: '/home', iconName: 'home' },
  { label: 'Adscheck Pro', path: '/adscheck-pro/adaccounts', iconName: 'bar-chart-2' },
  { label: 'Ads Save', path: '/ads-save', iconName: 'folder' },
  { label: 'Super Target', path: '/super-target', iconName: 'circle-check' },
];

const DEFAULT_SECONDARY_ITEMS: NavItem[] = [
  { label: 'Cài đặt', path: '/settings', iconName: 'settings' },
  { label: 'Hỗ trợ', path: '/support', iconName: 'message-circle' },
  { label: 'Tài khoản', path: '/account', iconName: 'user' },
];

const DEFAULT_LAYOUT: SidebarLayout = {
  railWidth: 58,
  topPadding: 12,
  bottomPadding: 16,
  primaryItemSize: 36,
  primaryGap: 8,
  secondaryItemSize: 36,
  secondaryGap: 0,
};

const props = defineProps<Props>();

const effectivePrimaryItems = computed(() => props.primaryItems ?? DEFAULT_PRIMARY_ITEMS);
const effectiveSecondaryItems = computed(() => props.secondaryItems ?? DEFAULT_SECONDARY_ITEMS);
const effectiveLayout = computed(() => props.layout ?? DEFAULT_LAYOUT);

const route = useRoute();

const activeRoot = computed(() => {
  if (route.path === '/adscheck-pro' || route.path.startsWith('/adscheck-pro/')) return '/adscheck-pro';
  return `/${route.path.split('/')[1] ?? ''}`;
});

function isActive(item: NavItem): boolean {
  if (item.path === '/adscheck-pro/adaccounts') return activeRoot.value === '/adscheck-pro';
  return item.path === activeRoot.value;
}
</script>

<template>
  <aside
    class="absolute bottom-0 left-0 top-0 z-20 flex flex-col items-center justify-between text-white"
    :style="{
      width: `${effectiveLayout.railWidth}px`,
      paddingTop: `${effectiveLayout.topPadding}px`,
      paddingBottom: `${effectiveLayout.bottomPadding}px`,
    }"
  >
    <nav
      class="flex flex-col items-center"
      :style="{ gap: `${effectiveLayout.primaryGap}px` }"
      aria-label="Primary navigation"
    >
      <router-link
        v-for="item in effectivePrimaryItems"
        :key="item.path || 'home'"
        :to="item.path"
        class="group flex items-center justify-center rounded-full border transition-colors"
        :class="
          isActive(item)
            ? 'border-[#48ff7a]/70 bg-[#48ff7a] text-[#053512] shadow-[0_0_18px_rgba(72,255,122,0.42)]'
            : 'border-white/10 bg-white/12 text-white/72 hover:bg-white/18 hover:text-white'
        "
        :style="{
          width: `${effectiveLayout.primaryItemSize}px`,
          height: `${effectiveLayout.primaryItemSize}px`,
        }"
        :aria-label="item.label"
        :title="item.label"
      >
        <Icon :name="item.iconName" :size="14" />
      </router-link>
    </nav>

    <nav
      class="flex flex-col items-center"
      :style="{ gap: `${effectiveLayout.secondaryGap}px` }"
      aria-label="Secondary navigation"
    >
      <router-link
        v-for="item in effectiveSecondaryItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/12 hover:text-white"
        :style="{
          width: `${effectiveLayout.secondaryItemSize}px`,
          height: `${effectiveLayout.secondaryItemSize}px`,
        }"
        :aria-label="item.label"
        :title="item.label"
      >
        <Icon :name="item.iconName" :size="14" />
      </router-link>
    </nav>
  </aside>
</template>
