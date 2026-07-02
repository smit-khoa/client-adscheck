<script setup lang="ts">
import { computed } from "vue";
import type { IconName } from "./sprite-symbols";
import { ICON_NAMES } from "./sprite-symbols";
import { useSpriteReady } from "./sprite-provider";
import { cn } from "../lib/utils";

const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: number | string;
    class?: string;
  }>(),
  { size: 24 }
);

const is_ready = useSpriteReady();

if (process.env.NODE_ENV === "development") {
  if (!ICON_NAMES.includes(props.name)) {
    console.warn(
      `[Icon] Unknown icon: "${props.name}". Available icons:`,
      ICON_NAMES.join(", ")
    );
  }
}

const href = computed(() => `#icon-${props.name}`);
</script>

<template>
  <svg
    v-if="is_ready"
    :width="size"
    :height="size"
    :class="cn('shrink-0', props.class)"
    aria-hidden="true"
  >
    <use :href="href" />
  </svg>
</template>
