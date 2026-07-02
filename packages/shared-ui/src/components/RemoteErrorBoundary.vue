<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";

const props = defineProps<{ name: string }>();

const error = ref<Error | null>(null);
const retry_count = ref(0);

onErrorCaptured((err) => {
  error.value = err as Error;
  console.error(`[Remote:${props.name}]`, err);
  // Ngăn lỗi lan lên trên — boundary đã xử lý.
  return false;
});

function handleRetry() {
  error.value = null;
  // Tăng key để remount toàn bộ subtree (load lại remote).
  retry_count.value += 1;
}
</script>

<template>
  <div
    v-if="error"
    class="rounded-lg border border-red-200 bg-red-50 p-6"
    role="alert"
  >
    <h3 class="text-base font-semibold text-red-900">
      Remote "{{ name }}" không tải được
    </h3>
    <p class="mt-1 text-sm text-red-700">{{ error.message }}</p>
    <button
      class="mt-3 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      @click="handleRetry"
    >
      Thử lại
    </button>
  </div>
  <div v-else style="display: contents">
    <!-- retryKey truyền xuống slot để consumer tạo lại async component khi bấm "Thử lại". -->
    <slot :retry-key="retry_count" />
  </div>
</template>
