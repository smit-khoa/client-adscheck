import { describe, expect, it } from "vitest"
import { ref } from "vue"
import {
  formatCurrencyNumber,
  formatCurrencyValue,
  parseCurrencyValue,
  useCurrencyInput,
} from "../use-currency-input"

describe("use-currency-input", () => {
  describe("formatCurrencyNumber", () => {
    it("formats number with Vietnamese locale separators", () => {
      expect(formatCurrencyNumber(0)).toBe("0")
      expect(formatCurrencyNumber(12)).toBe("12")
      expect(formatCurrencyNumber(12000)).toBe("12.000")
      expect(formatCurrencyNumber(1234567)).toBe("1.234.567")
    })
  })

  describe("formatCurrencyValue", () => {
    it("appends currency code", () => {
      expect(formatCurrencyValue(12000, "VND")).toBe("12.000 VND")
      expect(formatCurrencyValue(100, "USD")).toBe("100 USD")
    })

    it("defaults to VND", () => {
      expect(formatCurrencyValue(50000)).toBe("50.000 VND")
    })
  })

  describe("parseCurrencyValue", () => {
    it("extracts digits from formatted input", () => {
      expect(parseCurrencyValue("12.000 VND")).toBe(12000)
      expect(parseCurrencyValue("1.234.567")).toBe(1234567)
    })

    it("ignores non-digit characters", () => {
      expect(parseCurrencyValue("abc123def")).toBe(123)
      expect(parseCurrencyValue("$1,000.50")).toBe(100050)
    })

    it("returns zero for empty input", () => {
      expect(parseCurrencyValue("")).toBe(0)
    })
  })

  describe("useCurrencyInput", () => {
    it("exposes formatted display value and emits parsed number on edit", () => {
      const modelValue = ref<string | number | undefined>(12000)
      const { displayValue, hasValue } = useCurrencyInput(modelValue, "VND")

      expect(displayValue.value).toBe("12.000")
      expect(hasValue.value).toBe(true)

      displayValue.value = "25.000"
      expect(modelValue.value).toBe(25000)
    })

    it("clears model value when display value is empty", () => {
      const modelValue = ref<string | number | undefined>(12000)
      const { displayValue, hasValue } = useCurrencyInput(modelValue, "VND")

      displayValue.value = ""

      expect(modelValue.value).toBe("")
      expect(hasValue.value).toBe(false)
    })

    it("treats undefined model as empty", () => {
      const modelValue = ref<string | number | undefined>(undefined)
      const { displayValue, hasValue } = useCurrencyInput(modelValue, "VND")

      expect(displayValue.value).toBe("")
      expect(hasValue.value).toBe(false)
    })
  })
})
