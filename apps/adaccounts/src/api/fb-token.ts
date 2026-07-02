import { extFetch } from './smit-connect';
import {
  getStorageData,
  invalidateStoredToken,
  parseSessionMetadata,
  readCachedToken,
  sessionFromBundle,
  writeCachedToken,
} from './fb-token-cache';
import type { FbTokenBundle } from './types';

// Acquire the FB token bundle for the user currently logged in on the browser.
// Ported from Facebook.js getFacebookToken({ type: 'B' }): fetch the Ads Manager
// page through the extension and regex out the tokens from the embedded config.
// Token is for the logged-in user (1 user acts on many ad accounts), NOT
// per-account. Stored in extension storage with the same 6h TTL as adscheck.

const ADS_MANAGER_URL = 'https://adsmanager.facebook.com/adsmanager/';

let cached: FbTokenBundle | null = null;
let inflight: Promise<FbTokenBundle> | null = null;

// Extract the token bundle from a fetched FB page's HTML/JSON text.
export function parseTokens(html: string): FbTokenBundle | null {
  // type B (POWER_EDITOR) embeds the access token as __accessToken="...".
  const access_token = html.match(/__accessToken\s*=\s*"([^"]+)"/)?.[1] || null;
  const session = parseSessionMetadata(html);

  if (!access_token || !session.fb_dtsg || !session.lsd || !session.user_id) return null;
  return {
    access_token,
    fb_dtsg: session.fb_dtsg,
    fb_dtsg_ag: session.fb_dtsg_ag,
    lsd: session.lsd,
    user_id: session.user_id,
  };
}

async function fetchTokenBundle(): Promise<FbTokenBundle> {
  let html = await extFetch(ADS_MANAGER_URL);
  let bundle = parseTokens(html);

  // type B can return a JS redirect instead of the page; if tokens didn't parse,
  // follow the redirect once and re-parse (mirror the reference: key off the
  // parsed token, not a substring scan of the raw HTML).
  if (!bundle) {
    const redirect = html
      .match(/window\.location\.replace\("(.*?)"\)/)?.[1]
      ?.replace(/\\/g, '');
    if (redirect?.startsWith('https')) {
      html = await extFetch(redirect);
      bundle = parseTokens(html);
    }
  }

  if (!bundle) {
    throw new Error(
      'Không lấy được token Facebook. Hãy đăng nhập Facebook trên trình duyệt rồi thử lại.'
    );
  }
  return bundle;
}

/**
 * Get the FB token bundle, fetching once and caching in memory/storage. Throws a
 * clear Error if tokens can't be parsed (e.g. not logged in / FB markup changed).
 */
export async function getToken(forceRefresh = false): Promise<FbTokenBundle> {
  if (cached && !forceRefresh) return cached;
  if (inflight) return inflight;

  inflight = resolveToken(forceRefresh);
  try {
    cached = await inflight;
    return cached;
  } finally {
    inflight = null;
  }
}

async function resolveToken(forceRefresh: boolean): Promise<FbTokenBundle> {
  if (!forceRefresh) {
    const stored = await getStorageData();
    if (
      stored?.user_id &&
      stored.fb_dtsg &&
      stored.lsd &&
      stored.token_b?.access_token &&
      await readCachedToken('token_b', stored.user_id)
    ) {
      return {
        access_token: stored.token_b.access_token,
        fb_dtsg: stored.fb_dtsg,
        fb_dtsg_ag: stored.fb_dtsg_ag,
        lsd: stored.lsd,
        user_id: stored.user_id,
      };
    }
  }

  const bundle = await fetchTokenBundle();
  const storedToken = forceRefresh ? null : await readCachedToken('token_b', bundle.user_id);
  const resolved = storedToken ? { ...bundle, access_token: storedToken } : bundle;
  if (!storedToken) {
    await writeCachedToken('token_b', bundle.access_token, sessionFromBundle(bundle));
  }
  return resolved;
}

/** Drop the cached token (in-memory + persisted) so the next call refetches. */
export async function resetToken(): Promise<void> {
  cached = null;
  await invalidateStoredToken('token_b');
}
