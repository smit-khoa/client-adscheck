<script setup lang="ts">
import { computed } from 'vue';
import { useBmSelection } from '../composables/use-bm-selection';
import { BmActionDetailPanel } from '../tools';

const { selectedBmIds } = useBmSelection();
const selectedBmIdList = computed(() => [...selectedBmIds.value]);
</script>

<template>
  <BmActionDetailPanel :selected-bm-ids="selectedBmIdList" />
</template>
