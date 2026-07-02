<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "."
import { computed } from "vue"
import { Primitive } from "reka-ui"
import { cn } from "../../../lib/utils"
import { buttonVariants } from "."

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
})

const isPrimary = computed(() => props.variant === "default" || props.variant === undefined)
const isSecondary = computed(() => props.variant === "secondary")

const primaryStyle = computed(() => {
  if (!isPrimary.value) return undefined
  return {
    borderRadius: "999px",
    border: "0.243px solid #FF0",
    background: "linear-gradient(270deg, #7CD249 0%, #339D36 100%), #4DFF7F",
    padding: "10px 14px 10px 13px",
  }
})

const secondaryStyle = computed(() => {
  if (!isSecondary.value) return undefined
  return {
    borderRadius: "999px",
    background: "#FFF",
    boxShadow: "0 16px 32px 0 rgba(0, 177, 115, 0.06)",
    color: "#062",
    textAlign: "center",
    // Loaded @font-face family is "Google Sans Flex" (variable font). The old
    // "...120pt" name never matched any face → silent fallback to sans-serif.
    // Pin the 120 optical size via the variable opsz axis instead.
    fontFamily: '"Google Sans Flex", sans-serif',
    fontVariationSettings: '"opsz" 120',
    fontSize: "13px",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "16px",
    letterSpacing: "0.13px",
  }
})

const customStyle = computed(() => {
  if (isPrimary.value) return primaryStyle.value
  if (isSecondary.value) return secondaryStyle.value
  return undefined
})
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    :style="customStyle"
  >
    <slot />
  </Primitive>
</template>
