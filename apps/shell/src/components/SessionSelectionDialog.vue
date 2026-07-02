<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@mf2/shared-ui';
import { Icon } from '@mf2/shared-ui/icons';
import type { AdscheckManager } from '@mf2/shared-types';

const props = withDefaults(
  defineProps<{
    open: boolean;
    manager: AdscheckManager | null;
    loadingPro?: boolean;
    proError?: boolean;
  }>(),
  {
    loadingPro: false,
    proError: false,
  }
);

const emit = defineEmits<{
  (e: 'select-pro'): void;
  (e: 'select-normal'): void;
}>();

const slots_used = computed(() => props.manager?.session_used ?? 0);
const slots_total = computed(() => props.manager?.session_limited ?? null);
const is_max = computed(() => {
  if (slots_total.value == null) return false;
  return slots_used.value >= slots_total.value;
});
const slots_remaining = computed(() => {
  if (slots_total.value == null || is_max.value) return 0;
  return slots_total.value - slots_used.value;
});
const slot_label = computed(() => {
  if (slots_total.value == null) return '';
  return ` (${slots_used.value}/${slots_total.value})`;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="session-gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-gate-title">
      <div class="session-gate-card">
        <div class="session-gate-hero" aria-hidden="true">
          <div class="session-gate-sheet">
            <div class="session-gate-sheet-top">
              <span />
              <span />
            </div>
            <div class="session-gate-sheet-line session-gate-sheet-line--short" />
            <div class="session-gate-sheet-line" />
            <div class="session-gate-sheet-line" />
            <Icon class="session-gate-sheet-check" name="check-circle" size="20" />
          </div>
          <Icon class="session-gate-hero-badge" name="settings" size="20" />
        </div>

        <h2 id="session-gate-title" class="session-gate-title">Đăng nhập trên thiết bị mới</h2>
        <p class="session-gate-desc">
          Để sử dụng các tính năng nâng cao hãy chọn sử dụng phiên Pro hoặc chọn phiên
          đăng nhập thường để sử dụng các tính năng miễn phí.
        </p>

        <div class="session-gate-actions">
          <Button
            class="session-gate-btn"
            size="lg"
            :disabled="is_max || loadingPro"
            @click="emit('select-pro')"
          >
            <span v-if="loadingPro">Đang kích hoạt...</span>
            <span v-else>Sử dụng phiên đăng nhập PRO{{ slot_label }}</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            class="session-gate-btn session-gate-btn--normal"
            :disabled="loadingPro"
            @click="emit('select-normal')"
          >
            Sử dụng phiên đăng nhập thường
          </Button>
        </div>

        <p v-if="proError" class="session-gate-footer session-gate-footer--error">
          Không thể kích hoạt phiên Pro. Vui lòng thử lại hoặc chọn phiên thường.
        </p>
        <p v-else-if="is_max" class="session-gate-footer session-gate-footer--error">
          Bạn đã sử dụng hết {{ slots_total }} phiên đăng nhập Pro.
        </p>
        <p v-else-if="slots_total != null" class="session-gate-footer">
          Bạn còn {{ slots_remaining }} phiên đăng nhập Pro
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.session-gate-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
}

.session-gate-card {
  position: relative;
  max-width: 430px;
  width: calc(100% - 32px);
  padding: 132px 36px 34px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 26px;
  background:
    radial-gradient(circle at 82% 8%, rgba(126, 237, 162, 0.16), transparent 30%),
    #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.session-gate-hero {
  position: absolute;
  top: -72px;
  left: 52px;
  width: 176px;
  height: 124px;
}

.session-gate-sheet {
  position: relative;
  width: 146px;
  height: 106px;
  padding: 18px 18px 14px;
  border: 3px solid #12b981;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #eefdf4 100%);
  box-shadow: 0 18px 30px rgba(16, 185, 129, 0.2);
  transform: rotate(5deg);
}

.session-gate-sheet-top {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.session-gate-sheet-top span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #10b981;
}

.session-gate-sheet-line {
  width: 84px;
  height: 7px;
  margin-top: 7px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.22);
}

.session-gate-sheet-line--short {
  width: 50px;
  background: #10b981;
}

.session-gate-sheet-check {
  position: absolute;
  right: -16px;
  bottom: 18px;
  color: #facc15;
  filter: drop-shadow(0 6px 10px rgba(250, 204, 21, 0.3));
}

.session-gate-hero-badge {
  position: absolute;
  right: 0;
  bottom: 34px;
  color: #059669;
  filter: drop-shadow(0 8px 14px rgba(5, 150, 105, 0.2));
}

.session-gate-title {
  font-size: 1.875rem;
  line-height: 1.16;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: #0f172a;
  margin: 0;
}

.session-gate-desc {
  max-width: 340px;
  font-size: 1.0625rem;
  line-height: 1.65;
  font-weight: 500;
  color: #475569;
  margin: 0;
}

.session-gate-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 56px;
}

.session-gate-btn {
  width: 100%;
  min-height: 54px;
  font-size: 1rem;
  font-weight: 700;
}

.session-gate-btn--normal {
  border-color: #e2e8f0;
  background: #ffffff;
  color: #334155;
}

.session-gate-btn--normal:hover {
  border-color: rgba(16, 185, 129, 0.34);
  background: #f8fafc;
}

.session-gate-footer {
  margin: -4px 0 0;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  color: #94a3b8;
}

.session-gate-footer--error {
  color: #dc2626;
}

@media (max-width: 480px) {
  .session-gate-card {
    padding: 116px 24px 28px;
  }

  .session-gate-hero {
    left: 28px;
  }

  .session-gate-title {
    font-size: 1.625rem;
  }
}
</style>
