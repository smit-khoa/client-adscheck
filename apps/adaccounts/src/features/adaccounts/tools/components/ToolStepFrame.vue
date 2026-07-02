<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@mf2/shared-ui/icons";
import type { ToolFunction } from "@/types/tool-action.types";

interface Props {
  fn: ToolFunction;
  stepNumber: number;
  expanded: boolean;
  runnable: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "toggle"): void;
  (e: "remove"): void;
}>();

const sectionRef = ref<HTMLElement | null>(null);
const sectionWidth = ref(360);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (sectionRef.value) {
    sectionWidth.value = sectionRef.value.offsetWidth;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        sectionWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(sectionRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

const svgViewBox = computed(() => `0 0 ${sectionWidth.value} 128`);

function getCurveParams(w: number) {
  // Distance from the right edge to the left edge of the "Bước 1" button
  // When w < 180, right-0, gap-0, and px-1 reduce the total width by ~32px
  const buttonLeftOffset = w < 180 ? 78 : 110;

  // The horizontal padding between the end of the curve and the button
  const curvePadding = 0;
  const endOffset = buttonLeftOffset + curvePadding;

  const desiredCurveW = 60;

  const availableForCurve = Math.max(0, w - endOffset - 34);
  const curveW = Math.min(desiredCurveW, availableForCurve);
  const t = Math.max(34, w - endOffset - curveW);

  const scale = curveW > 0 ? curveW / 60 : 0;
  return {
    t,
    curveW,
    c1: 16 * scale,
    c2: 21 * scale,
    p1: 30 * scale,
    c3: 38 * scale,
    c4: 46 * scale,
    flatEnd: Math.max(t + curveW, w - 26),
  };
}

const fillPath = computed(() => {
  const w = sectionWidth.value;
  const { t, curveW, c1, c2, p1, c3, c4, flatEnd } = getCurveParams(w);
  return `M34 44 H${t} C${t + c1} 44 ${t + c2} 30 ${t + p1} 18 C${t + c3} 6 ${t + c4} 1 ${t + curveW} 1 H${flatEnd} C${flatEnd + 14} 1 ${flatEnd + 25} 12 ${flatEnd + 25} 26 V128 H1 V78 C1 59 15 44 34 44 Z`;
});

const strokePath = computed(() => {
  const w = sectionWidth.value;
  const { t, curveW, c1, c2, p1, c3, c4, flatEnd } = getCurveParams(w);
  return `M34 44 H${t} C${t + c1} 44 ${t + c2} 30 ${t + p1} 18 C${t + c3} 6 ${t + c4} 1 ${t + curveW} 1 H${flatEnd} C${flatEnd + 14} 1 ${flatEnd + 25} 12 ${flatEnd + 25} 26 V128`;
});
</script>

<template>
  <section
    ref="sectionRef"
    class="relative min-h-[168px] overflow-visible text-[#1F2A24]"
  >
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 top-[44px] rounded-[28px] bg-white shadow-[0_14px_32px_rgba(31,42,36,0.08)]"
    />
    <svg
      class="pointer-events-none absolute inset-x-0 top-0 h-[128px] w-full drop-shadow-[0_8px_18px_rgba(31,42,36,0.05)]"
      :viewBox="svgViewBox"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="fillPath" fill="#FFFFFF" />
      <path
        :d="strokePath"
        fill="none"
        stroke="rgba(255,255,255,0.82)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <div class="relative px-4 pb-4 pt-[74px]">
      <div 
        class="absolute top-4 flex items-center transition-all duration-300"
        :class="sectionWidth < 180 ? 'right-0 gap-0' : 'right-3 gap-2'"
      >
        <button
          type="button"
          class="flex h-6 items-center gap-1 rounded-full bg-[#4FB642] py-1 text-sm font-medium leading-none text-white shadow-[0_8px_18px_rgba(52,153,68,0.18)] transition-colors hover:bg-[#3C9944] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CCF91] transition-all duration-300"
          :class="sectionWidth < 180 ? 'px-1' : 'px-2.5'"
          :aria-label="
            expanded ? `Thu gọn bước ${stepNumber}` : `Mở bước ${stepNumber}`
          "
          @click.stop="emit('toggle')"
        >
          <Icon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="10" />
          <span>Bước {{ stepNumber }}</span>
        </button>

        <button
          type="button"
          class="grid size-6 place-items-center rounded-full bg-white/70 text-[#25392E] transition-colors hover:bg-[#F1F5F3] hover:text-[#B42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A6A6]"
          :aria-label="`Xoá bước ${stepNumber}: ${fn.label}`"
          @click.stop="emit('remove')"
        >
          <Icon name="x" :size="10" />
        </button>
      </div>

      <div class="flex items-center gap-3 border-b border-[#EEF1EF] pb-2">
        <span
          class="tool-step-drag-handle grid size-6 shrink-0 cursor-grab place-items-center rounded-full text-[#A2AAA5] transition-colors hover:bg-[#F0F6F2] hover:text-[#3C9944] active:cursor-grabbing"
          title="Kéo để sắp xếp bước"
          aria-label="Kéo để sắp xếp bước"
          @click.stop
        >
          <Icon name="grip-vertical" :size="14" />
        </span>

        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-1.5 rounded-[18px] text-left transition-colors hover:bg-[#F6FAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CCF91]"
          :aria-expanded="expanded"
          @click.stop="emit('toggle')"
        >
          <span class="grid size-9 shrink-0 place-items-center text-[#1F2A24]">
            <Icon v-if="fn.icon" :name="fn.icon" :size="14" />
            <Icon v-else name="settings" :size="14" />
          </span>
          <span class="min-w-0 flex-1">
            <span
              class="block truncate text-[13px] font-normal leading-none tracking-[-0.02em] text-[#111815]"
              >{{ fn.label }}</span
            >
          </span>
        </button>
      </div>

      <div v-if="expanded" class="pt-6">
        <slot />
      </div>
    </div>
  </section>
</template>
