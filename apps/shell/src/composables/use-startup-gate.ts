import { computed, ref } from 'vue';
import { useAuthStore } from '@mf2/shared-store';
import type { CheckHashGateResult } from '@/services/check-hash-gate';
import { verifySmitConnectHashGate } from '@/services/check-hash-gate';

export type StartupGateStatus = 'idle' | 'checking' | 'ready' | 'blocked';

const status = ref<StartupGateStatus>('idle');
const error = ref<CheckHashGateResult | null>(null);
const is_checking = computed(() => status.value === 'checking' || status.value === 'idle');
const LOG_PREFIX = '[StartupGate]';

// Session selection dialog state — shared across useStartupGate() calls (module-level)
const session_dialog_open = ref(false);
const loading_pro = ref(false);
const pro_error = ref(false);
let session_dialog_resolve: ((choice: 'pro' | 'normal') => void) | null = null;

async function runHashGate(): Promise<void> {
  const result = await verifySmitConnectHashGate();
  if (result.status === 'valid') {
    error.value = null;
    status.value = 'ready';
    return;
  }

  error.value = result;
  status.value = 'blocked';
}

export function useStartupGate() {
  function checkSessionSelection(): Promise<'pro' | 'normal' | void> {
    const auth = useAuthStore();
    if (!auth.is_authenticated) return Promise.resolve();
    // skip dialog if Pro session is already active on this device
    if (auth.is_pro_session_active) return Promise.resolve();
    // manager null means entitlements failed — skip dialog, user proceeds without session choice
    if (!auth.adscheck_manager) return Promise.resolve();

    pro_error.value = false;
    return new Promise<'pro' | 'normal'>((resolve) => {
      session_dialog_resolve = resolve;
      session_dialog_open.value = true;
    });
  }

  async function onSessionSelectPro(): Promise<void> {
    const auth = useAuthStore();
    loading_pro.value = true;
    pro_error.value = false;
    const ok = await auth.activateProSession();
    loading_pro.value = false;
    if (!ok) {
      pro_error.value = true;
      return;
    }
    session_dialog_open.value = false;
    session_dialog_resolve?.('pro');
    session_dialog_resolve = null;
  }

  function onSessionSelectNormal(): void {
    session_dialog_open.value = false;
    session_dialog_resolve?.('normal');
    session_dialog_resolve = null;
  }

  async function runStartupChecks(): Promise<void> {
    status.value = 'checking';
    error.value = null;
    const auth = useAuthStore();
    await auth.hydrateUser();
    if (auth.is_authenticated) {
      auth.trackLastVisit('ads-check');
      await auth.loadEntitlements();
    }
    await checkSessionSelection();
    await runHashGate();
  }

  async function retryHashGate(): Promise<void> {
    status.value = 'checking';
    error.value = null;
    await runHashGate();
  }

  return {
    status,
    error,
    is_checking,
    runStartupChecks,
    retryHashGate,
    session_dialog_open,
    loading_pro,
    pro_error,
    onSessionSelectPro,
    onSessionSelectNormal,
  };
}
