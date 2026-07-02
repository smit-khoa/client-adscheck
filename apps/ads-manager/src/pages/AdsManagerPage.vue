<script setup lang="ts">
import { SmitLoading } from '@mf2/shared-ui/core';
// Federated chunk carries Tailwind utilities (no preflight) so classes render
// correctly when this page is mounted inside the host.
import '../remote-styles.css';
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <div class="text-center">
      <SmitLoading :full-screen="false" />
      <h1 class="mt-2 text-xl font-bold text-white">Quản lý quảng cáo</h1>
      <p class="mt-2 text-white/50">Module quản lý quảng cáo — đang phát triển.</p>
    </div>
  </div>
</template>
