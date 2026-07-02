<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Button } from "@mf2/shared-ui/form-controls";
import { Icon, type IconName } from "@mf2/shared-ui/icons";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@mf2/shared-ui";

interface WorkspaceTab {
  value: string;
  label: string;
  count: number;
}

interface ToolbarButton {
  label: string;
  iconName: IconName;
  variant?: "soft" | "success";
}

const tabs: WorkspaceTab[] = [
  { value: "adaccounts", label: "TKQC", count: 4 },
  { value: "businesses", label: "BM", count: 5 },
  { value: "pages", label: "Page", count: 5 },
  { value: "pixels", label: "Pixel", count: 5 },
];

const toolbarButtons: ToolbarButton[] = [
  // { label: 'Tìm kiếm', iconName: 'search' },
  // { label: 'Làm mới', iconName: 'refresh-cw' },
  // { label: 'Lịch', iconName: 'calendar', variant: 'success' },
  // { label: 'Biểu đồ', iconName: 'trending-up' },
  { label: "Thu phóng", iconName: "zoom" },
  { label: "Thông tin", iconName: "info" },
  { label: "Trợ giúp", iconName: "message-circle" },
  { label: "Cài đặt", iconName: "settings" },
];

const activeTab = ref("adaccounts");
const isPanelOneOpen = ref(true);
const isPanelTwoOpen = ref(true);

const TAB_SHAPE_HEIGHT = 72;
const DEFAULT_TAB_SHAPE_WIDTH = 1000;
const DEFAULT_TAB_SHAPE_HEIGHT = 640;
const DEFAULT_ACTIVE_LEFT = 96;
const DEFAULT_ACTIVE_RIGHT = 180;
const DEFAULT_RAIL_END = 392;

const tabShapeRef = ref<HTMLElement | null>(null);
const tabShapeWidth = ref(DEFAULT_TAB_SHAPE_WIDTH);
const tabShapeHeight = ref(DEFAULT_TAB_SHAPE_HEIGHT);
const activeTabBounds = ref({
  left: DEFAULT_ACTIVE_LEFT,
  right: DEFAULT_ACTIVE_RIGHT,
});
const tabRailEnd = ref(DEFAULT_RAIL_END);
let resizeObserver: ResizeObserver | null = null;

const activeTabLabel = computed(
  () => tabs.find((tab) => tab.value === activeTab.value)?.label ?? "BM",
);

const tabContentPath = computed(() => {
  const y = 44;
  const width = tabShapeWidth.value;
  const height = tabShapeHeight.value;
  const activeLeft = Math.max(24, activeTabBounds.value.left - 6);
  const activeRight = Math.min(width - 80, activeTabBounds.value.right + 6);
  const cutStart = Math.min(width - 110, tabRailEnd.value + 8);
  const cutPeak = Math.min(width - 48, tabRailEnd.value + 68);

  const isFirstActiveTab = activeTab.value === tabs[0]?.value;
  const activeTabShapeCommands = isFirstActiveTab
    ? [
        `C0 0 10 0 ${activeLeft + 17} 1`,
        `H${activeRight - 18}`,
        `C${activeRight - 5} 3 ${activeRight + 1} 6 ${activeRight} 30`,
        `C${activeRight + 1} 38 ${activeRight + 7} ${y} ${activeRight + 15} ${y}`,
      ]
    : [
        `H${Math.max(24, activeLeft - 16)}`,
        // Previous curve kept for visual tuning reference while the tab shape is still being refined.
        // `Q${activeLeft - 4} ${y} ${activeLeft} 32`,
        // `L${activeLeft + 8} 12`,
        // `Q${activeLeft + 18} 0 ${activeLeft + 34} 0`,
        // `H${activeRight - 34}`,
        // `Q${activeRight - 18} 0 ${activeRight - 8} 12`,
        // `L${activeRight} 32`,
        // `Q${activeRight + 4} ${y} ${activeRight + 16} ${y}`,
        `C${activeLeft - 6} ${y} ${activeLeft} 38 ${activeLeft} 28`,
        `C${activeLeft} 18 ${activeLeft - 1} 2 ${activeLeft + 17} 1`,
        `H${activeRight - 18}`,
        `C${activeRight - 5} 3 ${activeRight + 1} 6 ${activeRight} 30`,
        `C${activeRight + 1} 38 ${activeRight + 7} ${y} ${activeRight + 15} ${y}`,
      ];

  return [
    `M0 ${height}`,
    isFirstActiveTab ? `V28` : `V65 Q5 ${y} 24 ${y}`,
    ...activeTabShapeCommands,
    `H${cutStart}`,
    `C${cutStart + 16} ${y} ${cutStart + 24} 36 ${cutStart + 30} 28`,
    `C${cutStart + 38} 14 ${cutStart + 42} 1 ${cutPeak} 0`,
    `H${width}`,
    `V${height}`,
    "Z",
  ].join(" ");
});

const tabShapeViewBox = computed(
  () => `0 0 ${tabShapeWidth.value} ${tabShapeHeight.value}`,
);

function measureTabShape(): void {
  const shapeEl = tabShapeRef.value;
  const listEl =
    shapeEl?.parentElement?.querySelector<HTMLElement>("[data-tabs-list]");
  if (!shapeEl || !listEl) return;

  const shapeRect = shapeEl.getBoundingClientRect();
  const activeEl = listEl.querySelector<HTMLElement>(
    `[data-tab-value="${activeTab.value}"]`,
  );
  const activeRect = activeEl?.getBoundingClientRect();
  const listRect = listEl.getBoundingClientRect();

  tabShapeWidth.value = Math.max(320, shapeRect.width);
  tabShapeHeight.value = Math.max(TAB_SHAPE_HEIGHT, shapeRect.height);
  tabRailEnd.value = Math.max(
    DEFAULT_RAIL_END,
    listRect.right - shapeRect.left,
  );
  if (activeRect) {
    activeTabBounds.value = {
      left: activeRect.left - shapeRect.left,
      right: activeRect.right - shapeRect.left,
    };
  }
}

function scheduleMeasureTabShape(): void {
  void nextTick(measureTabShape);
}

onMounted(() => {
  scheduleMeasureTabShape();
  if (tabShapeRef.value) {
    resizeObserver = new ResizeObserver(scheduleMeasureTabShape);
    resizeObserver.observe(tabShapeRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

watch(activeTab, scheduleMeasureTabShape);
</script>

<template>
  <Tabs
    v-model="activeTab"
    class="flex h-full min-h-0 flex-col gap-0 text-[#163322]"
  >
    <ResizablePanelGroup direction="horizontal" class="min-h-0 gap-0">
      <ResizablePanel
        :default-size="isPanelOneOpen || isPanelTwoOpen ? 70 : 100"
        :min-size="38"
      >
        <div
          class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[16px]"
        >
          <div
            ref="tabShapeRef"
            class="pointer-events-none absolute inset-0 z-0"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              class="h-full w-full"
              :viewBox="tabShapeViewBox"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="workspace-content-gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#cfe9dc" />
                  <stop offset="45%" stop-color="#e7f8ee" />
                  <stop offset="100%" stop-color="#ffffff" />
                </linearGradient>
              </defs>
              <path
                :d="tabContentPath"
                fill="url(#workspace-content-gradient)"
                stroke="rgba(255,255,255,0.72)"
                stroke-width="1"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div
            class="relative z-20 flex h-11 shrink-0 items-center justify-between gap-4 px-2"
          >
            <TabsList
              data-tabs-list
              class="relative z-10 flex h-9 items-start gap-3 bg-transparent p-0 shadow-none"
            >
              <TabsTrigger
                v-for="tab in tabs"
                :key="tab.value"
                :value="tab.value"
                :data-tab-value="tab.value"
                class="h-8 w-[84px] flex-none rounded-full border border-white/18 bg-[#436e58]/78 px-0 text-[12px] font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300 data-[state=active]:bg-[#58bf3f] data-[state=active]:text-white data-[state=active]:shadow-[0_8px_18px_rgba(75,179,63,0.26)]"
              >
                {{ tab.label }} ({{ tab.count }})
              </TabsTrigger>
            </TabsList>

            <div
              class="flex min-w-0 items-center justify-end gap-2 self-stretch px-3"
            >
              <Button
                v-for="button in toolbarButtons.slice(0, 4)"
                :key="button.label"
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 rounded-full bg-white/80 text-[#234231] shadow-[0_4px_14px_rgba(16,40,24,0.08)] hover:bg-white"
                :aria-label="button.label"
                :title="button.label"
              >
                <Icon :name="button.iconName" :size="13" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                class="h-7 rounded-full bg-white/80 px-2 text-[11px] font-medium text-[#234231] shadow-[0_4px_14px_rgba(16,40,24,0.08)] hover:bg-white"
              >
                <Icon name="globe" :size="12" />
                VND
                <Icon name="chevron-down" :size="12" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                class="h-7 rounded-full bg-white/90 px-3 text-[11px] font-semibold text-[#168d46] shadow-[0_4px_14px_rgba(16,40,24,0.08)] hover:bg-white"
              >
                <Icon name="download" :size="12" />
                Tải tài khoản
              </Button>

              <Button
                v-for="button in toolbarButtons.slice(4)"
                :key="button.label"
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 rounded-full bg-white/80 text-[#234231] shadow-[0_4px_14px_rgba(16,40,24,0.08)] hover:bg-white"
                :aria-label="button.label"
                :title="button.label"
              >
                <Icon :name="button.iconName" :size="13" />
              </Button>
            </div>
          </div>

          <div class="relative z-10 min-h-0 flex-1 px-1 pb-1 pt-1">
            <div class="relative h-full overflow-hidden rounded-bl-[14px]">
              <Transition name="workspace-tab" mode="out-in">
                <TabsContent
                  :key="activeTab"
                  :value="activeTab"
                  class="m-0 h-full outline-none"
                >
                  <div
                    class="flex h-full items-center justify-center text-center text-[#2c5a3c]/46"
                  >
                    <div>
                      <p class="text-sm font-semibold">{{ activeTabLabel }}</p>
                      <p class="mt-1 text-xs">Data table placeholder</p>
                    </div>
                  </div>
                </TabsContent>
              </Transition>
            </div>
          </div>
        </div>
      </ResizablePanel>

      <template v-if="isPanelOneOpen">
        <ResizableHandle with-handle class="bg-[#204730]/70" />
        <ResizablePanel :default-size="15" :min-size="10" :max-size="28">
          <aside
            class="h-full rounded-[24px] bg-[#f4fff8]/72"
            aria-label="Function panel 1"
          />
        </ResizablePanel>
      </template>

      <template v-if="isPanelTwoOpen">
        <ResizableHandle with-handle class="bg-[#204730]/70" />
        <ResizablePanel :default-size="15" :min-size="10" :max-size="28">
          <aside
            class="h-full rounded-[24px] bg-[#f4fff8]/72"
            aria-label="Function panel 2"
          />
        </ResizablePanel>
      </template>
    </ResizablePanelGroup>
  </Tabs>
</template>

<style scoped>
.workspace-tab-enter-active,
.workspace-tab-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.workspace-tab-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.workspace-tab-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
