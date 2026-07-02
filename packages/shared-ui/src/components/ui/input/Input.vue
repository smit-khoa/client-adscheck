<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from "../../../lib/utils"
import { useCurrencyInput } from "./composables/use-currency-input"

type InputType = "text" | "number" | "password" | "currency"

interface Props {
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes["class"]
  type?: InputType
  currency?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  currency: "VND",
})

const emit = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()

const modelValue = useVModel(props, "modelValue", emit, {
  passive: true,
  defaultValue: props.defaultValue,
})

const isCurrency = computed(() => props.type === "currency")
const nativeType = computed(() => (props.type === "currency" ? "text" : props.type))

const placeholderValue = computed(() => {
  if (props.placeholder !== undefined) return props.placeholder
  if (isCurrency.value) return props.currency
  return undefined
})

const { displayValue: currencyDisplayValue, hasValue: hasCurrencyValue } =
  useCurrencyInput(modelValue, props.currency)

const baseInputClasses = computed(() => {
  return cn(
    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 border-0 bg-[rgba(0,0,0,0.05)] px-[12px] py-[10px] text-base shadow-none outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    "rounded-[12999px]",
    "focus-visible:ring-ring/50 focus-visible:ring-3",
    props.class,
  )
})

const currencyWrapperClasses = computed(() => {
  return cn(
    "flex items-center gap-1 rounded-[12999px] bg-[rgba(0,0,0,0.05)] px-[12px] py-[10px]",
    "focus-within:ring-ring/50 focus-within:ring-3",
    props.class,
  )
})

const currencyInputClasses =
  "placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

const currencySuffixClasses =
  "text-muted-foreground shrink-0 select-none text-base md:text-sm"
</script>

<template>
  <div
    v-if="isCurrency"
    data-slot="input"
    :class="currencyWrapperClasses"
  >
    <input
      v-model="currencyDisplayValue"
      type="text"
      inputmode="numeric"
      :placeholder="placeholderValue"
      :class="currencyInputClasses"
    >
    <span
      v-show="hasCurrencyValue"
      :class="currencySuffixClasses"
    >{{ props.currency }}</span>
  </div>

  <input
    v-else
    v-model="modelValue"
    :type="nativeType"
    data-slot="input"
    :placeholder="placeholderValue"
    :class="baseInputClasses"
  >
</template>
