import { getBmToken, resetBmToken } from './fb-bm-token';
import { getToken, resetToken } from './fb-token';
import { getAutoToken, resetAutoToken } from './fb-token-auto';
import { getLegacyGraphqlToken, resetLegacyGraphqlToken } from './fb-token-graphql';

export type TokenPurpose =
  | 'readGraph'
  | 'powerEditorAction'
  | 'businessManagerAction'
  | 'legacyGraphql'
  | 'sessionGraphql';

export type TokenSlot = 'token_b' | 'token_g' | 'token_i' | 'token_graphql' | 'session';

export interface TokenResolution {
  slot: TokenSlot;
  access_token?: string;
  fb_dtsg?: string;
  lsd?: string;
  user_id?: string;
}

export interface TokenPolicyOptions {
  readPreference?: 'current' | 'auto';
  autoFallbackSlots?: Array<'token_b' | 'token_g'>;
}

async function resolveReadGraph(options: TokenPolicyOptions): Promise<TokenResolution> {
  if (options.readPreference === 'auto') {
    try {
      return { slot: 'token_i', access_token: await getAutoToken() };
    } catch {
      if (options.autoFallbackSlots?.includes('token_g')) {
        try {
          return { slot: 'token_g', access_token: await getBmToken() };
        } catch {
          // Keep the fallback chain bounded and endpoint-owned.
        }
      }
      if (options.autoFallbackSlots?.includes('token_b')) {
        const bundle = await getToken();
        return { slot: 'token_b', access_token: bundle.access_token, user_id: bundle.user_id };
      }
      throw new Error('Không lấy được token AUTO Facebook. Endpoint chưa cho phép fallback.');
    }
  }

  const bundle = await getToken();
  return { slot: 'token_b', access_token: bundle.access_token, user_id: bundle.user_id };
}

export async function getTokenForPurpose(
  purpose: TokenPurpose,
  options: TokenPolicyOptions = {}
): Promise<TokenResolution> {
  if (purpose === 'readGraph') return resolveReadGraph(options);
  if (purpose === 'powerEditorAction') {
    const bundle = await getToken();
    return { slot: 'token_b', access_token: bundle.access_token, user_id: bundle.user_id };
  }
  if (purpose === 'businessManagerAction') {
    return { slot: 'token_g', access_token: await getBmToken() };
  }
  if (purpose === 'legacyGraphql') {
    return { slot: 'token_graphql', access_token: await getLegacyGraphqlToken() };
  }

  const bundle = await getToken();
  return {
    slot: 'session',
    fb_dtsg: bundle.fb_dtsg,
    lsd: bundle.lsd,
    user_id: bundle.user_id,
  };
}

export async function resetTokenForSlot(slot: TokenSlot): Promise<void> {
  if (slot === 'token_b' || slot === 'session') await resetToken();
  else if (slot === 'token_g') await resetBmToken();
  else if (slot === 'token_i') await resetAutoToken();
  else await resetLegacyGraphqlToken();
}
