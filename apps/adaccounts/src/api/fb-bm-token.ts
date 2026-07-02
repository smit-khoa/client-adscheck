import { graphql } from './fb-graph';
import {
  getStorageData,
  invalidateStoredToken,
  isTokenFresh,
  updateStorageData,
} from './fb-token-cache';
import { isGraphError } from './types';

// BUSINESS_MANAGER access token, separate from the type-B (POWER_EDITOR) token
// in fb-token.ts. Some operations (sharing an ad account to a partner BM via
// /act_<id>/agencies) require this token, not the page-scraped one.
//
// Ported from adscheck Facebook.js getTokenBm: the BM token is NOT scraped from
// HTML — it comes from the internal GraphQL endpoint (doc_id 6805088329501573),
// reading data.business.bizKitSettingsConfig.apiAccessToken. The businessID is a
// fixed FB constant carried over verbatim from the reference tool.
//
// NOTE on imports: graphql() is referenced only inside the function body
// (call-time), never at module top-level, so the fb-bm-token ↔ fb-graph pairing
// stays cycle-safe under ES modules.

interface BmTokenResponse {
  data?: { business?: { bizKitSettingsConfig?: { apiAccessToken?: string } } };
}

let cachedBmToken: string | null = null;
// Shared in-flight fetch so concurrent callers (e.g. runBatch firing many
// share-partner runners at once) issue the GraphQL token request only once.
let inflight: Promise<string> | null = null;

async function fetchBmToken(): Promise<string> {
  const res = await graphql<BmTokenResponse>(
    {
      doc_id: '6805088329501573',
      variables: JSON.stringify({
        businessID: '1347771445924940',
        overridePrimaryBusinessLocationEligibility: false,
      }),
    },
    'business'
  );

  const token = isGraphError(res)
    ? null
    : res?.data?.business?.bizKitSettingsConfig?.apiAccessToken || null;

  if (!token) {
    throw new Error(
      'Không lấy được token Business Manager. Hãy đăng nhập Facebook trên trình duyệt rồi thử lại.'
    );
  }
  return token;
}

/**
 * Get the BUSINESS_MANAGER access token, fetching once and caching in memory.
 * Concurrent callers share one in-flight request. Throws a clear Error if it
 * can't be resolved (e.g. not logged in / FB schema changed). Reuses the shared
 * graphql() helper (auth via fb_dtsg + lsd).
 */
export async function getBmToken(forceRefresh = false): Promise<string> {
  if (cachedBmToken && !forceRefresh) return cachedBmToken;
  if (inflight) return inflight;

  inflight = resolveBmToken(forceRefresh);
  try {
    cachedBmToken = await inflight;
    return cachedBmToken;
  } finally {
    inflight = null;
  }
}

async function resolveBmToken(forceRefresh: boolean): Promise<string> {
  if (!forceRefresh) {
    const stored = await getStorageData();
    if (stored && isTokenFresh(stored.token_g, Date.now())) {
      return stored.token_g!.access_token;
    }
  }

  const token = await fetchBmToken();
  // Persist alongside token_b under the same encrypted bundle, 6h TTL.
  await updateStorageData({ token_g: { access_token: token, date: Date.now() } });
  return token;
}

/** Drop the cached BM token (in-memory + persisted) so the next call refetches. */
export async function resetBmToken(): Promise<void> {
  cachedBmToken = null;
  await invalidateStoredToken('token_g');
}
