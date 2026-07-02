<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { IconName } from '@mf2/shared-ui/icons';
import BackgroundAtmosphere from './BackgroundAtmosphere.vue';
import AppHeader from './AppHeader.vue';
import ArcSidebar from './ArcSidebar.vue';

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

const route = useRoute();
const isAdAccounts = computed(() => route.path.startsWith('/adscheck-pro') || route.path.startsWith('/extended-payment'));

const panelOneClosed = ref(false);
const panelTwoClosed = ref(false);

function handlePanelOneState(e: Event) {
  panelOneClosed.value = !(e as CustomEvent).detail;
}

function handlePanelTwoState(e: Event) {
  panelTwoClosed.value = !(e as CustomEvent).detail;
}

const rightItemsCount = computed(() => {
  if (!isAdAccounts.value) return 0;
  return (panelOneClosed.value ? 1 : 0) + (panelTwoClosed.value ? 1 : 0);
});

const MAIN_TOP_PADDING = 44;
const MAIN_BOTTOM_PADDING = 12;
const MAIN_X_PADDING = 12;
const CURVE_BUFFER = 8;
const CURVE_HEIGHT = 56;
const BOTTOM_CURVE_INSET = 58;
const BOTTOM_CURVE_OUTSET = 18;
const RIGHT_CORNER_RADIUS = 24;

const SIDEBAR_LAYOUT: SidebarLayout = {
  railWidth: 58,
  topPadding: 12,
  bottomPadding: 16,
  primaryItemSize: 36,
  primaryGap: 8,
  secondaryItemSize: 36,
  secondaryGap: 0,
};

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Trang chính', path: '/home', iconName: 'home' },
  { label: 'Adscheck Pro', path: '/adscheck-pro/adaccounts', iconName: 'bar-chart-2' },
  { label: 'Extended Payment', path: '/extended-payment', iconName: 'credit-card' },
  { label: 'Ads Save', path: '/ads-save', iconName: 'folder' },
  { label: 'Super Target', path: '/super-target', iconName: 'circle-check' },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: 'Cài đặt', path: '/settings', iconName: 'settings' },
  { label: 'Hỗ trợ', path: '/support', iconName: 'message-circle' },
  { label: 'Tài khoản', path: '/account', iconName: 'user' },
];

const viewportHeight = ref(900);
const viewportWidth = ref(1440);

const panelHeight = computed(() => Math.max(360, viewportHeight.value - MAIN_TOP_PADDING - MAIN_BOTTOM_PADDING));
const panelWidth = computed(() => Math.max(320, viewportWidth.value - MAIN_X_PADDING * 2));

const primaryMenuHeight = computed(() => menuHeight(PRIMARY_NAV_ITEMS.length, SIDEBAR_LAYOUT.primaryItemSize, SIDEBAR_LAYOUT.primaryGap));
const secondaryMenuHeight = computed(() => menuHeight(SECONDARY_NAV_ITEMS.length, SIDEBAR_LAYOUT.secondaryItemSize, SIDEBAR_LAYOUT.secondaryGap));

const workspacePath = computed(() => {
  const h = panelHeight.value;
  const w = panelWidth.value;
  const rightX = w - 2;
  const rightInnerX = rightX - RIGHT_CORNER_RADIUS;
  const topOuterY = SIDEBAR_LAYOUT.topPadding + primaryMenuHeight.value + CURVE_BUFFER;
  const topInnerY = topOuterY + CURVE_HEIGHT;
  const secondaryTopY = h - SIDEBAR_LAYOUT.bottomPadding - secondaryMenuHeight.value;
  const bottomInnerY = secondaryTopY - BOTTOM_CURVE_INSET;
  const bottomOuterY = secondaryTopY + BOTTOM_CURVE_OUTSET;
  const safeBottomInnerY = Math.max(topInnerY + CURVE_HEIGHT, bottomInnerY);

  const count = rightItemsCount.value;
  const basePath = ['M23 1.4'];

  if (count === 0) {
    basePath.push(
      `H${rightInnerX} Q${rightX} 1.4 ${rightX} ${RIGHT_CORNER_RADIUS} V${h - RIGHT_CORNER_RADIUS}`,
      `Q${rightX} ${h - 1.4} ${rightInnerX} ${h - 1.4}`,
    );
  } else {
    const BUTTON_CONTAINER_TOP = 145;
    const BUTTON_HEIGHT = count === 1 ? 29 : 47;
    const BUTTON_GAP = 8;
    const VERTICAL_PADDING = 0;
    const RIGHT_CURVE_HEIGHT = 58;
    const TENSION = 0.7;
    const cpY = RIGHT_CURVE_HEIGHT * TENSION;

    const rightCutoutTopOuterY = BUTTON_CONTAINER_TOP - VERTICAL_PADDING - RIGHT_CURVE_HEIGHT;
    const rightCutoutInnerTop = BUTTON_CONTAINER_TOP - VERTICAL_PADDING;
    const rightCutoutInnerBottom =
      BUTTON_CONTAINER_TOP +
      (count * BUTTON_HEIGHT + Math.max(0, count - 1) * BUTTON_GAP) +
      VERTICAL_PADDING;
    const rightCutoutBottomTip = rightCutoutInnerBottom + RIGHT_CURVE_HEIGHT;
    const rightCutoutInnerX = rightX - 50;

    basePath.push(
      `H${rightInnerX} Q${rightX} 1.4 ${rightX} ${RIGHT_CORNER_RADIUS}`,
      `V${rightCutoutTopOuterY}`,
      `C${rightX} ${rightCutoutTopOuterY + cpY} ${rightCutoutInnerX} ${rightCutoutInnerTop - cpY} ${rightCutoutInnerX} ${rightCutoutInnerTop}`,
      `V${rightCutoutInnerBottom}`,
      `C${rightCutoutInnerX} ${rightCutoutInnerBottom + cpY} ${rightX} ${rightCutoutBottomTip - cpY} ${rightX} ${rightCutoutBottomTip}`,
      `V${h - RIGHT_CORNER_RADIUS}`,
      `Q${rightX} ${h - 1.4} ${rightInnerX} ${h - 1.4}`,
    );
  }

  basePath.push(
    `H23 Q2 ${h - 1.4} 2 ${h - 24}`,
    `V${bottomOuterY}`,
    `Q2 ${bottomOuterY - 11} 13 ${bottomOuterY - 20}`,
    `L37 ${secondaryTopY - 24}`,
    `Q54 ${secondaryTopY - 36} 52 ${safeBottomInnerY - 4}`,
    `V${topInnerY}`,
    `Q52 ${topOuterY + 41} 38 ${topOuterY + 27}`,
    `L11 ${topOuterY}`,
    `Q2 ${topOuterY - 8} 2 ${topOuterY - 20}`,
    'V24 Q2 1.4 23 1.4 Z',
  );

  return basePath.join(' ');
});

const viewBox = computed(() => `0 0 ${panelWidth.value} ${panelHeight.value}`);

function menuHeight(count: number, itemSize: number, gap: number): number {
  if (count <= 0) return 0;
  return count * itemSize + (count - 1) * gap;
}

function updateViewportSize(): void {
  viewportHeight.value = window.innerHeight;
  viewportWidth.value = window.innerWidth;
}

onMounted(() => {
  updateViewportSize();
  window.addEventListener('resize', updateViewportSize);
  window.addEventListener('shell:panel-one-state', handlePanelOneState);
  window.addEventListener('shell:panel-two-state', handlePanelTwoState);
  window.dispatchEvent(new CustomEvent('shell:request-panel-state'));
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportSize);
  window.removeEventListener('shell:panel-one-state', handlePanelOneState);
  window.removeEventListener('shell:panel-two-state', handlePanelTwoState);
});
</script>

<template>
  <div class="relative flex h-[100dvh] flex-col overflow-hidden bg-[#001707] text-white">
    <BackgroundAtmosphere />
    <AppHeader />

    <main class="relative z-10 flex min-h-0 flex-1 flex-col px-3 pb-3 pt-11">
      <section class="relative min-h-0 flex-1" aria-label="Adscheck workspace">
        <svg
          aria-hidden="true"
          focusable="false"
          class="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          :viewBox="viewBox"
          preserveAspectRatio="none"
        >
          <path
            :d="workspacePath"
            fill="rgb(255 255 255 / 14%)"
            stroke="#ffffff2e"
            stroke-width="1.4"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <ArcSidebar
          :primary-items="PRIMARY_NAV_ITEMS"
          :secondary-items="SECONDARY_NAV_ITEMS"
          :layout="SIDEBAR_LAYOUT"
        />

        <div
          class="relative z-10 h-full min-h-0 overflow-hidden pl-[58px] py-1 transition-all duration-300"
          :class="rightItemsCount > 0 ? 'pr-[58px]' : 'pr-1'"
        >
          <router-view />
        </div>
      </section>
    </main>
  </div>
</template>
