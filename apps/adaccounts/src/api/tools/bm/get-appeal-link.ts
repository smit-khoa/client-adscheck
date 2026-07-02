import { extFetch, getToken } from '../../fb';

export interface AppealLinkResult {
  bmId: string;
  ok: boolean;
  link?: string;
  status?: string;
  message: string;
}

// UFAC (Unified Friction Appeal Container) page for a BM. entity_type=3 = business.
// Used both as the API 2 endpoint and as the fallback link when the response can't
// be parsed (it is the appeal page itself, fully derivable from the BM id).
function buildAppealLink(bmId: string): string {
  return `https://business.facebook.com/accountquality/ufac/?entity_id=${bmId}&entity_type=3`;
}

interface AssetOwnerView {
  data?: {
    assetOwnerData?: {
      advertising_restriction_info?: {
        is_restricted?: boolean;
        restriction_type?: string;
        status?: string;
      } | null;
      business_integrity_status_info?: {
        appeals_remaining?: number;
      } | null;
    } | null;
  };
  errors?: Array<{ summary?: string; message?: string }>;
}

// API 1: AccountQualityHubAssetOwnerViewQuery — tells us whether the BM is restricted
// (we only appeal restricted BMs) and gives the status text. Direct extFetch (not the
// shared graphql() helper) to send exactly the fields FB's web client sends.
async function fetchRestrictionInfo(bmId: string, fb_dtsg: string, user_id: string) {
  const body = new URLSearchParams({
    __user: user_id,
    __a: '1',
    dpr: '1',
    fb_dtsg,
    server_timestamps: 'true',
    doc_id: '24196151083363204',
    variables: JSON.stringify({ assetOwnerId: bmId }),
  }).toString();

  const text = await extFetch('https://business.facebook.com/api/graphql/', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const raw = text.startsWith('for (;;);') ? text.slice(9) : text;
  return JSON.parse(raw) as AssetOwnerView;
}

// Pull the appeal link out of the UFAC (API 2) response. SHAPE IS test-live — we
// don't yet have a captured response, so we scan for any http(s) URL that points at
// the ufac/appeal flow. Returns null when nothing matches so the caller can fall
// back to the derived URL.
function parseAppealLink(text: string): string | null {
  // Unescape FB's `\/` JSON-escaped slashes before matching.
  const unescaped = text.replace(/\\\//g, '/');
  const m = unescaped.match(/https?:\/\/[^\s"'\\]*(?:ufac|appeal|checkpoint)[^\s"'\\]*/i);
  return m?.[0] ?? null;
}

// API 2: POST the UFAC endpoint to obtain the appeal link for a restricted BM.
// SHAPE IS test-live (no captured response yet) — the form fields below mirror the
// web client; the link is parsed defensively and falls back to the derived URL.
async function fetchAppealLinkFromUfac(
  bmId: string,
  fb_dtsg: string,
  lsd: string,
  user_id: string
): Promise<string> {
  const url = `https://business.facebook.com/accountquality/ufac/?entity_id=${bmId}&entity_type=3`;
  const body = new URLSearchParams({
    __user: user_id,
    __a: '1',
    dpr: '1',
    fb_dtsg,
    lsd,
    __bid: bmId,
  }).toString();

  const text = await extFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  // Parse fail → fallback to the derived UFAC URL (chosen over erroring out so the
  // button always yields a usable link until the response shape is verified live).
  return parseAppealLink(text) ?? buildAppealLink(bmId);
}

// Get the appeal status + link for one BM. Two steps:
//   1) API 1 — restriction state; skip non-restricted BMs (ok:false "not restricted").
//   2) API 2 — UFAC endpoint to fetch the appeal link (fallback: derived URL).
// Never throws: extFetch rejection / parse failure → ok:false with a clear message,
// except the API-2 link parse which intentionally falls back to a derived URL.
export async function getAppealLink(bmId: string): Promise<AppealLinkResult> {
  let view: AssetOwnerView;
  let fb_dtsg: string;
  let lsd: string;
  let user_id: string;
  try {
    ({ fb_dtsg, lsd, user_id } = await getToken());
    view = await fetchRestrictionInfo(bmId, fb_dtsg, user_id);
  } catch (err) {
    return { bmId, ok: false, message: err instanceof Error ? err.message : String(err) };
  }

  if (view.errors?.length) {
    const e = view.errors[0];
    return { bmId, ok: false, message: e?.summary || e?.message || 'GraphQL error' };
  }

  const info = view.data?.assetOwnerData?.advertising_restriction_info;
  if (!info?.is_restricted) {
    return { bmId, ok: false, message: 'Không bị hạn chế' };
  }

  const appeals = view.data?.assetOwnerData?.business_integrity_status_info?.appeals_remaining;
  const statusParts = [info.restriction_type, info.status].filter(Boolean) as string[];
  if (typeof appeals === 'number') statusParts.push(`còn ${appeals} lần kháng`);

  let link: string;
  try {
    link = await fetchAppealLinkFromUfac(bmId, fb_dtsg, lsd, user_id);
  } catch {
    // API 2 unreachable → still hand back the derived URL rather than fail.
    link = buildAppealLink(bmId);
  }

  return {
    bmId,
    ok: true,
    link,
    status: statusParts.join(' · ') || undefined,
    message: 'OK',
  };
}
