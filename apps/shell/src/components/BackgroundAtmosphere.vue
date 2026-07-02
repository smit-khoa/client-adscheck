<script setup lang="ts">
declare const __BASE_PATH__: string;

const basePath = typeof __BASE_PATH__ !== 'undefined' ? __BASE_PATH__ : '/';
const backgroundUrl = `${basePath.replace(/\/$/, '')}/assets/adscheck-background.webp`;
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#001707]">
    <img
      :src="backgroundUrl"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 h-full w-full object-cover"
    />
    <div class="absolute inset-0 bg-[#001707]/25" />
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(38,255,121,0.12),transparent_42%),linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.38))]" />
  </div>
</template>
