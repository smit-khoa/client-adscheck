// Tests for checkSessionSelection() skip/show logic in useStartupGate.
// Only the decision branch is exercised — dialog resolution and hash-gate are out of scope here.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Drains the full microtask + macrotask queue so async chains inside composables complete
const flushPromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// Mock heavy services so the module can be imported in node env
vi.mock('@/services/check-hash-gate', () => ({
  verifySmitConnectHashGate: vi.fn().mockResolvedValue({ status: 'valid' }),
}));

// Intercept @mf2/shared-store so we control auth state without hitting the network
const mockAuthStore = {
  is_authenticated: false,
  is_pro_session_active: false,
  use_normal_session: false,
  adscheck_manager: null as Record<string, unknown> | null,
  activateProSession: vi.fn(),
  useNormalSession: vi.fn(),
  hydrateUser: vi.fn(),
  loadEntitlements: vi.fn(),
};

vi.mock('@mf2/shared-store', () => ({
  useAuthStore: () => mockAuthStore,
}));

import { useStartupGate } from '../use-startup-gate';

beforeEach(() => {
  setActivePinia(createPinia());
  mockAuthStore.is_authenticated = false;
  mockAuthStore.is_pro_session_active = false;
  mockAuthStore.use_normal_session = false;
  mockAuthStore.adscheck_manager = null;
  mockAuthStore.activateProSession.mockReset();
  mockAuthStore.useNormalSession.mockReset();
  mockAuthStore.hydrateUser.mockReset().mockResolvedValue(undefined);
  mockAuthStore.loadEntitlements.mockReset().mockResolvedValue(undefined);
});

describe('checkSessionSelection — skip conditions', () => {
  it('does not open dialog when user is not authenticated', async () => {
    mockAuthStore.is_authenticated = false;
    mockAuthStore.adscheck_manager = { session_actived: false };

    const gate = useStartupGate();
    await gate.runStartupChecks();

    expect(gate.session_dialog_open.value).toBe(false);
  });

  it('does not open dialog when Pro session is already active on this device', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = true;
    mockAuthStore.adscheck_manager = { session_actived: true };

    const gate = useStartupGate();
    await gate.runStartupChecks();

    expect(gate.session_dialog_open.value).toBe(false);
  });

  it('does not open dialog when adscheck_manager is null (entitlements failed)', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = false;
    mockAuthStore.use_normal_session = false;
    mockAuthStore.adscheck_manager = null;

    const gate = useStartupGate();
    await gate.runStartupChecks();

    expect(gate.session_dialog_open.value).toBe(false);
  });
});

describe('checkSessionSelection — dialog shown for new unactivated device', () => {
  it('opens dialog when authenticated, session not yet active, not normal, manager present', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = false;
    mockAuthStore.use_normal_session = false;
    mockAuthStore.adscheck_manager = { session_actived: false, session_used: 1, session_limited: 5 };

    const gate = useStartupGate();
    // runStartupChecks stalls waiting for dialog — resolve externally
    const startup = gate.runStartupChecks();
    await flushPromises();

    expect(gate.session_dialog_open.value).toBe(true);

    gate.onSessionSelectNormal();
    await startup;
  });
});

describe('onSessionSelectNormal', () => {
  it('closes dialog without calling useNormalSession or persisting to localStorage', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = false;
    mockAuthStore.use_normal_session = false;
    mockAuthStore.adscheck_manager = { session_actived: false };

    const gate = useStartupGate();
    const startup = gate.runStartupChecks();
    await flushPromises();

    gate.onSessionSelectNormal();
    await startup;

    // must NOT persist — dialog will show again on next reload
    expect(mockAuthStore.useNormalSession).not.toHaveBeenCalled();
    expect(gate.session_dialog_open.value).toBe(false);
  });

  it('shows popup again on next startup (no localStorage skip)', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = false;
    mockAuthStore.use_normal_session = false;
    mockAuthStore.adscheck_manager = { session_actived: false };

    const gate = useStartupGate();

    // First load — user picks normal
    const startup1 = gate.runStartupChecks();
    await flushPromises();
    gate.onSessionSelectNormal();
    await startup1;

    // Second load (simulated by calling checkSessionSelection again via runStartupChecks)
    // use_normal_session is still false because we never persisted
    const startup2 = gate.runStartupChecks();
    await flushPromises();

    expect(gate.session_dialog_open.value).toBe(true);

    gate.onSessionSelectNormal();
    await startup2;
  });
});

describe('onSessionSelectPro', () => {
  it('closes dialog and clears loading on successful activation', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = false;
    mockAuthStore.use_normal_session = false;
    mockAuthStore.adscheck_manager = { session_actived: false };
    mockAuthStore.activateProSession.mockResolvedValue(true);

    const gate = useStartupGate();
    const startup = gate.runStartupChecks();
    await flushPromises();

    await gate.onSessionSelectPro();
    await startup;

    expect(mockAuthStore.activateProSession).toHaveBeenCalledTimes(1);
    expect(gate.session_dialog_open.value).toBe(false);
    expect(gate.loading_pro.value).toBe(false);
    expect(gate.pro_error.value).toBe(false);
  });

  it('keeps dialog open and sets pro_error when activation fails', async () => {
    mockAuthStore.is_authenticated = true;
    mockAuthStore.is_pro_session_active = false;
    mockAuthStore.use_normal_session = false;
    mockAuthStore.adscheck_manager = { session_actived: false };
    mockAuthStore.activateProSession.mockResolvedValue(false);

    const gate = useStartupGate();
    gate.runStartupChecks();
    await flushPromises();

    await gate.onSessionSelectPro();

    expect(gate.session_dialog_open.value).toBe(true);
    expect(gate.pro_error.value).toBe(true);
    expect(gate.loading_pro.value).toBe(false);

    // cleanup
    gate.onSessionSelectNormal();
  });
});
