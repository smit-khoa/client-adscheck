import { graphql, isGraphError } from '../../fb';

// List + delete Business Asset Groups (BAG) for one BM. Used by the manage-bag
// viewer dialog. All payloads from the captured doc, NOT verified live → test-live.
// Never throws — list returns { ok:false, message } on error; the dialog toasts it.

export interface BagRow {
  id: string;
  name: string;
  assetCount: number;
  // Index signature so the row is assignable to the dialog's generic ViewerRow
  // (Record<string, string | number>) — the Table renders rows by column field.
  [key: string]: string | number;
}

// Shape of ListContainerQuery's response. The exact path is a guess from the doc
// → test-live. We defensively read a few plausible shapes before giving up.
interface ListBagsResponse {
  data?: {
    business?: {
      business_asset_groups?: {
        nodes?: Array<{
          id?: string;
          name?: string;
          // asset count may live under different keys depending on FB's schema.
          owned_assets_count?: number;
          assets?: { count?: number };
        }>;
      };
    };
  };
}

// Load all BAGs of one BM. GraphQL ListContainerQuery on host business.
// test-live: confirm the response path + the asset-count field name.
export async function listBags(
  bmId: string
): Promise<{ ok: true; rows: BagRow[] } | { ok: false; message: string }> {
  const res = await graphql<ListBagsResponse>(
    {
      fb_api_req_friendly_name: 'ListContainerQuery',
      doc_id: '35119324844348151',
      variables: JSON.stringify({ business_id: bmId }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: res.message };

  const nodes = res.data?.business?.business_asset_groups?.nodes ?? [];
  const rows: BagRow[] = nodes
    .filter((n) => n.id)
    .map((n) => ({
      id: String(n.id),
      name: n.name ?? '(không tên)',
      assetCount: n.owned_assets_count ?? n.assets?.count ?? 0,
    }));
  return { ok: true, rows };
}

// Delete one BAG. GraphQL BizKitSettingsRemoveBusinessAssetGroupMutation on host
// business. test-live: input shape + success marker. Never throws.
export async function deleteBag(
  bmId: string,
  bagId: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BizKitSettingsRemoveBusinessAssetGroupMutation',
      doc_id: '24098009339804395',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          business_id: bmId,
          business_asset_group_id: bagId,
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${bagId}: ${res.message}` };
  return { ok: true, message: `Đã xóa nhóm ${bagId}` };
}
