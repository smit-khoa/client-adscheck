<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Draggable from 'vuedraggable';
import { Button, Switch, Textarea } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
import DataFieldCard from '../components/DataFieldCard.vue';
import PaymentPreview from '../components/PaymentPreview.vue';
import {
  DEFAULT_EXTENDED_PAYMENT_SETTINGS,
  EXTENDED_PAYMENT_FIELDS,
  EXTENDED_PAYMENT_STORAGE_KEYS,
} from '../components/extended-payment-data';
import type { ExtendedPaymentField, ExtendedPaymentSettings } from '../types';

const settings = ref<ExtendedPaymentSettings>({ ...DEFAULT_EXTENDED_PAYMENT_SETTINGS });
const selectedFields = ref<string[]>(
  EXTENDED_PAYMENT_FIELDS.filter((field) => field.defaultSelected).map((field) => field.key),
);
const orderedFields = ref<ExtendedPaymentField[]>([...EXTENDED_PAYMENT_FIELDS]);
const savedAt = ref<string>('');

const visiblePreviewFields = computed<ExtendedPaymentField[]>(() =>
  orderedFields.value.filter((field) => selectedFields.value.includes(field.key)),
);

onMounted(() => {
  settings.value = readJson<ExtendedPaymentSettings>(
    EXTENDED_PAYMENT_STORAGE_KEYS.settings,
    DEFAULT_EXTENDED_PAYMENT_SETTINGS,
  );
  selectedFields.value = readJson<string[]>(
    EXTENDED_PAYMENT_STORAGE_KEYS.selected,
    selectedFields.value,
  ).filter((key) => EXTENDED_PAYMENT_FIELDS.some((field) => field.key === key));

  const savedOrder = readJson<string[]>(EXTENDED_PAYMENT_STORAGE_KEYS.order, []);
  if (savedOrder.length > 0) {
    const byKey = new Map(EXTENDED_PAYMENT_FIELDS.map((field) => [field.key, field]));
    const known = savedOrder
      .map((key) => byKey.get(key))
      .filter((field): field is ExtendedPaymentField => Boolean(field));
    const missing = EXTENDED_PAYMENT_FIELDS.filter((field) => !savedOrder.includes(field.key));
    orderedFields.value = [...known, ...missing];
  }
});

watch(
  settings,
  (value) => {
    window.localStorage.setItem(EXTENDED_PAYMENT_STORAGE_KEYS.settings, JSON.stringify(value));
  },
  { deep: true },
);

watch(
  selectedFields,
  (value) => {
    window.localStorage.setItem(EXTENDED_PAYMENT_STORAGE_KEYS.selected, JSON.stringify(value));
  },
  { deep: true },
);

watch(
  orderedFields,
  (value) => {
    window.localStorage.setItem(
      EXTENDED_PAYMENT_STORAGE_KEYS.order,
      JSON.stringify(value.map((field) => field.key)),
    );
  },
  { deep: true },
);

function toggleField(key: string): void {
  selectedFields.value = selectedFields.value.includes(key)
    ? selectedFields.value.filter((fieldKey) => fieldKey !== key)
    : [...selectedFields.value, key];
}

function saveSettings(): void {
  savedAt.value = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date());
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (isPlainObject(fallback) && isPlainObject(parsed)) {
      return { ...fallback, ...parsed } as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
</script>

<template>
  <div class="extended-payment-shell">
    <div class="extended-payment-header">
      <div class="page-title">Extended Payment</div>
    </div>

    <div class="extended-payment-body">
      <section class="body-left" aria-label="Extended Payment settings">
        <div class="settings-header">
          <div class="section-title">
            <Icon name="settings" :size="18" />
            <span>CÀI ĐẶT CHUNG</span>
          </div>

          <div class="settings-grid">
            <label class="setting-card">
              <span>Ngôn ngữ hiển thị</span>
              <select v-model="settings.language" class="setting-select" aria-label="Ngôn ngữ hiển thị">
                <option value="auto">Tự động</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>

            <label class="setting-card">
              <span>Hiển thị bong bóng dữ liệu trang</span>
              <Switch v-model="settings.bubble_display" class="setting-switch" />
            </label>

            <label class="setting-card">
              <span>Quy đổi tiền tệ:</span>
              <select v-model="settings.currency_mode" class="setting-select" aria-label="Quy đổi tiền tệ">
                <option value="auto">Tự động</option>
                <option value="custom">Tuỳ chỉnh</option>
              </select>
            </label>

            <label class="setting-card">
              <span class="setting-label-with-icon">
                Đổi hiển thị tiền tệ thành:
                <Icon name="info" :size="14" />
              </span>
              <select v-model="settings.display_currency" class="setting-select" aria-label="Đổi hiển thị tiền tệ thành">
                <option value="default">Tự động</option>
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
        </div>

        <div class="body-main">
          <div class="body-main-header">
            <div class="section-title">
              <Icon name="layout-dashboard" :size="18" />
              <span>CHỌN DỮ LIỆU BẠN MUỐN HIỂN THỊ TRÊN BUBBLE</span>
            </div>
            <div class="hint-text">
              <Icon name="info" :size="15" />
              <span>Bạn có thể thay đổi vị trí các trường dữ liệu bằng cách di chuột vào biểu tượng</span>
              <Icon name="grip-vertical" :size="15" />
            </div>
          </div>

          <Draggable
            v-model="orderedFields"
            item-key="key"
            handle=".extended-payment-drag-handle"
            class="field-grid"
          >
            <template #item="{ element }">
              <div class="field-grid-item">
                <button
                  type="button"
                  class="extended-payment-drag-handle drag-button"
                  aria-label="Kéo đổi vị trí"
                >
                  <Icon name="grip-vertical" :size="15" />
                </button>
                <DataFieldCard
                  :field="element"
                  :selected="selectedFields.includes(element.key)"
                  @click="toggleField(element.key)"
                />
              </div>
            </template>
          </Draggable>
        </div>

        <div class="signature-section">
          <div class="signature-header">
            <div class="section-title">
              <Icon name="settings" :size="18" />
              <span>CHỮ KÝ CÁ NHÂN</span>
            </div>
            <Button variant="outline" size="sm" class="save-button" @click="saveSettings">Lưu</Button>
          </div>
          <Textarea
            v-model="settings.signature"
            class="signature-textarea"
            placeholder="Nhập chữ ký hiển thị ở cuối bubble..."
          />
          <p v-if="savedAt" class="saved-at">Đã lưu cấu hình lúc {{ savedAt }}</p>
        </div>
      </section>

      <PaymentPreview :fields="visiblePreviewFields" :signature="settings.signature" />
    </div>
  </div>
</template>

<style scoped>
.extended-payment-shell {
  height: 100%;
  overflow: hidden;
  background: #fff;
  color: #353f52;
  border-radius: 0 10px 0 0;
}

.extended-payment-header {
  position: relative;
  z-index: 2;
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px 0 0;
  background: #fff;
  color: #3e485c;
  border-radius: 0 10px 0 0;
}

.extended-payment-header::before {
  position: absolute;
  bottom: -20px;
  width: 20px;
  height: 20px;
  content: '';
  background-image: radial-gradient(circle at 100% 100%, transparent 0%, transparent 26px, #fff 20px);
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.extended-payment-body {
  display: flex;
  width: 100%;
  height: calc(100% - 60px);
  overflow: hidden;
  background: #fff;
  border-top: 1px solid #10c987;
  border-left: 1px solid #10c987;
  border-radius: 10px 0 10px 0;
}

.body-left {
  width: calc(100% - 395px);
  max-width: 1300px;
  height: 100%;
  padding: 30px;
  overflow: auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #777e90;
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
}

.section-title :deep(svg) {
  color: #10c987;
}

.settings-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.setting-card {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
  color: #353f52;
}

.setting-card span {
  font-size: 14px;
  font-weight: 500;
  line-height: 14px;
  color: #353f52;
}

.setting-label-with-icon {
  display: flex;
  align-items: center;
  gap: 4px;
}

.setting-label-with-icon :deep(svg) {
  color: #9aa2b2;
}

.setting-select {
  flex-shrink: 0;
  min-width: 88px;
  height: 30px;
  padding: 5px 24px 5px 8px;
  color: #777e90;
  font-size: 14px;
  font-weight: 700;
  line-height: 14px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 5px;
  outline: none;
}

.setting-switch {
  flex-shrink: 0;
}

.body-main {
  margin-top: 47px;
  padding: 40px 0;
  border-top: 1px dashed #e6e8ec;
  border-bottom: 1px dashed #e6e8ec;
}

.body-main-header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hint-text {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #777e90;
  font-size: 13px;
  font-weight: 400;
  line-height: 17px;
  white-space: nowrap;
}

.hint-text :deep(svg) {
  color: #b4bfce;
}

.field-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(185px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.field-grid-item {
  position: relative;
  min-width: 0;
}

.drag-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #b4bfce;
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: move;
}

.drag-button:hover {
  color: #10c987;
  background: rgba(231, 250, 244, 0.65);
}

.signature-section {
  margin-top: 40px;
}

.signature-header {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.save-button {
  width: 55px;
  height: 24px;
  border-color: #10c987;
  color: #10c987;
}

.signature-textarea {
  min-height: 72px;
  margin-top: 13px;
  border-color: #e6e8ec;
  color: #353f52;
}

.saved-at {
  margin-top: 8px;
  color: #10a979;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 1280px) {
  .settings-grid,
  .field-grid {
    grid-template-columns: repeat(2, minmax(185px, 1fr));
  }

  .hint-text {
    white-space: normal;
  }
}
</style>
