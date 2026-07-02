<script setup lang="ts">
import { usePageSelection } from '../composables/use-page-selection';
import { PageToolDetailPanel } from '../tools';

const { selectedCount } = usePageSelection();
</script>

<template>
  <PageToolDetailPanel :selected-count="selectedCount" />
</template>
