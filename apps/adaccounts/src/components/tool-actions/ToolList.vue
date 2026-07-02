<script setup lang="ts">
import { computed } from 'vue';
import draggable from 'vuedraggable';
import { Icon } from '@mf2/shared-ui/icons';
import { Switch } from '@mf2/shared-ui';
import ToolFunctionForm from './ToolFunctionForm.vue';
import { useToolActionsContext } from '@/composables/tool-actions/tool-actions-context';
import type { ToolFunction } from '@/types/tool-action.types';

// Flat, drag-reorderable list of tool cards. Clicking a card expands its config
// form inline (accordion); the drag handle reorders and persists. The run button
// is shared (in ToolPanel, below the list) — this component is presentation only.
// Selected count is owned by the panel and passed down — the list stays dumb.
// State comes from the panel-provided tool-actions instance (TKQC, Page, …).
const props = defineProps<{ selectedCount: number }>();

const { orderedFunctions, expandedIds, enabledIds, toggleExpand, toggleEnabled, collapse, reorder } =
  useToolActionsContext();

// vuedraggable works two-way via v-model. Route writes through reorder() so the
// new order persists; the getter exposes the module-scoped list.
const draggableModel = computed<ToolFunction[]>({
  get: () => orderedFunctions.value,
  set: (next) => reorder(next),
});
</script>

<template>
  <draggable
    v-model="draggableModel"
    item-key="id"
    handle=".tool-drag-handle"
    :animation="160"
    ghost-class="opacity-40"
    class="space-y-2"
    @start="collapse"
  >
    <template #item="{ element: fn }">
      <div
        class="overflow-hidden rounded-xl border bg-white/[0.03] transition-colors"
        :class="enabledIds.has(fn.id) ? 'border-emerald-400/60' : 'border-white/10'"
      >
        <!-- Card header: enable switch + expand button + drag handle as siblings
             (interactive controls must not nest inside the button) -->
        <div class="flex items-center gap-2 pr-3 transition-colors hover:bg-white/[0.05]">
          <!-- Enable toggle: marks this tool to run when "Bắt Đầu" is pressed -->
          <span class="shrink-0 pl-3" title="Bật để chạy tính năng này">
            <Switch
              :model-value="enabledIds.has(fn.id)"
              @update:model-value="toggleEnabled(fn.id)"
            />
          </span>
          <button
            type="button"
            class="flex flex-1 items-center gap-3 py-3 text-left"
            @click="toggleExpand(fn.id)"
          >
            <Icon v-if="fn.icon" :name="fn.icon" :size="18" class="shrink-0 text-emerald-300/90" />
            <span class="flex-1 text-sm font-medium text-white/90">{{ fn.label }}</span>
            <Icon
              name="chevron-down"
              :size="16"
              class="shrink-0 text-white/40 transition-transform"
              :class="expandedIds.has(fn.id) ? 'rotate-180' : ''"
            />
          </button>
          <!-- Drag handle -->
          <span
            class="tool-drag-handle shrink-0 cursor-grab text-white/30 transition-colors hover:text-white/60 active:cursor-grabbing"
            title="Kéo để sắp xếp"
          >
            <Icon name="grip-vertical" :size="16" />
          </span>
        </div>

        <!-- Expanded config form -->
        <div v-if="expandedIds.has(fn.id)" class="border-t border-white/10 px-3 py-3">
          <ToolFunctionForm :fn="fn" :selected-count="props.selectedCount" />
        </div>
      </div>
    </template>
  </draggable>
</template>
