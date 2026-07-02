<script setup lang="ts">
import { Icon } from '@mf2/shared-ui/icons';
import type { ExtendedPaymentField } from '../types';

defineProps<{
  field: ExtendedPaymentField;
  selected: boolean;
}>();
</script>

<template>
  <button
    type="button"
    class="field-card"
    :class="{ selected }"
  >
    <Icon :name="field.iconName" :size="28" class="field-icon" />
    <span>{{ field.label }}</span>
  </button>
</template>

<style scoped>
.field-card {
  display: flex;
  width: 100%;
  height: 90px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  padding: 15px 25px;
  color: #777e90;
  text-align: left;
  background: #f8f8f8;
  border: 0;
  border-radius: 8px;
  outline: solid 0.5px transparent;
  transition: all 0.3s;
}

.field-card:hover,
.field-card.selected {
  color: #10c987;
  background: rgba(231, 250, 244, 0.3);
  outline-color: #10c987;
}

.field-icon {
  flex-shrink: 0;
}

.field-card span {
  color: currentColor;
  font-size: 14px;
  font-weight: 500;
  line-height: 17px;
}
</style>
