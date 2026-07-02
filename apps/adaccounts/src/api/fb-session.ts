import { resetBmToken } from './fb-bm-token';
import { resetToken } from './fb-token';
import { resetAutoToken } from './fb-token-auto';
import { getStorageData, parseSessionMetadata, updateStorageData } from './fb-token-cache';
import { resetLegacyGraphqlToken } from './fb-token-graphql';
import { extFetch, extStorageRemove, extStorageSet } from './smit-connect';

const BANZAI_URL = 'https://www.facebook.com/ajax/bootloader-endpoint/?modules=Banzai';

const DATA_CACHE_KEYS = {
  adaccounts: 'v8_adaccount_cached',
  businesses: 'v8_bm_rows_cached',
  page: 'v8_page_rows_cached',
} as const;

const OBSOLETE_CACHE_KEYS = [
  'v8_last_adaccount_cached',
  'v8_last_bm_rows_cached',
  'v8_bm_active_config_cached',
  'v8_last_page_rows_cached',
  'v8_page_config_cached',
  'v8_page_progress_cached',
];

export interface FacebookSessionResult {
  status: 'logged_in' | 'not_logged_in' | 'switched';
  user_id?: string;
  message?: string;
}

const SESSION_CACHE_TTL_MS = 60_000; // 1 minute

let cachedSession: FacebookSessionResult | null = null;
let cachedAt = 0;
let inflight: Promise<FacebookSessionResult> | null = null;

function isCacheFresh(): boolean {
  return cachedSession !== null && Date.now() - cachedAt < SESSION_CACHE_TTL_MS;
}

/** Drop the cached session so the next call probes Facebook again. */
export function invalidateFacebookSessionCache(): void {
  cachedSession = null;
  cachedAt = 0;
}

async function resetFacebookState(): Promise<void> {
  const stalePayloads = {
    [DATA_CACHE_KEYS.adaccounts]: { user_id: undefined, saved_at: 0, data: [] },
    [DATA_CACHE_KEYS.businesses]: {
      user_id: undefined,
      saved_at: 0,
      data: { rows: [], activeConfig: null },
    },
    [DATA_CACHE_KEYS.page]: {
      user_id: undefined,
      saved_at: 0,
      data: { rows: [], config: null, progress: null },
    },
  };

  await Promise.all([
    resetToken(),
    resetAutoToken(),
    resetLegacyGraphqlToken(),
    resetBmToken(),
    extStorageSet(stalePayloads),
    extStorageRemove(OBSOLETE_CACHE_KEYS),
  ]);
}

async function probeFacebookSession(): Promise<FacebookSessionResult> {
  let text = '';
  try {
    text = await extFetch(BANZAI_URL);
  } catch {
    await resetFacebookState();
    return {
      status: 'not_logged_in',
      message: 'Bạn chưa đăng nhập Facebook trên trình duyệt hoặc chưa bật SMIT Connect.',
    };
  }

  const session = parseSessionMetadata(text);
  if (!session.user_id) {
    await resetFacebookState();
    return {
      status: 'not_logged_in',
      message: 'Bạn chưa đăng nhập Facebook trên trình duyệt.',
    };
  }

  const stored = await getStorageData();
  const switched = Boolean(stored?.user_id && stored.user_id !== session.user_id);
  if (switched) await resetFacebookState();

  await updateStorageData(session);

  return {
    status: switched ? 'switched' : 'logged_in',
    user_id: session.user_id,
  };
}

/**
 * Probe the browser's live Facebook session before hydrating extension caches.
 * This mirrors the legacy Banzai login check so account switches/logout cannot
 * reuse token/data cached for a previous Facebook user.
 *
 * The result is cached for 1 minute to avoid repeated Banzai probes when the
 * user switches tabs inside the same app session. Call
 * `invalidateFacebookSessionCache()` if you need to force a fresh probe.
 */
export async function checkFacebookSession(): Promise<FacebookSessionResult> {
  if (isCacheFresh()) return cachedSession!;
  if (inflight) return inflight;

  inflight = probeFacebookSession();
  try {
    cachedSession = await inflight;
    cachedAt = Date.now();
    return cachedSession;
  } finally {
    inflight = null;
  }
}
