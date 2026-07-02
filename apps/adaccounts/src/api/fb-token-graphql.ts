import { extFetch } from './smit-connect';
import {
  getStorageData,
  invalidateStoredToken,
  parseSessionMetadata,
  readCachedToken,
  writeCachedToken,
  type SessionMetadata,
} from './fb-token-cache';

const TOKEN_GRAPHQL_URL = 'https://www.facebook.com/ajax/bootloader-endpoint/?modules=ReactComposerStatusEagerAttachment.react&__a=1';

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

function parseGraphqlToken(text: string): string | null {
  const oldAccessToken = text.match(/"accessToken"\s*:\s*"(EAAHULp[^"]+)"/)?.[1];
  if (oldAccessToken) return oldAccessToken;

  const prefixedSnakeCase = text.match(/"access_token"\s*:\s*"(EAAHULp[^"]+)"/)?.[1];
  if (prefixedSnakeCase) return prefixedSnakeCase;

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

async function fetchGraphqlToken(): Promise<string> {
  const text = await extFetch(TOKEN_GRAPHQL_URL);
  const token = parseGraphqlToken(text);
  if (!token) {
    throw new Error('Không lấy được token GraphQL legacy. Endpoint Facebook có thể đã đổi.');
  }
  await writeCachedToken('token_graphql', token, await resolveSessionMetadata(text));
  return token;
}

export async function getLegacyGraphqlToken(forceRefresh = false): Promise<string> {
  if (cachedToken && !forceRefresh) return cachedToken;
  if (inflight) return inflight;

  inflight = resolveGraphqlToken(forceRefresh);
  try {
    cachedToken = await inflight;
    return cachedToken;
  } finally {
    inflight = null;
  }
}

async function resolveGraphqlToken(forceRefresh: boolean): Promise<string> {
  if (!forceRefresh) {
    const stored = await readCachedToken('token_graphql');
    if (stored) return stored;
  }
  return fetchGraphqlToken();
}

export async function resetLegacyGraphqlToken(): Promise<void> {
  cachedToken = null;
  await invalidateStoredToken('token_graphql');
}
