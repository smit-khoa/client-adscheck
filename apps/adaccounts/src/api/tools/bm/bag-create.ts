import { graphql, isGraphError } from '../../fb';

// Create one Business Asset Group (BAG) inside a BM. GraphQL
// BizKitSettingsCreateBAGMutation on host business. Payload shape from the
// captured doc, NOT verified live → test-live. Never throws.
export async function createBag(
  bmId: string,
  name: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BizKitSettingsCreateBAGMutation',
      doc_id: '9681139855337189',
      variables: JSON.stringify({
        input: { client_mutation_id: '1', business_id: bmId, name },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${name}: ${res.message}` };
  return { ok: true, message: `Đã tạo nhóm tài sản "${name}" trong BM ${bmId}` };
}
