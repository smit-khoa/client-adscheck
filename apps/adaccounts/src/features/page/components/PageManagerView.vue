<script setup lang="ts">
import { onMounted } from 'vue';
import PageTable from '../components/PageTable.vue';
import { usePageManager } from '../composables/use-page-manager';

interface Props {
  toolbarTarget?: string | HTMLElement;
}

defineProps<Props>();

const { progress, ensureLoaded } = usePageManager();

onMounted(ensureLoaded);
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-transparent">
    <p v-if="progress.step" class="border-b border-white/10 px-4 py-2 text-xs text-white/50">
      {{ progress.step }}<span v-if="progress.total"> · {{ progress.loaded }}/{{ progress.total }}</span>
    </p>

    <PageTable :toolbar-target="toolbarTarget" />
  </div>
</template>
