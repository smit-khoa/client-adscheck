<template>
  <div class="pagination" aria-label="Phân trang bảng">
    <div class="pagination-control-group">
      <span class="pagination-desc">Hiển thị</span>
      <Select :model-value="limitModelValue" @update:model-value="onLimitChange">
        <SelectTrigger size="sm" class="pagination-select-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="item in displayPage" :key="item.value" :value="item.value">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="pagination-nav-pill" role="group" aria-label="Điều hướng trang">
        <button
          type="button"
          class="pagination-nav-button"
          :class="{ 'pagination-disable': isFirstPage }"
          :disabled="isFirstPage"
          aria-label="Trang trước"
          @click="changePage(paging.page - 1, 'pre')"
        >
          <Icon name="left" :size="18" />
        </button>
        <span class="pagination-page-indicator">{{ paging.page }}/{{ totalPages }}</span>
        <button
          type="button"
          class="pagination-nav-button"
          :class="{ 'pagination-disable': isLastPage }"
          :disabled="isLastPage"
          aria-label="Trang sau"
          @click="changePage(paging.page + 1, 'next')"
        >
          <Icon name="right" :size="18" />
        </button>
      </div>

      <span class="pagination-separator" aria-hidden="true"></span>

      <span class="pagination-total">
        <span class="pagination-total-strong">Tổng {{ selectedCount }}</span>
        <span class="pagination-total-muted"> / {{ totalLabel }}{{ paginationText ? ` ${paginationText}` : '' }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../select";
import { Icon } from "../../../icons";

interface PagingState {
  page: number;
  limit: number;
  total: number;
  has_next_page: boolean;
}

interface Props {
  paging?: PagingState;
  paginationText?: string;
  selectedCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  paging: () => ({
    page: 1,
    limit: 25,
    total: 0,
    has_next_page: false,
  }),
  paginationText: "",
  selectedCount: 0,
});

const emit = defineEmits<{
  (e: "changePage", page: number, limit: number): void;
}>();

const displayPage = [
  { label: "15", value: "15" },
  { label: "25", value: "25" },
  { label: "50", value: "50" },
  { label: "100", value: "100" },
  { label: "200", value: "200" },
  { label: "500", value: "500" },
  { label: "max", value: "0" },
];

const effectiveLimit = computed(() => {
  if (props.paging.limit === 0) return Math.max(props.paging.total, 1);
  return Math.max(props.paging.limit, 1);
});

const totalPages = computed(() => Math.max(1, Math.ceil(props.paging.total / effectiveLimit.value)));
const isFirstPage = computed(() => props.paging.page <= 1);
const isLastPage = computed(() => props.paging.page >= totalPages.value || !props.paging.has_next_page);
const limitModelValue = computed(() => (props.paging.limit === 0 ? "0" : String(props.paging.limit)));
const totalLabel = computed(() => props.paging.total.toLocaleString("vi-VN"));

const changePage = (page: number, direction: "next" | "pre") => {
  if (direction === "next" && isLastPage.value) return;
  if (direction === "pre" && isFirstPage.value) return;

  const nextPage = Math.min(Math.max(page, 1), totalPages.value);
  emit("changePage", nextPage, props.paging.limit);
};

const onLimitChange = (value: unknown) => {
  const limit = Number(value);
  if (Number.isNaN(limit) || props.paging.limit === limit) return;
  emit("changePage", 1, limit);
};
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 8px 20px;
  color: #5e6360;
  font-size: 14px;
  line-height: 20px;
}

.pagination-control-group {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.pagination-desc,
.pagination-total-muted {
  color: #a5aca7;
  font-weight: 400;
}

.pagination-select-trigger {
  width: 74px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: #ffffff;
  color: #5e6360;
  box-shadow: none;
}

.pagination-nav-pill {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 2px;
  border-radius: 999px;
  background: #ffffff;
  padding: 0 6px;
  color: #1f2421;
}

.pagination-nav-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #1f2421;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.pagination-nav-button:not(:disabled):hover {
  background: #d8e9e1;
}

.pagination-disable {
  cursor: not-allowed;
  color: #a5aca7;
  opacity: 0.55;
}

.pagination-page-indicator {
  min-width: 42px;
  color: #1f2421;
  font-weight: 500;
  text-align: center;
}

.pagination-separator {
  width: 1px;
  height: 28px;
  background: rgba(165, 172, 167, 0.45);
}

.pagination-total {
  white-space: nowrap;
}

.pagination-total-strong {
  color: #1f2421;
  font-weight: 500;
}
</style>
