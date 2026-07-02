import { graphql, isGraphError, responseHasMarker } from '../../fb';

export interface BmLegalInfo {
  legalName: string;
  street: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
  website: string;
  taxId: string;
}

// Update one BM's legal/business profile. GraphQL UpdateBusinessDetails (host
// business). FB returns HTTP 200 even on failure with a nested error, so success
// requires a positive marker (the BM id echoed back) — absence → fail, not silent
// success. Payload + nested field names from doc, NOT verified live → test-live:
// country format (ISO-2?), region vs state, exact input shape. Never throws.
export async function updateBmLegal(
  bmId: string,
  info: BmLegalInfo
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BizKitSettingsUpdateBusinessDetailsMutation',
      doc_id: '10022067921177501',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          business_id: bmId,
          business_profile: {
            legal_name: info.legalName,
            address: {
              street1: info.street,
              city: info.city,
              region: info.state,
              postal_code: info.postal,
              country: info.country,
            },
            phone_number: info.phone,
            website_url: info.website,
            tax_id_number: info.taxId,
          },
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: res.message };
  // Positive marker: BM id present in response → applied. Otherwise treat as fail
  // (HTTP 200 + nested error path); test-live the real marker if this is too strict.
  if (responseHasMarker(res, bmId)) return { ok: true, message: `Đã cập nhật pháp lý BM ${bmId}` };
  return { ok: false, message: `BM ${bmId}: không xác nhận được cập nhật (test-live marker)` };
}
