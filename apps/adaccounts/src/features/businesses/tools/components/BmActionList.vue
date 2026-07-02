<script setup lang="ts">
import { Icon } from '@mf2/shared-ui/icons';
import BmActionForm from './BmActionForm.vue';
import { useBmActions } from '../composables/use-bm-actions';

// Static list of BM action cards (no drag-reorder — the BM list is short and
// fixed, so ordering adds no value). Clicking a card expands its config form
// inline (accordion). The run button is shared (in BmActionPanel, below the
// list) — this component is presentation only.
defineProps<{ selectedCount: number }>();

const { functions, expandedId, toggleExpand } = useBmActions();
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="fn in functions"
      :key="fn.id"
      class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
    >
      <button
        type="button"
        class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
        @click="toggleExpand(fn.id)"
      >
        <Icon v-if="fn.icon" :name="fn.icon" :size="18" class="shrink-0 text-emerald-300/90" />
        <span class="flex-1 text-sm font-medium text-white/90">{{ fn.label }}</span>
        <Icon
          name="chevron-down"
          :size="16"
          class="shrink-0 text-white/40 transition-transform"
          :class="expandedId === fn.id ? 'rotate-180' : ''"
        />
      </button>

      <!-- Expanded config form -->
      <div v-if="expandedId === fn.id" class="border-t border-white/10 px-3 py-3">
        <BmActionForm :fn="fn" :selected-count="selectedCount" />
      </div>
    </div>
  </div>
</template>
