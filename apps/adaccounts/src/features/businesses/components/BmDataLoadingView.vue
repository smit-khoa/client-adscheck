<script setup lang="ts">
import { onMounted } from 'vue';
import BmTable from './BmTable.vue';
import { useBmDataLoader } from '../composables/use-bm-data-loader';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();

const { rows, isLoadingBase, baseError, activeConfig, ensureLoaded, refresh } = useBmDataLoader();

onMounted(ensureLoaded);
</script>

<template>
  <section class="flex h-full min-h-0 flex-col">
    <p v-if="baseError" class="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ baseError }}
    </p>

    <BmTable :rows="rows" :loading="isLoadingBase" :config="activeConfig" :toolbar-target="toolbarTarget" @refresh="refresh" />
  </section>
</template>
