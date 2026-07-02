<script setup lang="ts">
import AdAccountTable from './AdAccountTable.vue';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();
</script>

<template>
  <AdAccountTable :toolbar-target="toolbarTarget" />
</template>
