<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import { Button } from '../button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../resizable';
import { Icon } from '../../../icons';

interface Props {
  activeTab: string;
  firstTabValue?: string;
  panelOneOpen?: boolean;
  panelTwoOpen?: boolean;
  panelOneLabel?: string;
  panelTwoLabel?: string;
  panelOneSize?: number;
  panelTwoSize?: number;
}

interface Emits {
  (e: 'update:panelOneOpen', value: boolean): void;
  (e: 'update:panelTwoOpen', value: boolean): void;
  (e: 'layout', value: number[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  firstTabValue: '',
  panelOneOpen: true,
  panelTwoOpen: true,
  panelOneLabel: 'Function panel 1',
  panelTwoLabel: 'Function panel 2',
  panelOneSize: 15,
  panelTwoSize: 15,
});

const emit = defineEmits<Emits>();

const TAB_SHAPE_HEIGHT = 72;
const DEFAULT_TAB_SHAPE_WIDTH = 1000;
const DEFAULT_TAB_SHAPE_HEIGHT = 640;
const DEFAULT_ACTIVE_LEFT = 96;
const DEFAULT_ACTIVE_RIGHT = 180;
const DEFAULT_RAIL_END = 392;

const tabShapeRef = ref<HTMLElement | null>(null);
const tabShapeWidth = ref(DEFAULT_TAB_SHAPE_WIDTH);
const tabShapeHeight = ref(DEFAULT_TAB_SHAPE_HEIGHT);
const activeTabBounds = ref({ left: DEFAULT_ACTIVE_LEFT, right: DEFAULT_ACTIVE_RIGHT });
const tabRailEnd = ref(DEFAULT_RAIL_END);
let resizeObserver: ResizeObserver | null = null;
let hasWarnedMissingTabsList = false;

const gradientId = useId();
const gradientUrl = computed(() => `url(#${gradientId})`);
const surfaceBackground =
  'linear-gradient(180deg, rgba(77, 255, 127, 0.06) 0%, rgba(77, 255, 127, 0.02) 51.9231%, rgba(77, 255, 127, 0.06) 100%), rgba(255, 255, 255, 0.95)';
const isFirstActiveTab = computed(
  () => props.firstTabValue !== '' && props.activeTab !== '' && props.activeTab === props.firstTabValue
);

const tabContentPath = computed(() => {
  const y = 44;
  const width = tabShapeWidth.value;
  const height = tabShapeHeight.value;
  const activeLeft = Math.max(24, activeTabBounds.value.left - 6);
  const activeRight = Math.min(width - 80, activeTabBounds.value.right + 6);
  const cutStart = Math.min(width - 110, tabRailEnd.value + 8);
  const cutPeak = Math.min(width - 48, tabRailEnd.value + 68);

  const activeTabShapeCommands = isFirstActiveTab.value
    ? [
        `C0 0 10 0 ${activeLeft + 17} 1`,
        `H${activeRight - 18}`,
        `C${activeRight - 5} 3 ${activeRight + 1} 6 ${activeRight} 30`,
        `C${activeRight + 1} 38 ${activeRight + 7} ${y} ${activeRight + 15} ${y}`,
      ]
    : [
        `H${Math.max(24, activeLeft - 16)}`,
        `C${activeLeft - 6} ${y} ${activeLeft} 38 ${activeLeft} 28`,
        `C${activeLeft} 18 ${activeLeft - 1} 2 ${activeLeft + 17} 1`,
        `H${activeRight - 18}`,
        `C${activeRight - 5} 3 ${activeRight + 1} 6 ${activeRight} 30`,
        `C${activeRight + 1} 38 ${activeRight + 7} ${y} ${activeRight + 15} ${y}`,
      ];

  return [
    `M0 ${height}`,
    isFirstActiveTab.value ? `V28` : `V65 Q5 ${y} 24 ${y}`,
    ...activeTabShapeCommands,
    `H${cutStart}`,
    `C${cutStart + 16} ${y} ${cutStart + 24} 36 ${cutStart + 30} 28`,
    `C${cutStart + 38} 14 ${cutStart + 42} 1 ${cutPeak} 0`,
    `H${width}`,
    `V${height}`,
    'Z',
  ].join(' ');
});

const tabShapeViewBox = computed(() => `0 0 ${tabShapeWidth.value} ${tabShapeHeight.value}`);
const sidePanelSize = computed(() => {
  let size = 0;
  if (props.panelOneOpen) size += props.panelOneSize;
  if (props.panelTwoOpen) size += props.panelTwoSize;
  return size;
});
const mainPanelSize = computed(() => Math.max(38, 100 - sidePanelSize.value));

function getEscapedTabValue(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

function measureTabShape(): void {
  const shapeEl = tabShapeRef.value;
  const listEl = shapeEl?.parentElement?.querySelector<HTMLElement>('[data-tabs-list]');
  if (!shapeEl || !listEl) {
    if (process.env.NODE_ENV === 'development' && shapeEl && !listEl && !hasWarnedMissingTabsList) {
      console.warn(
        '[WorkspacePathFrame] Missing sibling [data-tabs-list]. Add data-tabs-list to the tab list rendered in the tabs slot so the SVG path can measure the active tab.'
      );
      hasWarnedMissingTabsList = true;
    }
    return;
  }

  const shapeRect = shapeEl.getBoundingClientRect();
  const escapedActiveTab = getEscapedTabValue(props.activeTab);
  const activeEl = listEl.querySelector<HTMLElement>(`[data-tab-value="${escapedActiveTab}"]`);
  const activeRect = activeEl?.getBoundingClientRect();
  const listRect = listEl.getBoundingClientRect();

  tabShapeWidth.value = Math.max(320, shapeRect.width);
  tabShapeHeight.value = Math.max(TAB_SHAPE_HEIGHT, shapeRect.height);
  tabRailEnd.value = Math.max(DEFAULT_RAIL_END, listRect.right - shapeRect.left);

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

watch(() => props.activeTab, scheduleMeasureTabShape);
</script>

<template>
  <ResizablePanelGroup direction="horizontal" class="workspace-path-frame min-h-0 gap-0" @layout="emit('layout', $event)">
    <ResizablePanel :default-size="mainPanelSize" :min-size="38">
      <div class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] text-[#163322]">
        <div ref="tabShapeRef" class="pointer-events-none absolute inset-0 z-0">
          <svg
            aria-hidden="true"
            focusable="false"
            class="h-full w-full"
            :viewBox="tabShapeViewBox"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4DFF7F" stop-opacity="0.06" />
                <stop offset="51.9231%" stop-color="#4DFF7F" stop-opacity="0.02" />
                <stop offset="100%" stop-color="#4DFF7F" stop-opacity="0.06" />
              </linearGradient>
            </defs>
            <path :d="tabContentPath" fill="rgba(255,255,255,0.95)" />
            <path
              :d="tabContentPath"
              :fill="gradientUrl"
              stroke="rgba(255,255,255,0.72)"
              stroke-width="1"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div class="relative z-20 flex h-11 shrink-0 items-center justify-between gap-4 px-2">
          <slot name="tabs" />

          <div class="flex shrink-0 flex-nowrap items-center justify-end gap-2 self-stretch overflow-x-auto whitespace-nowrap px-3">
            <slot name="toolbar">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 rounded-full bg-white/80 text-[#234231] shadow-[0_4px_14px_rgba(16,40,24,0.08)] hover:bg-white"
                aria-label="Workspace info"
                title="Workspace info"
              >
                <Icon name="info" :size="13" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 rounded-full bg-white/80 text-[#234231] shadow-[0_4px_14px_rgba(16,40,24,0.08)] hover:bg-white"
                aria-label="Workspace settings"
                title="Workspace settings"
              >
                <Icon name="settings" :size="13" />
              </Button>
            </slot>
          </div>
        </div>

        <div class="relative z-10 min-h-0 flex-1 px-1 pb-1 pt-1">
          <div class="relative h-full overflow-hidden rounded-bl-[14px]">
            <slot name="main" />
          </div>
        </div>
      </div>
    </ResizablePanel>

    <template v-if="panelOneOpen">
      <ResizableHandle with-handle class="bg-[#204730]/70" />
      <ResizablePanel :default-size="panelOneSize" :min-size="10" :max-size="28">
        <div class="relative h-full min-h-0 overflow-hidden rounded-[16px]" :style="{ background: surfaceBackground }">
          <slot name="panel-one" />
        </div>
      </ResizablePanel>
    </template>

    <template v-if="panelTwoOpen">
      <ResizableHandle with-handle class="bg-[#204730]/70" />
      <ResizablePanel :default-size="panelTwoSize" :min-size="10" :max-size="28">
        <div class="relative h-full min-h-0 overflow-hidden rounded-[16px]" :style="{ background: surfaceBackground }">
          <slot name="panel-two" />
        </div>
      </ResizablePanel>
    </template>
  </ResizablePanelGroup>
</template>
