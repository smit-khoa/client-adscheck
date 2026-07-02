<script setup lang="ts">
import BmDataLoadingView from './BmDataLoadingView.vue';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();
</script>

<template>
  <BmDataLoadingView :toolbar-target="toolbarTarget" />
</template>
