import { graphql, isGraphError } from '../../fb';

// Ad-account permission task IDs (advertise/manage). Doc lists permitted_roles
// without concrete values → placeholder, must be confirmed on a live capture.
const AD_PERMISSION_ROLES = ['ADVERTISE', 'ANALYZE']; // test-live: real role/task IDs

// Request ad-account access for one BM on one ad account it doesn't own.
// GraphQL BizKitSettingsRequestAdAccountAccessMutation. Payload from doc, not
// verified live → test-live. Never throws.
export async function requestAdAccountAccess(
  bmId: string,
  adId: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BizKitSettingsRequestAdAccountAccessMutation',
      doc_id: '23962130140039997',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          ad_account_id: adId,
          requesting_business_id: bmId,
          permitted_roles: AD_PERMISSION_ROLES,
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${adId}: ${res.message}` };
  return { ok: true, message: `Đã gửi yêu cầu quyền QC cho TKQC ${adId} (BM ${bmId})` };
}
