<script setup lang="ts">
withDefaults(defineProps<{ width?: number }>(), { width: 280 });
</script>

<template>
  <div
    class="absolute right-0 top-[calc(100%+8px)] origin-top-right rounded-2xl border border-white/[0.08] bg-[#0b1a2e]/90 p-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
    :style="{
      width: `${width}px`,
      animation: 'dropdown-enter 0.22s cubic-bezier(0.22,1,0.36,1) both',
    }"
  >
    <slot />
  </div>
</template>
