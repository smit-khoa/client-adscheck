import { graph } from '@/api/fb-graph';
import { isGraphError } from '@/api/types';
import { mapAssetPatch } from '../utils/bm-row-mappers';
import type { BmRowPatch } from '../types/bm-data-loading.types';

interface AssetFetchOptions {
  page: boolean;
  instagram: boolean;
  whatsapp: boolean;
}

function buildAssetFields(options: AssetFetchOptions): string {
  const fields: string[] = [];
  if (options.page) {
    fields.push(
      'owned_pages.limit(100){id,name,picture,fan_count,verification_status}',
      'client_pages.limit(100){id,name,picture,fan_count,verification_status}'
    );
  }
  if (options.instagram) {
    fields.push(
      'owned_instagram_assets.limit(200){id,ig_username}',
      'client_instagram_assets.limit(200){id,ig_username}',
      'owned_instagram_accounts.limit(200){id,username,name,profile_pic,followed_by_count,follow_count,media_count}'
    );
  }
  if (options.whatsapp) {
    fields.push('whatsapp_business_accounts.limit(100){id,name,verified_name,phone_numbers,status}');
  }
  return fields.join(',');
}

export async function fetchBmAssets(bmId: string, options: AssetFetchOptions): Promise<BmRowPatch> {
  const fields = buildAssetFields(options);
  if (!fields) return { bmId };
  const res = await graph<Record<string, unknown>>(`/${bmId}`, {
    params: { fields },
    version: 'v25.0',
  });
  if (isGraphError(res)) throw new Error(res.message);
  return mapAssetPatch(bmId, res as Record<string, { data?: Record<string, unknown>[] } | undefined>, options);
}
