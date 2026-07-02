<script setup lang="ts">
import { SmitLoading } from '@mf2/shared-ui/core';
import BackgroundAtmosphere from '../components/BackgroundAtmosphere.vue';
</script>

<template>
  <div class="relative min-h-screen text-white">
    <BackgroundAtmosphere />
    <div class="relative z-10">
      <SmitLoading :full-screen="false" message="Đăng nhập nhanh — đang phát triển." />
    </div>
  </div>
</template>
