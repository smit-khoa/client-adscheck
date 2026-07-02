import { graph, graphql, isGraphError } from '../../fb';

interface IgAccount {
  id: string;
  username?: string;
}

// Remove every Instagram account from one BM. Lists instagram_accounts, then for
// each tries 3 APIs in order (stop at first success): GraphQL BUSINESS_ASSETS tab
// → GraphQL INSTAGRAM_ACCOUNT tab → REST DELETE. 1 job/BM. Payload from doc, NOT
// verified live → test-live (list endpoint is a guess; doc has no explicit list).
// Never throws.
async function removeOneIg(bmId: string, igId: string): Promise<{ ok: boolean; message: string }> {
  // API1: GraphQL tab BUSINESS_ASSETS.
  const a1 = await graphql(
    {
      fb_api_req_friendly_name: 'RemoveInstagramAccountMutation',
      doc_id: '9416010698507836',
      variables: JSON.stringify({
        input: { client_mutation_id: '1', business_id: bmId, instagram_account_id: igId },
        // test-live: tab/source field name + values.
        surface: 'BUSINESS_ASSETS',
      }),
    },
    'business'
  );
  if (!isGraphError(a1)) return { ok: true, message: igId };

  // API2: cùng doc_id, tab INSTAGRAM_ACCOUNT.
  const a2 = await graphql(
    {
      fb_api_req_friendly_name: 'RemoveInstagramAccountMutation',
      doc_id: '9416010698507836',
      variables: JSON.stringify({
        input: { client_mutation_id: '1', business_id: bmId, instagram_account_id: igId },
        surface: 'INSTAGRAM_ACCOUNT',
      }),
    },
    'business'
  );
  if (!isGraphError(a2)) return { ok: true, message: igId };

  // API3: REST DELETE.
  const a3 = await graph(`/${bmId}/instagram_accounts`, {
    method: 'DELETE',
    body: { instagram_account: igId },
    version: 'v17.0',
  });
  if (!isGraphError(a3)) return { ok: true, message: igId };

  return { ok: false, message: `${igId}: ${a3.message}` };
}

export async function removeIgAccount(
  bmId: string
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List IG accounts. test-live: edge name (instagram_accounts?) + response shape.
  const list = await graph<{ data?: IgAccount[] }>(`/${bmId}/instagram_accounts`, {
    params: { fields: 'id,username', limit: 500 },
    version: 'v17.0',
  });
  if (isGraphError(list)) return { ok: false, message: list.message };

  const accounts = list.data ?? [];
  if (accounts.length === 0) return { ok: true, message: `BM ${bmId}: không có TK IG` };

  // 2) Remove each (3-API fallback).
  let removed = 0;
  const errors: string[] = [];
  for (const ig of accounts) {
    const res = await removeOneIg(bmId, ig.id);
    if (res.ok) removed += 1;
    else errors.push(res.message);
  }

  const ok = errors.length === 0;
  return {
    ok,
    message: ok
      ? `Đã xóa ${removed}/${accounts.length} TK IG`
      : `Xóa ${removed}/${accounts.length}; lỗi: ${errors.join(' | ')}`,
  };
}
