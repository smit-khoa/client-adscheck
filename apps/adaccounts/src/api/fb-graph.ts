import { getTokenForPurpose, resetTokenForSlot, type TokenPolicyOptions, type TokenPurpose } from './fb-token-policy';
import { extFetch } from './smit-connect';
import { isGraphError, type ExtFetchOptions, type GraphResult } from './types';

// FB error codes that mean the token/session is stale — drop the cached token so
// the next call refetches. 190 = invalid OAuth access token.
const AUTH_ERROR_CODES = new Set([190, 102, 463, 467]);

function isAuthError(message: string, code?: number): boolean {
  if (code !== undefined && AUTH_ERROR_CODES.has(code)) return true;
  return /fb_dtsg|access token|session|login|đăng nhập/i.test(message);
}

// FB call helpers ported from Facebook.js: graph() for the public Graph REST API
// (auth via access_token) and graphql() for the internal GraphQL endpoint (auth
// via fb_dtsg + lsd, doc_id). Both go through the extension proxy.

// Encode a flat object as application/x-www-form-urlencoded (replaces qs.stringify).
function formEncode(obj: Record<string, string | number | boolean>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

interface GraphOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  body?: Record<string, string | number | boolean>;
  version?: string;
  tokenPurpose?: TokenPurpose;
  tokenPolicy?: TokenPolicyOptions;
}

/**
 * Call the public Graph REST API. `path` like `/act_123/...`; access_token +
 * standard format params are added automatically. Returns parsed JSON or a
 * normalized { error, message, code }. On an auth error it drops the cached
 * token and retries once with a fresh one.
 */
export async function graph<T = unknown>(
  path: string,
  options: GraphOptions = {}
): Promise<GraphResult<T>> {
  const first = await graphOnce<T>(path, options);
  if (isGraphError(first.result) && isAuthError(first.result.message, first.result.code)) {
    await resetTokenForSlot(first.slot);
    return (await graphOnce<T>(path, options)).result;
  }
  return first.result;
}

interface GraphOnceResult<T> {
  result: GraphResult<T>;
  slot: 'token_b' | 'token_g' | 'token_i' | 'token_graphql' | 'session';
}

async function graphOnce<T>(path: string, options: GraphOptions): Promise<GraphOnceResult<T>> {
  const {
    method = 'GET',
    params,
    body,
    version = 'v24.0',
    tokenPurpose = 'readGraph',
    tokenPolicy,
  } = options;
  const resolution = await getTokenForPurpose(tokenPurpose, tokenPolicy);
  const access_token = resolution.access_token;
  if (!access_token) return { result: { error: true, message: 'Token policy không trả access token' }, slot: resolution.slot };

  const url = path.startsWith('https')
    ? path
    : `https://graph.facebook.com/${version}${path}`;

  const extOptions: ExtFetchOptions = {
    method,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    params: {
      ...(params ?? {}),
      access_token,
      format: 'json',
      pretty: 0,
      suppress_http_code: 1,
      locale: 'en_US',
    },
  };
  if (body) extOptions.body = formEncode(body);

  const text = await extFetch(url, extOptions);
  try {
    const res = JSON.parse(text) as {
      error?: { message?: string; error_user_title?: string; error_user_msg?: string; code?: number };
    };
    if (res.error) {
      const e = res.error;
      // error_user_msg is the most specific (e.g. "You do not have permissions
      // to update the ad account."); fall back to title then the raw message.
      return {
        result: {
          error: true,
          message: e.error_user_msg || e.error_user_title || e.message || 'Graph error',
          code: e.code,
        },
        slot: resolution.slot,
      };
    }
    return { result: res as T, slot: resolution.slot };
  } catch {
    return { result: { error: true, message: 'Phản hồi Graph không hợp lệ' }, slot: resolution.slot };
  }
}

interface GraphqlBody {
  doc_id: string;
  variables?: string;
  fb_api_req_friendly_name?: string;
}

interface GraphqlOptions {
  tokenPurpose?: Extract<TokenPurpose, 'sessionGraphql' | 'legacyGraphql'>;
}

/**
 * Call the internal GraphQL endpoint. Adds __a, fb_dtsg, lsd automatically and
 * strips the `for (;;);` anti-JSON-hijack prefix. `host` selects the domain
 * (www | business | adsmanager). Returns parsed data or normalized error.
 */
export async function graphql<T = unknown>(
  body: GraphqlBody,
  host: 'www' | 'business' | 'adsmanager' = 'www',
  options: GraphqlOptions = {}
): Promise<GraphResult<T>> {
  const res = await graphqlOnce<T>(body, host, options);
  if (isGraphError(res) && isAuthError(res.message, res.code)) {
    await resetTokenForSlot(options.tokenPurpose === 'legacyGraphql' ? 'token_graphql' : 'session');
    return graphqlOnce<T>(body, host, options);
  }
  return res;
}

async function graphqlOnce<T>(
  body: GraphqlBody,
  host: 'www' | 'business' | 'adsmanager',
  options: GraphqlOptions
): Promise<GraphResult<T>> {
  const resolution = await getTokenForPurpose(options.tokenPurpose ?? 'sessionGraphql');
  const { fb_dtsg, lsd, access_token } = resolution;
  if (options.tokenPurpose !== 'legacyGraphql' && (!fb_dtsg || !lsd)) {
    return { error: true, message: 'Token policy không trả session GraphQL' };
  }

  const payload: Record<string, string | number | boolean> = {
    __a: 1,
    locale: 'en_US',
    ...body,
  };
  if (options.tokenPurpose === 'legacyGraphql') {
    if (!access_token) return { error: true, message: 'Token policy không trả legacy GraphQL token' };
    payload.access_token = access_token;
  } else {
    payload.fb_dtsg = fb_dtsg!;
    payload.lsd = lsd!;
  }

  const text = await extFetch(`https://${host}.facebook.com/api/graphql/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-asbd-id': '1' },
    body: formEncode(payload),
  });

  const raw = text.startsWith('for (;;);') ? text.slice(9) : text;
  // FB GraphQL with @defer returns multiple JSON objects separated by newlines.
  // Take only the first chunk if multiple exist to avoid JSON.parse failing
  // and triggering unnecessary retries.
  const json = raw.includes('\n') ? (raw.split('\n')[0] ?? '').trim() : raw;

  try {
    const data = JSON.parse(json) as {
      error?: unknown;
      errorSummary?: string;
      errorDescription?: string;
      // FB returns GraphQL-level failures as an errors[] array (not data.error).
      errors?: Array<{ message?: string; description?: string; description_raw?: string }>;
    };
    if (data.errors?.length) {
      const e = data.errors[0];
      return { error: true, message: e?.description_raw || e?.description || e?.message || 'GraphQL error' };
    }
    if (data.error) {
      return {
        error: true,
        message: `${String(data.error)} | ${data.errorDescription || data.errorSummary || 'Unknown'}`,
      };
    }
    return data as T;
  } catch {
    return { error: true, message: 'Phản hồi GraphQL không hợp lệ' };
  }
}

/** True when a parsed GraphQL/Graph response text contains the given marker. */
export function responseHasMarker(value: unknown, marker: string): boolean {
  try {
    return JSON.stringify(value).includes(marker);
  } catch {
    return false;
  }
}
