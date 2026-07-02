<script setup lang="ts">
import { Button } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
</script>

<template>
  <header class="pointer-events-none fixed left-0 right-0 top-0 z-30 flex h-9 items-center justify-between px-5">
    <router-link
      to="/home"
      class="pointer-events-auto flex items-center gap-2 text-white"
      aria-label="Adscheck home"
    >
      <span class="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#48ff7a] text-[12px] font-black italic leading-none text-[#053512] shadow-[0_0_20px_rgba(72,255,122,0.32)]">
        A
      </span>
      <span class="flex flex-col leading-none">
        <span class="text-[12px] font-semibold tracking-tight">Adscheck V8</span>
        <span class="text-[8px] font-medium text-white/58">by SMIT</span>
      </span>
    </router-link>

    <div class="pointer-events-auto flex items-center gap-2">
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 backdrop-blur-md transition-colors hover:bg-white/16 hover:text-white"
        aria-label="Thông báo"
      >
        <Icon name="bell" :size="11" />
      </button>
      <Button
        type="button"
        class="h-6 gap-1 px-2 text-[8px] font-semibold"
      >
        <Icon name="star" :size="10" />
        Mua gói
      </Button>
    </div>
  </header>
</template>
