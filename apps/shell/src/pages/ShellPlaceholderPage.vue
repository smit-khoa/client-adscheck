<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const title = computed(() => String(route.meta.title ?? 'Trang đang chuẩn bị'));
const description = computed(() => String(route.meta.description ?? 'Nội dung sẽ được cập nhật sau.'));
</script>

<template>
  <div class="flex h-full items-center justify-center p-6 text-center text-[#2c5a3c]">
    <section class="max-w-md rounded-[28px] border border-white/45 bg-white/55 px-8 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.08)] backdrop-blur">
      <p class="text-xs font-semibold uppercase tracking-[0.28em] text-[#3c9944]/70">SMIT Agency</p>
      <h1 class="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#14351f]">{{ title }}</h1>
      <p class="mt-3 text-sm leading-6 text-[#3b5f47]/78">{{ description }}</p>
    </section>
  </div>
</template>
