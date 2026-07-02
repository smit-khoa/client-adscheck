import { graphql } from '@/api/fb-graph';
import { isGraphError } from '@/api/types';
import type { BmRowPatch } from '../types/bm-data-loading.types';

interface LegacyTypeResponse {
  data?: unknown;
}

interface LegacyQualityResponse {
  data?: unknown;
  isRestricted?: boolean;
}

function findValueByKeys(value: unknown, keys: string[]): string | number | boolean | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const stack: unknown[] = [value];
  const seen = new Set<unknown>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== 'object' || current === null || seen.has(current)) continue;
    seen.add(current);
    for (const [key, child] of Object.entries(current)) {
      if (keys.includes(key) && ['string', 'number', 'boolean'].includes(typeof child)) {
        return child as string | number | boolean;
      }
      if (typeof child === 'object' && child !== null) stack.push(child);
    }
  }
  return undefined;
}

function readIsRestricted(res: LegacyQualityResponse): boolean {
  if (typeof res.isRestricted === 'boolean') return res.isRestricted;
  if (typeof res.data === 'object' && res.data !== null) {
    const data = res.data as { data?: { isRestricted?: boolean }; isRestricted?: boolean };
    if (typeof data.data?.isRestricted === 'boolean') return data.data.isRestricted;
    if (typeof data.isRestricted === 'boolean') return data.isRestricted;
  }
  return Boolean(findValueByKeys(res, ['isRestricted']));
}

export async function fetchBmLegacyType(bmId: string): Promise<BmRowPatch> {
  const res = await graphql<LegacyTypeResponse>(
    {
      doc_id: '32061067960207573',
      variables: JSON.stringify({
        businessID: bmId,
        overridePrimaryBusinessLocationEligibility: false,
      }),
    },
    'business',
    { tokenPurpose: 'legacyGraphql' }
  );
  if (isGraphError(res)) throw new Error(res.message);

  const limit = findValueByKeys(res.data, ['ad_account_creation_limit']);
  return {
    bmId,
    legacyType: limit === undefined || limit === '' ? '' : `BM ${String(limit)}`,
  };
}

export async function fetchBmLegacyQuality(bmId: string): Promise<BmRowPatch> {
  const res = await graphql<LegacyQualityResponse>(
    {
      doc_id: '3920367411328805',
      variables: JSON.stringify({ entity_id: bmId, action: null }),
    },
    'business',
    { tokenPurpose: 'legacyGraphql' }
  );
  if (isGraphError(res)) throw new Error(res.message);

  const isRestricted = readIsRestricted(res);
  return {
    bmId,
    legacyQuality: isRestricted ? '⛔️ Hạn chế' : '✅ Tốt',
    legacyStatus: isRestricted ? 'Restricted' : 'Live',
  };
}
