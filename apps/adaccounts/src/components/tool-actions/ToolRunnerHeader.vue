<script setup lang="ts">
import { Input, Label } from '@mf2/shared-ui';
import { useToolRunnerSettings } from '@/composables/tool-actions/use-tool-runner-settings';

// Run-control inputs (concurrency + delay). Values persist via the composable.
const { threads, delayMs } = useToolRunnerSettings();

// Clearing a number field leaves the ref NaN; clamp back to a valid value on
// blur so the input never stays blank.
function clampThreads() {
  if (!Number.isFinite(threads.value) || threads.value < 1) threads.value = 1;
}
function clampDelay() {
  if (!Number.isFinite(delayMs.value) || delayMs.value < 0) delayMs.value = 0;
}
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex flex-1 items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
      <Label for="runner-threads" class="shrink-0 text-xs text-muted-foreground">Luồng</Label>
      <Input
        id="runner-threads"
        v-model.number="threads"
        type="number"
        min="1"
        class="h-7 text-xs"
        @blur="clampThreads"
      />
    </div>
    <div class="flex flex-1 items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
      <Label for="runner-delay" class="shrink-0 text-xs text-muted-foreground">Delay(ms)</Label>
      <Input
        id="runner-delay"
        v-model.number="delayMs"
        type="number"
        min="0"
        class="h-7 text-xs"
        @blur="clampDelay"
      />
    </div>
  </div>
</template>
