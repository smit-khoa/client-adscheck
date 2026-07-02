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
import { useToolActionsContext } from '@/composables/tool-actions/tool-actions-context';
import type { ToolFieldSchema, ToolFunction } from '@/types/tool-action.types';

// Schema-driven config form, rendered inline as the expanded body of a tool
// card. Binds to this tool's own values (valuesFor) so the common "Bắt Đầu"
// button below the list can run it. Uses shared-ui (shadcn-vue) form components.
// State comes from the panel-provided tool-actions instance (TKQC, Page, …).
const props = withDefaults(defineProps<{
  fn: ToolFunction;
  selectedCount: number;
  showHeader?: boolean;
  variant?: 'default' | 'panel-two';
}>(), {
  showHeader: true,
  variant: 'default',
});

const { valuesFor } = useToolActionsContext();
// This card edits its own tool's values (independent per tool so several enabled
// tools can be configured before one shared run).
const formValues = valuesFor(props.fn);

// A field with `showWhen` is hidden until the referenced field matches. Compare
// as strings so a switch-driven condition works too (switch stores a boolean, so
// `equals: 'true'` matches a toggled-on switch as well as a select option).
function isVisible(field: ToolFieldSchema): boolean {
  if (!field.showWhen) return true;
  return String(formValues[field.showWhen.key]) === field.showWhen.equals;
}

// File inputs can't be two-way bound (the browser blocks setting .value), so we
// store the chosen file's name into this tool's values for feedback. The real
// File object is read by the runner once that tool is wired.
function onFileChange(key: string, event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  formValues[key] = file?.name ?? '';
}
</script>

<template>
  <div v-if="props.showHeader" class="mb-3">
    <h4 class="text-sm font-semibold text-foreground">{{ fn.label }}</h4>
    <p class="mt-0.5 text-xs text-muted-foreground">Đã Chọn ({{ selectedCount }})</p>
  </div>

  <!-- Fields -->
  <div class="space-y-3">
    <p
      v-if="!fn.fields || fn.fields.length === 0"
      class="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground"
      :class="props.variant === 'panel-two' ? 'border-[#DCEBE3] bg-white/80 text-[#6B756F]' : ''"
    >
      Chức năng này áp dụng trực tiếp, không cần cấu hình.
    </p>

    <div
      v-for="field in fn.fields"
      v-show="isVisible(field)"
      :key="field.key"
      class="space-y-1.5"
      :class="props.variant === 'panel-two' ? 'rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#E1ECE6]' : ''"
    >
      <!-- Switch: label + toggle on one row -->
      <div v-if="field.type === 'switch'" class="flex items-center justify-between gap-2">
        <Label
          :for="`fld-${fn.id}-${field.key}`"
          class="text-xs"
          :class="props.variant === 'panel-two' ? 'font-medium text-[#47534D]' : ''"
        >
          {{ field.label }}
        </Label>
        <Switch :id="`fld-${fn.id}-${field.key}`" v-model="(formValues[field.key] as boolean)" />
      </div>

      <!-- Other field types: label above input -->
      <template v-else>
        <Label
          :for="`fld-${fn.id}-${field.key}`"
          class="text-xs"
          :class="props.variant === 'panel-two' ? 'font-medium text-[#47534D]' : ''"
        >
          {{ field.label }}
        </Label>

        <Select v-if="field.type === 'select'" v-model="(formValues[field.key] as string)">
          <SelectTrigger
            :id="`fld-${fn.id}-${field.key}`"
            size="sm"
            class="w-full text-xs"
            :class="props.variant === 'panel-two' ? 'h-9 rounded-full border-0 bg-[#EEF5F1] px-3 text-[#27332D] shadow-none ring-0' : ''"
          >
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
          :id="`fld-${fn.id}-${field.key}`"
          v-model="(formValues[field.key] as string)"
          :placeholder="field.placeholder"
          rows="3"
          class="text-xs"
          :class="props.variant === 'panel-two' ? 'min-h-20 rounded-[16px] border-0 bg-[#EEF5F1] px-3 py-2 text-[#27332D] shadow-none ring-0 placeholder:text-[#8B9690]' : ''"
        />

        <!-- File picker: a file input's value can't be set programmatically,
             so we don't v-model it; on change we store the file NAME (string)
             for visual feedback. The actual File is read when the runner exists.
             The native input forgets its label on remount (toggle off→on), so we
             show the stored name below it to confirm a file is still selected. -->
        <template v-else-if="field.type === 'file'">
          <input
            :id="`fld-${fn.id}-${field.key}`"
            type="file"
            :accept="field.accept"
            class="block w-full text-xs text-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-primary-foreground"
            :class="props.variant === 'panel-two' ? 'rounded-[16px] bg-[#EEF5F1] px-3 py-2 text-[#47534D] file:rounded-full file:bg-white file:text-[#2E7D32]' : ''"
            @change="onFileChange(field.key, $event)"
          />
          <p v-if="formValues[field.key]" class="text-[11px] text-emerald-300/90" :class="props.variant === 'panel-two' ? 'text-[#2E7D32]' : ''">
            Đã chọn: {{ formValues[field.key] }}
          </p>
        </template>

        <Input
          v-else
          :id="`fld-${fn.id}-${field.key}`"
          v-model="(formValues[field.key] as string)"
          :type="field.sensitive ? 'password' : field.type === 'number' ? 'number' : 'text'"
          :placeholder="field.placeholder"
          autocomplete="off"
          class="h-8 text-xs"
          :class="props.variant === 'panel-two' ? 'h-9 rounded-full border-0 bg-[#EEF5F1] px-3 text-[#27332D] shadow-none ring-0 placeholder:text-[#8B9690]' : ''"
        />
      </template>

      <p v-if="field.hint" class="text-[11px] text-muted-foreground" :class="props.variant === 'panel-two' ? 'text-[#7B8781]' : ''">
        {{ field.hint }}
      </p>
    </div>
  </div>
</template>
