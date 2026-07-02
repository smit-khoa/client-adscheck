<script setup lang="ts">
interface Props {
  panelLabel: string;
  title: string;
  description: string;
}

defineProps<Props>();
</script>

<template>
  <aside class="flex h-full min-h-0 flex-col rounded-[16px] p-4 text-[#1b3d2a]" :aria-label="panelLabel">
    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2c5a3c]/48">
      {{ panelLabel }}
    </p>
    <h2 class="mt-3 text-sm font-semibold text-[#183b28]">{{ title }}</h2>
    <p class="mt-2 text-xs leading-5 text-[#2c5a3c]/62">{{ description }}</p>

    <div class="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-[16px] border border-dashed border-[#9fd8b3] bg-white/52 p-4 text-center text-xs text-[#2c5a3c]/48">
      Placeholder
    </div>
  </aside>
</template>
