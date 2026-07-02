<script setup lang="ts">
import SmitLoading from "./SmitLoading.vue";

defineProps<{ name: string }>();
</script>

<template>
  <SmitLoading :full-screen="false" :message="`Đang tải ${name}...`" />
</template>
