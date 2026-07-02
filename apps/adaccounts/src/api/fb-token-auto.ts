import { extFetch } from './smit-connect';
import {
  getStorageData,
  invalidateStoredToken,
  parseSessionMetadata,
  readCachedToken,
  writeCachedToken,
  type SessionMetadata,
} from './fb-token-cache';

const TOKEN_I_URL = 'https://www.facebook.com/ajax/bootloader-endpoint/?modules=AdsCanvasComposerDialog.react&__a=1';

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

function parseTokenI(text: string): string | null {
  return text.match(/"access_token"\s*:\s*"([^"]+)"/)?.[1]
    || text.match(/access_token[\\"']*\s*[:=]\s*[\\"']([^\\"']+)/)?.[1]
    || null;
}

function hasSessionMetadata(session: SessionMetadata): boolean {
  return Boolean(session.user_id || session.fb_dtsg || session.fb_dtsg_ag || session.lsd);
}

async function resolveSessionMetadata(text: string): Promise<SessionMetadata> {
  const parsed = parseSessionMetadata(text);
  if (hasSessionMetadata(parsed)) return parsed;

  const stored = await getStorageData();
  if (!stored) return {};
  return {
    user_id: stored.user_id,
    fb_dtsg: stored.fb_dtsg,
    fb_dtsg_ag: stored.fb_dtsg_ag,
    lsd: stored.lsd,
    user_name: stored.user_name,
  };
}

async function fetchTokenI(): Promise<string> {
  const text = await extFetch(TOKEN_I_URL);
  const token = parseTokenI(text);
  if (!token) {
    throw new Error('Không lấy được token AUTO Facebook. Hãy đăng nhập Facebook rồi thử lại.');
  }
  await writeCachedToken('token_i', token, await resolveSessionMetadata(text));
  return token;
}

export async function getAutoToken(forceRefresh = false): Promise<string> {
  if (cachedToken && !forceRefresh) return cachedToken;
  if (inflight) return inflight;

  inflight = resolveAutoToken(forceRefresh);
  try {
    cachedToken = await inflight;
    return cachedToken;
  } finally {
    inflight = null;
  }
}

async function resolveAutoToken(forceRefresh: boolean): Promise<string> {
  if (!forceRefresh) {
    const stored = await readCachedToken('token_i');
    if (stored) return stored;
  }
  return fetchTokenI();
}

export async function resetAutoToken(): Promise<void> {
  cachedToken = null;
  await invalidateStoredToken('token_i');
}
