<script setup lang="ts">
import PageManagerView from './PageManagerView.vue';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();
</script>

<template>
  <PageManagerView :toolbar-target="toolbarTarget" />
</template>
