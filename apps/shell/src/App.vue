<script setup lang="ts">
import { SpriteProvider } from '@mf2/shared-ui/icons';
import { SmitLoading } from '@mf2/shared-ui/core';
import { useAuthStore } from '@mf2/shared-store';
import StartupGateError from './components/StartupGateError.vue';
import SessionSelectionDialog from './components/SessionSelectionDialog.vue';
import { useStartupGate } from './composables/use-startup-gate';

const {
  status,
  error,
  is_checking,
  retryHashGate,
  session_dialog_open,
  loading_pro,
  pro_error,
  onSessionSelectPro,
  onSessionSelectNormal,
} = useStartupGate();

const auth = useAuthStore();
</script>

<template>
  <SpriteProvider>
    <StartupGateError
      v-if="status === 'blocked' && error"
      :error="error"
      :retrying="is_checking"
      @retry="retryHashGate"
    />
    <SmitLoading
      v-else-if="is_checking && !session_dialog_open"
      message="Đang kiểm tra SMIT Connect..."
    />
    <router-view v-else />

    <SessionSelectionDialog
      :open="session_dialog_open"
      :manager="auth.adscheck_manager"
      :loading-pro="loading_pro"
      :pro-error="pro_error"
      @select-pro="onSessionSelectPro"
      @select-normal="onSessionSelectNormal"
    />
  </SpriteProvider>
</template>
