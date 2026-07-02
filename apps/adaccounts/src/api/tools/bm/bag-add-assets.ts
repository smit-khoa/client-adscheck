import { graphql, isGraphError } from '../../fb';

// Add assets to an existing Business Asset Group (BAG). GraphQL
// BizKitSettingsBusinessAssetGroupAddAssetsMutation on host business. Payload
// from the captured doc, NOT verified live → test-live. Never throws.

// UI preset -> FB asset_type enum. test-live: confirm the exact enum strings FB
// expects for each asset class (AD_ACCOUNT/PAGE/PIXEL are the documented guesses).
export type BagAssetType = 'ad-account' | 'page' | 'pixel';

const ASSET_TYPE_ENUM: Record<BagAssetType, string> = {
  'ad-account': 'AD_ACCOUNT',
  page: 'PAGE',
  pixel: 'PIXEL',
};

// Add all given asset ids to one BAG in a single call. If FB rejects the batched
// array, the fallback is to split per-asset (test-live note); kept as one call
// for now (KISS). Never throws.
export async function bagAddAssets(
  bmId: string,
  bagId: string,
  assetType: BagAssetType,
  assetIds: string[]
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BizKitSettingsBusinessAssetGroupAddAssetsMutation',
      doc_id: '26912332965057029',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          business_id: bmId,
          business_asset_group_id: bagId,
          asset_type: ASSET_TYPE_ENUM[assetType],
          asset_ids: assetIds,
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${bagId}: ${res.message}` };
  return {
    ok: true,
    message: `Đã thêm ${assetIds.length} tài sản vào nhóm ${bagId} (BM ${bmId})`,
  };
}
