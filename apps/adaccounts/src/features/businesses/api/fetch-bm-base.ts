import { graph } from '@/api/fb-graph';
import { isGraphError, type GraphResult } from '@/api/types';
import { mapBusinessToRow } from '../utils/bm-row-mappers';
import type { BmBaseFetchConfig, BmRow } from '../types/bm-data-loading.types';

interface BusinessConnectionResponse {
  businesses?: {
    data?: BusinessNode[];
    paging?: { next?: string };
  };
}

interface BusinessListResponse {
  data?: BusinessNode[];
  paging?: { next?: string };
}

interface BusinessNode {
  id?: string;
  name?: string;
  is_disabled_for_integrity_reasons?: boolean;
  sharing_eligibility_status?: string;
  created_time?: string;
  verification_status?: string;
  permitted_roles?: string[];
  agencies?: { data?: Array<{ id?: string; name?: string }> };
  partners?: { data?: Array<{ id?: string; name?: string }> };
  owned_apps?: { data?: Array<{ id?: string; name?: string }> };
}

const BASE_FIELDS = [
  'id',
  'name',
  'is_disabled_for_integrity_reasons',
  'sharing_eligibility_status',
  'created_time',
  'verification_status',
  'permitted_roles',
  'owned_apps.limit(50){id,name}',
];

function buildBaseFields(includePartner: boolean): string {
  return includePartner
    ? [...BASE_FIELDS, 'agencies.limit(100){id,name}', 'partners.limit(50){id,name}'].join(',')
    : BASE_FIELDS.join(',');
}

function assertGraphData<T>(value: GraphResult<T>): T {
  if (isGraphError(value)) throw new Error(value.message);
  return value;
}

export async function fetchBmBaseRows(config: BmBaseFetchConfig): Promise<BmRow[]> {
  const fields = buildBaseFields(config.includePartner);
  if (config.source === 'byId') {
    const rows = await Promise.all(
      config.ids.map(async (id) => {
        const res = assertGraphData(await graph<BusinessNode>(`/${id}`, { params: { fields }, version: 'v25.0' }));
        return mapBusinessToRow(res);
      })
    );
    return rows.filter((row: BmRow) => row.bmId.length > 0);
  }

  const rows: BmRow[] = [];
  let after = '';
  for (let page = 0; page < 20; page += 1) {
    const params: Record<string, string | number | boolean> = {
      fields: `businesses.limit(${config.pageSize}){${fields}}`,
    };
    if (after) params.after = after;
    const res = assertGraphData(await graph<BusinessConnectionResponse>('/me', { params, version: 'v25.0' }));
    const data = res.businesses?.data ?? [];
    rows.push(...data.map(mapBusinessToRow).filter((row: BmRow) => row.bmId.length > 0));
    const next = res.businesses?.paging?.next;
    if (!next) break;
    const parsed = new URL(next);
    after = parsed.searchParams.get('after') ?? '';
    if (!after) break;
  }

  if (rows.length > 0) return rows;

  const fallback = assertGraphData(
    await graph<BusinessListResponse>('/me/businesses', {
      params: { fields, limit: config.pageSize },
      version: 'v25.0',
    })
  );
  return (fallback.data ?? []).map(mapBusinessToRow).filter((row: BmRow) => row.bmId.length > 0);
}
