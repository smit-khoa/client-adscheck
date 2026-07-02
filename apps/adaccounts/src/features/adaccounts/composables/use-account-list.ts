import { ref } from 'vue';
import { checkFacebookSession } from '../../../api/fb-session';
import { getToken } from '../../../api/fb-token';
import { extStorageGet, extStorageSet } from '../../../api/smit-connect';
import { fetchAdAccounts } from '../api/list-adaccounts';
import type { AdAccount, LoadAdAccountsConfig } from '../types/account-list.types';

// Module-scoped so every consumer reads the same account list instance. The
// remote is an MF singleton, so this list survives navigation in/out of the app.
// Data comes from the FB Graph API (via the extension) — see api/list-adaccounts.
const accounts = ref<AdAccount[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
let loadedOnce = false;

// Persist the list in the SMIT Connect extension's chrome.storage.local (same
// backing store the v6 adscheck app used) so reopening the panel shows accounts
// without re-hitting FB. v8_-prefixed keys keep the v8 shape ({id,name,status,
// currency}) separate from v6's adaccount_cached (full insight rows).
const DATA_KEY = 'v8_adaccount_cached';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface UserScopedCache<T> {
  user_id?: string;
  saved_at: number;
  data: T;
}

function isUserScopedCache(value: unknown): value is UserScopedCache<AdAccount[]> {
  return typeof value === 'object' && value !== null && 'data' in value && 'saved_at' in value;
}

async function getCurrentUserId(): Promise<string | undefined> {
  try {
    return (await getToken()).user_id;
  } catch {
    return undefined;
  }
}

async function readCacheIfFresh(): Promise<AdAccount[] | null> {
  const data = await extStorageGet<unknown>(DATA_KEY);
  const currentUserId = await getCurrentUserId();

  if (isUserScopedCache(data)) {
    if (!data.saved_at || Date.now() - data.saved_at >= CACHE_TTL_MS) return null;
    if (currentUserId && data.user_id !== currentUserId) return null;
    return Array.isArray(data.data) ? data.data : null;
  }

  // Legacy raw-array cache has no FB owner and no saved_at. Trust it only when the
  // current FB user cannot be resolved; otherwise avoid showing another user's rows.
  if (Array.isArray(data) && !currentUserId) return data;
  return null;
}

async function writeCache(list: AdAccount[]): Promise<void> {
  await extStorageSet({
    [DATA_KEY]: { user_id: await getCurrentUserId(), saved_at: Date.now(), data: list },
  });
}

async function load(config: Partial<LoadAdAccountsConfig> = {}): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    const session = await checkFacebookSession();
    if (session.status === 'not_logged_in') {
      error.value = session.message ?? 'Bạn chưa đăng nhập Facebook trên trình duyệt.';
      accounts.value = [];
      loadedOnce = false;
      return;
    }
    if (session.status === 'switched') {
      accounts.value = [];
      loadedOnce = false;
    }

    accounts.value = await fetchAdAccounts(config);
    await writeCache(accounts.value);
    loadedOnce = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    accounts.value = [];
  } finally {
    isLoading.value = false;
  }
}

export function useAccountList() {
  // First use: hydrate from the extension cache when it's still fresh (no FB
  // call); otherwise fetch. The refresh button always re-fetches and overwrites
  // the cache. isLoading stays true across the async cache probe so the table
  // shows skeletons instead of an empty flash.
  const ensureLoaded = async () => {
    if (isLoading.value) return;

    const session = await checkFacebookSession();
    if (session.status === 'not_logged_in') {
      error.value = session.message ?? 'Bạn chưa đăng nhập Facebook trên trình duyệt.';
      accounts.value = [];
      loadedOnce = false;
      return;
    }
    if (session.status === 'switched') {
      accounts.value = [];
      loadedOnce = false;
    }

    if (loadedOnce) return;
    isLoading.value = true;
    let cached: AdAccount[] | null = null;
    try {
      cached = await readCacheIfFresh();
    } catch {
      // ignore — fall through to a real fetch
    }
    if (cached) {
      accounts.value = cached;
      loadedOnce = true;
      isLoading.value = false;
      return;
    }
    isLoading.value = false; // load() re-sets it; no paint between awaits
    await load();
  };

  // Apply per-account field changes after a tool run (e.g. rename → { name },
  // open/close → { status }) to the in-memory list and the extension cache, so
  // the table reflects the new data without re-fetching from FB. Generic: any
  // tool that returns a `patch` updates here — no per-tool wiring needed.
  const applyPatches = (patches: Map<string, Partial<AdAccount>>) => {
    if (patches.size === 0) return;
    accounts.value = accounts.value.map((a) =>
      patches.has(a.id) ? { ...a, ...patches.get(a.id) } : a
    );
    void writeCache(accounts.value);
  };

  const hydrateFromCache = async () => {
    if (loadedOnce || accounts.value.length > 0 || isLoading.value) return;
    try {
      const cached = await readCacheIfFresh();
      if (cached) {
        accounts.value = cached;
        loadedOnce = true;
      }
    } catch {
      // Cache hydration is best-effort; ignore storage failures.
    }
  };

  return {
    accounts,
    isLoading,
    error,
    ensureLoaded,
    hydrateFromCache,
    refresh: load,
    loadWithConfig: load,
    applyPatches,
  };
}
