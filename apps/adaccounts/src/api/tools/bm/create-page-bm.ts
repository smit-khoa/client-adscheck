import { graphql, getToken, isGraphError } from '../../fb';

// FB requires 1–3 categories for a new Page; 0 → error_code 1675012 (confirmed by a
// live reject). '2214' is a valid FB page-category id; if FB rejects it the nested
// error_message surfaces in the toast → test-live.
const DEFAULT_PAGE_CATEGORIES = ['2214'];

// Shape of the mutation's nested result. FB returns HTTP 200 even on failure: the
// real outcome lives in data.additional_profile_plus_create, NOT a top-level error.
// Success → additional_profile is non-null; failure → error_message is set.
interface CreatePageResponse {
  data?: {
    additional_profile_plus_create?: {
      error_message?: string | null;
      error_code?: number | null;
      additional_profile?: { id?: string } | null;
    };
  };
}

// Create one new Page (additional profile) inside a BM. GraphQL
// BizKitSettingsCreateAdditionalProfilePlusMutation. bio defaults empty (form only
// asks the name). Never throws.
export async function createPageInBm(
  bmId: string,
  pageName: string
): Promise<{ ok: boolean; message: string }> {
  const { user_id } = await getToken();
  const res = await graphql<CreatePageResponse>(
    {
      fb_api_req_friendly_name: 'BizKitSettingsCreateAdditionalProfilePlusMutation',
      doc_id: '24040062452298715',
      variables: JSON.stringify({
        input: {
          actor_id: user_id,
          client_mutation_id: '1',
          business_id: bmId,
          name: pageName,
          bio: '',
          categories: DEFAULT_PAGE_CATEGORIES,
          creation_source: 'meta_business_suite',
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${pageName}: ${res.message}` };

  // Inspect the nested result: FB reports mutation failures here (HTTP 200), so a
  // top-level success is not enough to call it created.
  const result = res.data?.additional_profile_plus_create;
  if (result?.error_message) return { ok: false, message: `${pageName}: ${result.error_message}` };
  if (!result?.additional_profile) {
    return { ok: false, message: `${pageName}: không xác nhận được Page đã tạo` };
  }
  return { ok: true, message: `Đã tạo Page ${pageName} trong BM ${bmId}` };
}
