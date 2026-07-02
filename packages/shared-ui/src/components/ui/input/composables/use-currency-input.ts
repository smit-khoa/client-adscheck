import type { Ref } from "vue"
import { computed } from "vue"

const DEFAULT_LOCALE = "vi-VN"

export function formatCurrencyNumber(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatCurrencyValue(value: number, currency = "VND"): string {
  return `${formatCurrencyNumber(value)} ${currency}`
}

export function parseCurrencyValue(raw: string): number {
  const digits = raw.replace(/\D/g, "")
  return digits === "" ? 0 : Number.parseInt(digits, 10)
}

export function useCurrencyInput(
  modelValue: Ref<string | number | undefined>,
  currency = "VND",
) {
  const displayValue = computed<string>({
    get() {
      if (modelValue.value === undefined || modelValue.value === null || modelValue.value === "") {
        return ""
      }
      const num = Number(modelValue.value)
      if (Number.isNaN(num)) return ""
      return formatCurrencyNumber(num)
    },
    set(raw) {
      if (raw === "") {
        modelValue.value = ""
        return
      }
      modelValue.value = parseCurrencyValue(raw)
    },
  })

  const hasValue = computed(() => displayValue.value !== "")

  return {
    displayValue,
    hasValue,
    format: (value: number) => formatCurrencyValue(value, currency),
    parse: parseCurrencyValue,
  }
}
