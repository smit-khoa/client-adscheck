<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../lib/utils";
import SmitLogo from "./SmitLogo.vue";

const props = withDefaults(
  defineProps<{
    fullScreen?: boolean;
    message?: string;
    class?: string;
  }>(),
  { fullScreen: true }
);

const container_class = computed(() =>
  props.fullScreen
    ? "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a1628]"
    : "relative flex flex-col items-center justify-center py-20"
);
</script>

<template>
  <div
    :class="cn(container_class, props.class)"
    role="status"
    aria-live="polite"
    aria-label="Đang tải"
  >
    <!-- ambient gradient layer -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0"
      :style="{
        background:
          'radial-gradient(ellipse 600px 400px at 50% 45%, rgba(57,231,228,0.08) 0%, transparent 60%), radial-gradient(ellipse 500px 300px at 50% 55%, rgba(212,253,115,0.05) 0%, transparent 65%)',
      }"
    />

    <!-- logo stack with layered auras -->
    <div class="relative flex h-44 w-44 items-center justify-center">
      <span
        aria-hidden="true"
        class="absolute inset-0 rounded-full blur-2xl"
        :style="{
          background:
            'radial-gradient(circle, rgba(57,231,228,0.35) 0%, transparent 70%)',
          animation: 'smit-aura 2.8s cubic-bezier(0.4,0,0.2,1) infinite',
        }"
      />
      <span
        aria-hidden="true"
        class="absolute inset-5 rounded-full blur-xl"
        :style="{
          background:
            'radial-gradient(circle, rgba(126,237,162,0.42) 0%, transparent 70%)',
          animation: 'smit-aura 2.4s cubic-bezier(0.4,0,0.2,1) infinite 0.25s',
        }"
      />
      <span
        aria-hidden="true"
        class="absolute inset-10 rounded-full blur-lg"
        :style="{
          background:
            'radial-gradient(circle, rgba(212,253,115,0.45) 0%, transparent 70%)',
          animation: 'smit-aura 2s cubic-bezier(0.4,0,0.2,1) infinite 0.5s',
        }"
      />

      <span
        aria-hidden="true"
        class="absolute inset-1 rounded-full border border-white/[0.06]"
        :style="{ animation: 'smit-spin 9s linear infinite' }"
      />
      <span
        aria-hidden="true"
        class="absolute inset-5 rounded-full border border-dashed border-white/[0.08]"
        :style="{ animation: 'smit-spin 14s linear infinite reverse' }"
      />

      <span
        aria-hidden="true"
        class="absolute inset-0"
        :style="{ animation: 'smit-spin 4s linear infinite' }"
      >
        <span
          class="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          :style="{
            background:
              'radial-gradient(circle, #D4FD73 0%, rgba(212,253,115,0.2) 70%, transparent 100%)',
            boxShadow:
              '0 0 12px rgba(212,253,115,0.8), 0 0 24px rgba(212,253,115,0.4)',
          }"
        />
      </span>

      <div
        class="relative"
        :style="{ animation: 'smit-breathe 2.6s cubic-bezier(0.4,0,0.2,1) infinite' }"
      >
        <SmitLogo :width="78" :height="60" />
      </div>
    </div>

    <!-- wordmark -->
    <div
      class="mt-12 flex items-baseline gap-1.5 text-lg font-semibold tracking-tight"
      :style="{ animation: 'smit-rise 0.7s cubic-bezier(0.22,1,0.36,1) both 0.15s' }"
    >
      <span class="text-white">SMIT</span>
      <span
        class="bg-gradient-to-r from-[#39E7E4] via-[#7EEDA2] to-[#D4FD73] bg-clip-text text-transparent"
        :style="{
          backgroundSize: '200% 100%',
          animation: 'smit-shimmer 3.2s ease-in-out infinite',
        }"
      >
        Agency
      </span>
    </div>

    <!-- loading dots -->
    <div
      class="mt-7 flex items-center gap-1.5"
      :style="{ animation: 'smit-fade 0.6s ease-out both 0.4s' }"
    >
      <span
        v-for="i in [0, 1, 2]"
        :key="i"
        class="h-1.5 w-1.5 rounded-full"
        :style="{
          animation: `smit-dot 1.4s cubic-bezier(0.4,0,0.2,1) infinite ${i * 0.16}s`,
        }"
      />
    </div>

    <p
      v-if="message"
      class="mt-5 text-xs font-medium tracking-wide text-white/45"
      :style="{ animation: 'smit-fade 0.6s ease-out both 0.6s' }"
    >
      {{ message }}
    </p>
  </div>
</template>

<style>
@keyframes smit-breathe {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(126, 237, 162, 0.25)) drop-shadow(0 0 4px rgba(57, 231, 228, 0.3));
  }
  50% {
    transform: scale(1.06);
    filter: drop-shadow(0 0 32px rgba(57, 231, 228, 0.5)) drop-shadow(0 0 8px rgba(212, 253, 115, 0.4));
  }
}
@keyframes smit-aura {
  0%, 100% { opacity: 0.5; transform: scale(0.92); }
  50% { opacity: 0.95; transform: scale(1.1); }
}
@keyframes smit-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes smit-dot {
  0%, 80%, 100% {
    transform: translateY(0);
    background-color: rgba(255, 255, 255, 0.25);
  }
  40% {
    transform: translateY(-7px);
    background-color: #7EEDA2;
    box-shadow: 0 0 8px rgba(126, 237, 162, 0.6);
  }
}
@keyframes smit-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes smit-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes smit-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
