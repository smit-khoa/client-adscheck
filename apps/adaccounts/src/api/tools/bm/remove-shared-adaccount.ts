import { graph, graphql, isGraphError } from '../../fb';

export type RemoveShareMode = 'all' | 'die' | 'live' | 'id';

interface ClientAdAccount {
  id: string;
  account_status?: number;
}

// Strip an `act_` prefix so user-typed ids (act_123 or 123) match the edge ids.
function normId(id: string): string {
  return id.trim().replace(/^act_/, '');
}

// Remove shared (client) ad accounts from one BM. Lists client_ad_accounts, filters
// by mode, then RemoveAdAccountMutation per target. 1 call per BM (runner gives one
// job/BM). account_status===1 is ACTIVE ("live"); anything else is "die". Payload
// from doc, not verified live → test-live. Never throws.
export async function removeSharedAdAccount(
  bmId: string,
  mode: RemoveShareMode,
  ids: string[]
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List client ad accounts. fields=id,account_status required for die/live filter.
  const list = await graph<{ data?: ClientAdAccount[] }>(`/${bmId}/client_ad_accounts`, {
    params: { fields: 'id,account_status', limit: 500 },
    version: 'v14.0',
  });
  if (isGraphError(list)) return { ok: false, message: list.message };

  const accounts = list.data ?? [];
  const wanted = new Set(ids.map(normId));
  const targets = accounts.filter((a) => {
    if (mode === 'all') return true;
    if (mode === 'live') return a.account_status === 1;
    if (mode === 'die') return a.account_status !== 1;
    return wanted.has(normId(a.id)); // mode 'id'
  });

  if (targets.length === 0) {
    return mode === 'id'
      ? { ok: false, warn: true, message: 'Không tìm thấy TKQC khớp id đã nhập' }
      : { ok: true, message: 'Không có TK share để xóa' };
  }

  // 2) Remove each via RemoveAdAccountMutation. Payload shape from doc → test-live.
  let removed = 0;
  const errors: string[] = [];
  for (const a of targets) {
    const res = await graphql(
      {
        fb_api_req_friendly_name: 'RemoveAdAccountMutation',
        doc_id: '24277713691817857',
        variables: JSON.stringify({
          input: { client_mutation_id: '1', business_id: bmId, ad_account_id: a.id },
        }),
      },
      'business'
    );
    if (isGraphError(res)) errors.push(`${a.id}: ${res.message}`);
    else removed += 1;
  }

  const ok = errors.length === 0;
  return {
    ok,
    message: ok
      ? `Đã xóa ${removed}/${targets.length} TK share`
      : `Xóa ${removed}/${targets.length}; lỗi: ${errors.join(' | ')}`,
  };
}
