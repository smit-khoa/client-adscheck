import { graph } from '../../../api/fb-graph';
import { isGraphError, type GraphResult } from '../../../api/types';
import type { BusinessManagerRow, LoadBusinessManagersConfig } from '../types/account-list.types';
import { parseIdsText } from './adaccount-mappers';

interface BusinessManagerPage {
  businesses?: {
    data?: BusinessManagerRow[];
    paging?: { next?: string };
  };
}

interface BusinessUserPage {
  data?: Array<{ role?: string; business?: { id?: string } }>;
  paging?: { next?: string };
}

const BM_FIELDS = 'id,name,is_disabled_for_integrity_reasons,sharing_eligibility_status,created_time,verification_status,permitted_roles,agencies.limit(100){id,name}';

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

async function fetchBusinessRoles(): Promise<Map<string, string[]>> {
  const roles = new Map<string, string[]>();
  let next: string | null = '/me/business_users';

  while (next) {
    const res: GraphResult<BusinessUserPage> = await graph<BusinessUserPage>(
      next,
      next.startsWith('https') ? {} : { params: { fields: 'role,business{id}', limit: 200 }, version: 'v25.0' }
    );
    if (isGraphError(res)) return roles;
    for (const item of res.data ?? []) {
      const id = item.business?.id;
      if (!id || !item.role) continue;
      roles.set(id, [...(roles.get(id) ?? []), item.role]);
    }
    next = res.paging?.next ?? null;
  }

  return roles;
}

async function fetchBusinessById(id: string, roleMap: Map<string, string[]>): Promise<BusinessManagerRow | null> {
  const res: GraphResult<BusinessManagerRow> = await graph<BusinessManagerRow>(`/${id}`, {
    params: { fields: BM_FIELDS },
    version: 'v25.0',
  });
  if (isGraphError(res)) return null;
  return { ...res, permitted_roles: res.permitted_roles ?? roleMap.get(id) };
}

export async function fetchBusinessManagers(
  config: LoadBusinessManagersConfig = {}
): Promise<BusinessManagerRow[]> {
  const ids = parseIdsText(config.idsText ?? '');
  if (ids.length > 0) {
    const roleMap = await fetchBusinessRoles();
    const concurrency = clamp(config.concurrency, 1, 100, 8);
    const rows: BusinessManagerRow[] = [];
    let next = 0;

    async function worker(): Promise<void> {
      while (true) {
        const id = ids[next++];
        if (!id) return;
        const row = await fetchBusinessById(id, roleMap);
        if (row) rows.push(row);
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
    return rows;
  }

  const pageLimit = clamp(config.pageLimit, 1, 200, 200);
  const rows: BusinessManagerRow[] = [];
  let next: string | null = '/me';
  let pageCount = 0;

  while (next && pageCount < 100) {
    const res: GraphResult<BusinessManagerPage> = await graph<BusinessManagerPage>(
      next,
      next.startsWith('https')
        ? { version: 'v25.0' }
        : { params: { fields: `businesses.limit(${pageLimit}){${BM_FIELDS}}` }, version: 'v25.0' }
    );
    if (isGraphError(res)) throw new Error(res.message);
    rows.push(...(res.businesses?.data ?? []));
    next = res.businesses?.paging?.next ?? null;
    pageCount += 1;
  }

  return rows;
}
