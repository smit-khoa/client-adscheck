<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@mf2/shared-ui/form-controls';
import { Icon } from '@mf2/shared-ui/icons';
import type { CheckHashGateResult } from '@/services/check-hash-gate';

interface Props {
  error: CheckHashGateResult;
  retrying?: boolean;
}

interface Emit {
  (e: 'retry'): void;
}

const props = withDefaults(defineProps<Props>(), {
  retrying: false,
});

const emit = defineEmits<Emit>();

const title = computed(() => {
  switch (props.error.status) {
    case 'extension_missing':
      return 'Không tìm thấy SMIT Connect';
    case 'hash_mismatch':
      return 'SMIT Connect không đúng phiên bản';
    case 'api_error':
      return 'Chưa kiểm tra được SMIT Connect';
    case 'extension_error':
      return 'Không đọc được SMIT Connect';
    default:
      return 'SMIT Connect chưa sẵn sàng';
  }
});

const description = computed(
  () => props.error.message || 'Hãy kiểm tra extension SMIT Connect rồi thử lại.'
);

function retry(): void {
  emit('retry');
}
</script>

<template>
  <main class="startup-gate">
    <section class="startup-gate__panel" role="alert" aria-live="assertive">
      <div class="startup-gate__icon">
        <Icon name="square-lock-02" size="28" />
      </div>
      <p class="startup-gate__eyebrow">Startup check</p>
      <h1>{{ title }}</h1>
      <p class="startup-gate__description">{{ description }}</p>
      <ul v-if="error.mismatches?.length" class="startup-gate__mismatches">
        <li v-for="item in error.mismatches" :key="item.path">
          {{ item.path }}
        </li>
      </ul>
      <Button :disabled="retrying" @click="retry">
        {{ retrying ? 'Đang thử lại...' : 'Thử lại' }}
      </Button>
    </section>
  </main>
</template>

<style scoped>
.startup-gate {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(115, 194, 88, 0.18), transparent 34%),
    #0a1628;
}

.startup-gate__panel {
  width: min(100%, 480px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background: rgba(15, 29, 50, 0.92);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}

.startup-gate__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  color: #83d96a;
  background: rgba(131, 217, 106, 0.14);
}

.startup-gate__eyebrow {
  margin: 0;
  color: #83d96a;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: 1.15;
}

.startup-gate__description {
  margin: 0;
  color: rgba(248, 250, 252, 0.76);
  line-height: 1.6;
}

.startup-gate__mismatches {
  max-height: 160px;
  width: 100%;
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  border-radius: 12px;
  color: #fecaca;
  background: rgba(127, 29, 29, 0.18);
  font-size: 0.875rem;
}
</style>
