import { graph, graphql, isGraphError, responseHasMarker } from '../../fb';

export type ClaimPageMode = 'meofb' | 'xmeta';

// Shape of the meofb REST response. FB returns HTTP 200; a real claim sets
// access_status to CONFIRMED (or echoes the page id / success flag). Anything
// else is treated as not-confirmed → fail (never fake a success).
interface ClaimPageRestResponse {
  access_status?: string;
  success?: boolean;
  id?: string;
}

// Claim (attach) one existing Page into one BM. `meofb` = REST POST on
// owned_pages; `xmeta` = internal GraphQL ClaimPageMutation. Payload from doc,
// not verified live → test-live. Never throws.
export async function claimPage(
  bmId: string,
  pageId: string,
  mode: ClaimPageMode
): Promise<{ ok: boolean; message: string }> {
  if (mode === 'meofb') return claimMeofb(bmId, pageId);
  return claimXmeta(bmId, pageId);
}

// meofb REST: POST /<bmId>/owned_pages with page_id. test-live: body field name
// (page_id) + success marker (access_status === 'CONFIRMED').
async function claimMeofb(
  bmId: string,
  pageId: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graph<ClaimPageRestResponse>(`/${bmId}/owned_pages`, {
    method: 'POST',
    body: { page_id: pageId }, // test-live: REST body field name
    version: 'v23.0',
  });
  if (isGraphError(res)) return { ok: false, message: `${pageId}: ${res.message}` };

  // test-live: confirm via access_status CONFIRMED, else success/id echo.
  const confirmed = res.access_status === 'CONFIRMED' || res.success === true || Boolean(res.id);
  if (!confirmed) {
    return { ok: false, message: `${pageId}: không xác nhận được Page đã nhét` };
  }
  return { ok: true, message: `Đã nhét Page ${pageId} vào BM ${bmId}` };
}

// xmeta GraphQL ClaimPageMutation on the business host. FB can return HTTP 200
// with a nested error, so inspect the nested result like create-page-bm.
async function claimXmeta(
  bmId: string,
  pageId: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql<{ data?: { bizkit_claim_page?: { error_message?: string | null } } }>(
    {
      fb_api_req_friendly_name: 'BizKitSettingsClaimPageMutation',
      doc_id: '25825324230422548',
      variables: JSON.stringify({
        // test-live: variables shape for ClaimPageMutation.
        input: { client_mutation_id: '1', business_id: bmId, page_id: pageId },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${pageId}: ${res.message}` };

  // test-live: nested error marker (FB returns 200 + nested error on failure).
  const nestedError = res.data?.bizkit_claim_page?.error_message;
  if (nestedError) return { ok: false, message: `${pageId}: ${nestedError}` };

  // Require positive evidence — a bare 200 with no error is NOT proof the page was
  // claimed (the nested field name is test-live; if it's wrong, error_message is
  // silently undefined). Confirm the claimed page id or a CONFIRMED/success marker
  // actually appears in the response before reporting success.
  const confirmed =
    responseHasMarker(res, pageId) ||
    responseHasMarker(res, 'CONFIRMED') ||
    responseHasMarker(res, 'page_claimed');
  if (!confirmed) {
    return { ok: false, message: `${pageId}: không xác nhận được Page đã nhét` };
  }
  return { ok: true, message: `Đã nhét Page ${pageId} vào BM ${bmId}` };
}
