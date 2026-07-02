<script setup lang="ts">
import { Card } from '@mf2/shared-ui/card';
import { SmitLogo } from '@mf2/shared-ui/core';
import BackgroundAtmosphere from '../components/BackgroundAtmosphere.vue';
</script>

<template>
  <div class="relative min-h-[100dvh] text-white">
    <BackgroundAtmosphere />
    <div class="relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
      <Card class="max-w-md w-full p-8 bg-[#0b1a2e]/70 border-white/[0.08] text-center">
        <div class="flex justify-center mb-6">
          <SmitLogo :width="56" :height="44" />
        </div>
        <h1 class="text-xl font-bold mb-2">Tạo doanh nghiệp</h1>
        <p class="text-white/50 text-sm">
          Màn khởi tạo doanh nghiệp — đang phát triển.
        </p>
      </Card>
    </div>
  </div>
</template>
