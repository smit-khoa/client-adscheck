import { graphql, extFetch, getToken, isGraphError } from '../../fb';

export type ClaimMode = 'meofb' | 'xmeta-single' | 'xmeta-batch';

function formEncode(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// meofb: REST form add/connections on the business host (extFetch, not graph()).
async function claimMeofb(bmId: string, adId: string): Promise<{ ok: boolean; message: string }> {
  const { fb_dtsg, lsd, user_id } = await getToken();
  const url =
    `https://business.facebook.com/business/objects/add/connections/` +
    `?business_id=${bmId}&from_id=${bmId}&from_asset_type=brand&to_id=${adId}&to_asset_type=ad-account`;
  let text: string;
  try {
    text = await extFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({ __user: user_id, fb_dtsg, lsd }),
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  const hasError = /"error"|error_user_msg|"errorSummary"/.test(text);
  return hasError
    ? { ok: false, message: `Nhét TKQC ${adId} vào BM ${bmId} thất bại` }
    : { ok: true, message: `Đã nhét TKQC ${adId} vào BM ${bmId}` };
}

// xmeta-single: GraphQL ClaimAdAccountMutation, one ad account per call.
// variables shape from doc, not verified live → test-live.
async function claimXmetaSingle(
  bmId: string,
  adId: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'ClaimAdAccountMutation',
      doc_id: '26359038520354737',
      variables: JSON.stringify({
        input: { client_mutation_id: '1', business_id: bmId, ad_account_id: adId },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${adId}: ${res.message}` };
  return { ok: true, message: `Đã nhét TKQC ${adId} vào BM ${bmId}` };
}

// xmeta-batch: adsmanager-graph batch (NOT /api/graphql/ → extFetch raw). One call
// claims many ad accounts into one BM. Payload from doc, heavily test-live.
async function claimXmetaBatch(
  bmId: string,
  adIds: string[]
): Promise<{ ok: boolean; message: string }> {
  const { fb_dtsg, lsd, access_token, user_id } = await getToken();
  const batch = adIds.map((adId) => ({
    method: 'POST',
    relative_url: `${adId}/?doc_id=24055921684015007`, // shape per doc — test-live
  }));
  let text: string;
  try {
    text = await extFetch('https://adsmanager-graph.facebook.com/v17.0', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({
        __user: user_id,
        fb_dtsg,
        lsd,
        access_token,
        batch: JSON.stringify(batch),
      }),
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  const hasError = /"error"|error_user_msg|"errorSummary"/.test(text);
  return hasError
    ? { ok: false, message: `Batch nhét ${adIds.length} TKQC vào BM ${bmId} có lỗi` }
    : { ok: true, message: `Đã batch nhét ${adIds.length} TKQC vào BM ${bmId}` };
}

// Per-account claim: meofb form vs xmeta-single GraphQL. xmeta-batch is a
// different job shape (1 call / many accounts) handled by claimAdAccountBatch, so
// it's excluded here — the signature only advertises what this function does.
export async function claimAdAccount(
  bmId: string,
  adId: string,
  mode: Exclude<ClaimMode, 'xmeta-batch'>
): Promise<{ ok: boolean; message: string }> {
  if (mode === 'meofb') return claimMeofb(bmId, adId);
  return claimXmetaSingle(bmId, adId);
}

export async function claimAdAccountBatch(
  bmId: string,
  adIds: string[]
): Promise<{ ok: boolean; message: string }> {
  return claimXmetaBatch(bmId, adIds);
}
