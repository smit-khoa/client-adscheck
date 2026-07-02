import { graph } from '@/api/fb-graph';
import { isGraphError } from '@/api/types';
import { mapAdAccountPatch, type AdAccountNode } from '../utils/bm-row-mappers';
import type { BmRowPatch } from '../types/bm-data-loading.types';

interface AdAccountFetchOptions {
  bmAccount: boolean;
  share: boolean;
  limit: boolean;
}

interface AdAccountListResponse {
  data?: AdAccountNode[];
  paging?: { next?: string };
}

const ACCOUNT_FIELDS = 'account_id,account_status,adtrust_dsl,currency,amount_spent,name,created_time';

async function fetchConnection(path: string): Promise<AdAccountNode[]> {
  const rows: AdAccountNode[] = [];
  let after = '';
  for (let page = 0; page < 20; page += 1) {
    const params: Record<string, string | number | boolean> = {
      fields: ACCOUNT_FIELDS,
      limit: 1000,
    };
    if (after) params.after = after;
    const res = await graph<AdAccountListResponse>(path, { params, version: 'v25.0' });
    if (isGraphError(res)) throw new Error(res.message);
    rows.push(...(res.data ?? []));
    const next = res.paging?.next;
    if (!next) break;
    const parsed = new URL(next);
    after = parsed.searchParams.get('after') ?? '';
    if (!after) break;
  }
  return rows;
}

async function fetchWithEmptyRetry(path: string): Promise<AdAccountNode[]> {
  const first = await fetchConnection(path);
  if (first.length > 0) return first;
  await new Promise((resolve) => setTimeout(resolve, 300));
  return fetchConnection(path);
}

export async function fetchBmAdAccounts(
  bmId: string,
  options: AdAccountFetchOptions
): Promise<BmRowPatch> {
  const shouldFetchOwned = options.bmAccount || options.limit;
  const shouldFetchClient = options.share;

  const [owned, client] = await Promise.all([
    shouldFetchOwned ? fetchWithEmptyRetry(`/${bmId}/owned_ad_accounts`) : Promise.resolve([]),
    shouldFetchClient ? fetchWithEmptyRetry(`/${bmId}/client_ad_accounts`) : Promise.resolve([]),
  ]);

  return mapAdAccountPatch(bmId, owned, client, options);
}
