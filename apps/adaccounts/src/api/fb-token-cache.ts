import { extStorageGet, extStorageSet } from './smit-connect';
import type { FbTokenBundle } from './types';

// Persistent token cache in the SMIT Connect extension storage. The prototype used
// AES obfuscation for this bundle; this port stores JSON directly to avoid adding a
// new app dependency during the migration. The data still lives in extension
// storage, not page localStorage, and every token keeps its own TTL.

const STORAGE_KEY = 'adscheck_data';
const TTL_MS = 21600000; // 6h, same as adscheck

export type TokenSlot = 'token_b' | 'token_g' | 'token_i' | 'token_graphql';

// One stored bundle. Each token carries the timestamp it was fetched at so we
// can expire it independently (mirrors adscheck token_b.date / token_g.date).
export interface CachedToken {
  access_token: string;
  date: number;
}

export interface SessionMetadata {
  user_id?: string;
  fb_dtsg?: string;
  fb_dtsg_ag?: string;
  lsd?: string;
  user_name?: string;
}

export interface StoredData extends SessionMetadata {
  // token_b = POWER_EDITOR, token_g = BUSINESS_MANAGER (adscheck naming).
  token_b?: CachedToken;
  token_g?: CachedToken;
  token_i?: CachedToken;
  token_graphql?: CachedToken;
}

/** Read the stored bundle from the extension. null when absent/unreadable. */
export async function getStorageData(): Promise<StoredData | null> {
  const raw = await extStorageGet<string>(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredData;
  } catch {
    return null;
  }
}

/** Merge `patch` into the stored bundle and write it back (best-effort). */
export async function updateStorageData(patch: Partial<StoredData>): Promise<void> {
  const current = (await getStorageData()) ?? {};
  const merged = { ...current, ...patch };
  await extStorageSet({ [STORAGE_KEY]: JSON.stringify(merged) });
}

/** True when a cached token exists and is within the 6h TTL. */
export function isTokenFresh(token: CachedToken | undefined, now: number): boolean {
  return Boolean(token?.access_token && token.date && now - token.date < TTL_MS);
}

export function parseSessionMetadata(text: string): SessionMetadata {
  const dtsg = text.match(
    /"DTSGInitData".*?"token":"(.*?)","async_get_token":"(.*?)"/
  );
  const user_id =
    text.match(/"ACCOUNT_ID":"(\d+)"/)?.[1] ||
    text.match(/"USER_ID":"(\d+)"/)?.[1];
  const fb_dtsg = dtsg?.[1];
  const fb_dtsg_ag = dtsg?.[2];
  const lsd = text.match(/"LSD"(.*?)"token":"(.*?)"}/)?.[2];

  return {
    ...(user_id ? { user_id } : {}),
    ...(fb_dtsg ? { fb_dtsg } : {}),
    ...(fb_dtsg_ag ? { fb_dtsg_ag } : {}),
    ...(lsd ? { lsd } : {}),
  };
}

export function sessionFromBundle(bundle: FbTokenBundle): SessionMetadata {
  return {
    user_id: bundle.user_id,
    fb_dtsg: bundle.fb_dtsg,
    fb_dtsg_ag: bundle.fb_dtsg_ag,
    lsd: bundle.lsd,
  };
}

export async function readCachedToken(
  slot: TokenSlot,
  expectedUserId?: string
): Promise<string | null> {
  const stored = await getStorageData();
  if (!stored || !isTokenFresh(stored[slot], Date.now())) return null;
  if (expectedUserId && stored.user_id && stored.user_id !== expectedUserId) return null;
  return stored[slot]!.access_token;
}

export async function writeCachedToken(
  slot: TokenSlot,
  token: string,
  session: SessionMetadata = {}
): Promise<void> {
  await updateStorageData({
    ...session,
    [slot]: { access_token: token, date: Date.now() },
  });
}

/** Expire one stored token (used on auth error) by zeroing its date. */
export async function invalidateStoredToken(which: TokenSlot): Promise<void> {
  const current = await getStorageData();
  if (!current?.[which]) return;
  await updateStorageData({ [which]: { access_token: '', date: 0 } });
}
