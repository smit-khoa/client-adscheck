import { graphql, getToken, isGraphError, responseHasMarker } from '../../fb';

// Add one owned domain to a BM. GraphQL BizKitSettingsAddNewDomainMutation.
// actor_id from getToken() (BizKit mutations need it — same as create-page-bm,
// doc omits it). Payload from doc, not verified live → test-live. Never throws.
export async function addBmDomain(
  bmId: string,
  domain: string
): Promise<{ ok: boolean; message: string }> {
  const { user_id } = await getToken();
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BizKitSettingsAddNewDomainMutation',
      doc_id: '31518389857776250',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          actor_id: user_id,
          business_id: bmId,
          owned_domain_name: domain,
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${domain}: ${res.message}` };
  // FB returns HTTP 200 even on nested failure → require a positive marker
  // (the domain name echoed back) before calling it added. Field name nested in
  // the result is a guess → test-live; the marker guards against false success.
  if (!responseHasMarker(res, domain)) {
    return { ok: false, message: `${domain}: không xác nhận được miền đã thêm` };
  }
  return { ok: true, message: `Đã thêm miền ${domain} vào BM ${bmId}` };
}
