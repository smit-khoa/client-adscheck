<script setup lang="ts">
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@mf2/shared-ui/form-controls';
import { useBmActions } from '../composables/use-bm-actions';
import type { ToolFieldSchema, ToolFunction } from '../types';

interface Props {
  fn: ToolFunction;
  selectedCount: number;
  values?: Record<string, string | boolean>;
  showHeader?: boolean;
  variant?: 'default' | 'panel-two';
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  variant: 'default',
});

const { valuesFor } = useBmActions();
const formValues = props.values ?? valuesFor(props.fn);

function isVisible(field: ToolFieldSchema): boolean {
  if (!field.showWhen) return true;
  return formValues[field.showWhen.key] === field.showWhen.equals;
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="showHeader">
      <h4 class="text-sm font-semibold text-foreground">{{ fn.label }}</h4>
      <p class="mt-0.5 text-xs text-muted-foreground">Áp dụng cho {{ selectedCount }} BM</p>
    </div>

    <div class="space-y-3">
      <p
        v-if="!fn.fields || fn.fields.length === 0"
        class="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground"
      >
        Chức năng này áp dụng trực tiếp, không cần cấu hình.
      </p>

      <div
        v-for="field in fn.fields"
        v-show="isVisible(field)"
        :key="field.key"
        class="space-y-1.5"
        :class="variant === 'panel-two' ? 'rounded-[18px] bg-[#F5FAF7] px-3 py-2.5 ring-1 ring-[#DCEBE3]' : ''"
      >
        <div v-if="field.type === 'switch'" class="flex items-center justify-between gap-2">
          <Label :for="`bmfld-${fn.id}-${field.key}`" class="text-xs">{{ field.label }}</Label>
          <Switch :id="`bmfld-${fn.id}-${field.key}`" v-model="(formValues[field.key] as boolean)" />
        </div>

        <template v-else>
          <Label :for="`bmfld-${fn.id}-${field.key}`" class="text-xs">{{ field.label }}</Label>

          <Select v-if="field.type === 'select'" v-model="(formValues[field.key] as string)">
            <SelectTrigger :id="`bmfld-${fn.id}-${field.key}`" size="sm" class="w-full text-xs">
              <SelectValue :placeholder="field.placeholder ?? 'Chọn...'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in field.options"
                :key="opt.value"
                :value="opt.value"
                class="text-xs"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            v-else-if="field.type === 'textarea'"
            :id="`bmfld-${fn.id}-${field.key}`"
            v-model="(formValues[field.key] as string)"
            :placeholder="field.placeholder"
            rows="3"
            class="text-xs"
          />

          <Input
            v-else
            :id="`bmfld-${fn.id}-${field.key}`"
            v-model="(formValues[field.key] as string)"
            :type="field.type === 'number' ? 'number' : 'text'"
            :placeholder="field.placeholder"
            class="h-8 text-xs"
          />
        </template>

        <p v-if="field.hint" class="text-[11px] text-muted-foreground">{{ field.hint }}</p>
      </div>
    </div>
  </div>
</template>
