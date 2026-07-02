import { graphql, isGraphError } from '../../fb';

// Assign business assets to one user (ADD only). GraphQL
// useBulkAssignAssetsToUsersMutation on host business. Remove is NOT implemented
// this round — the Xmeta remove endpoint isn't exposed in the doc yet (YAGNI).
//
// The whole payload shape is INFERRED from the doc, NOT verified live → test-live
// heavily. Never throws so the real FB reject message reaches the toast.

export type AssignAssetType = 'ad-account' | 'page' | 'pixel';

// UI preset -> FB asset_type enum. test-live: confirm enum strings.
const ASSET_TYPE_ENUM: Record<AssignAssetType, string> = {
  'ad-account': 'AD_ACCOUNT',
  page: 'PAGE',
  pixel: 'PIXEL',
};

// UI role preset -> FB permission task ids, keyed by asset type. These are
// placeholders from the doc — the REAL task ids per asset class must be confirmed
// on a live capture (test-live). 'manage' = full control, 'analyze' = read-only.
export type AssignRole = 'manage' | 'analyze';

const TASK_IDS: Record<AssignAssetType, Record<AssignRole, string[]>> = {
  'ad-account': {
    manage: ['MANAGE'], // test-live: real ad-account manage task id(s)
    analyze: ['ANALYZE'], // test-live: real ad-account analyze task id(s)
  },
  page: {
    manage: ['MANAGE'], // test-live: real page manage task id(s)
    analyze: ['ANALYZE'], // test-live: real page analyze task id(s)
  },
  pixel: {
    manage: ['MANAGE'], // test-live: real pixel manage task id(s)
    analyze: ['ANALYZE'], // test-live: real pixel analyze task id(s)
  },
};

// Add all assets to one user in a single call. If FB rejects the batched array,
// the test-live fallback is to split per-asset. Never throws.
export async function assignAssetsToUser(
  bmId: string,
  userId: string,
  assetType: AssignAssetType,
  assetIds: string[],
  role: AssignRole
): Promise<{ ok: boolean; message: string }> {
  const tasks = TASK_IDS[assetType][role];
  const enumType = ASSET_TYPE_ENUM[assetType];
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'useBulkAssignAssetsToUsersMutation',
      doc_id: '26664271203212146',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          business_id: bmId,
          user_id: userId,
          assets: assetIds.map((asset_id) => ({
            asset_id,
            asset_type: enumType,
            tasks,
          })),
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${userId}: ${res.message}` };
  return {
    ok: true,
    message: `Đã thêm ${assetIds.length} tài sản cho user ${userId} (BM ${bmId})`,
  };
}
