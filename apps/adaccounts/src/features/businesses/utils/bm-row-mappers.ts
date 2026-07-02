import type { BmRow, BmRowPatch } from '../types/bm-data-loading.types';

interface Connection<T> {
  data?: T[];
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
  agencies?: Connection<{ id?: string; name?: string }>;
  partners?: Connection<{ id?: string; name?: string }>;
  owned_apps?: Connection<{ id?: string; name?: string }>;
}

export interface AdAccountNode {
  account_id?: string;
  account_status?: number;
  adtrust_dsl?: number | string;
  currency?: string;
  amount_spent?: number | string;
  name?: string;
  created_time?: string;
}

export function formatCreatedDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

export function mapBusinessToRow(node: BusinessNode): BmRow {
  const bmId = String(node.id ?? '').trim();
  const agencies = node.agencies?.data ?? node.partners?.data ?? [];
  return {
    id: bmId,
    bmId,
    name: node.name ?? bmId,
    status: 'Chưa tải',
    disabled: Boolean(node.is_disabled_for_integrity_reasons),
    type: node.created_time ? `BM-${formatCreatedDate(node.created_time)}` : '',
    tier: node.sharing_eligibility_status === 'enabled' ? 'BM350' : 'BM50',
    role: node.permitted_roles?.[0] ?? '',
    notify: node.verification_status ?? 'not_verified',
    partnerCount: agencies.length,
    appCount: node.owned_apps?.data?.length ?? 0,
    createdDate: formatCreatedDate(node.created_time),
    loadingGroups: {},
    errorGroups: {},
  };
}

export function mapAssetPatch(
  bmId: string,
  payload: Record<string, Connection<Record<string, unknown>> | undefined>,
  groups: { page: boolean; instagram: boolean; whatsapp: boolean }
): BmRowPatch {
  const patch: BmRowPatch = { bmId };

  if (groups.page) {
    const owned = payload.owned_pages?.data ?? [];
    const client = payload.client_pages?.data ?? [];
    patch.pageCount = owned.length + client.length;
  }

  if (groups.instagram) {
    const ownedAssets = payload.owned_instagram_assets?.data ?? [];
    const clientAssets = payload.client_instagram_assets?.data ?? [];
    patch.instagramCount = ownedAssets.length + clientAssets.length;
  }

  if (groups.whatsapp) {
    const rows = payload.whatsapp_business_accounts?.data ?? [];
    patch.whatsappCount = rows.length;
  }

  const pageCount = patch.pageCount ?? 0;
  const instagramCount = patch.instagramCount ?? 0;
  const whatsappCount = patch.whatsappCount ?? 0;
  if (groups.page || groups.instagram || groups.whatsapp) {
    patch.assetSummary = `Page: ${pageCount} - IG: ${instagramCount} - WhatsApp: ${whatsappCount}`;
  }

  return patch;
}

export function summarizeAccounts(accounts: AdAccountNode[]): string {
  const live = accounts.filter((item) => item.account_status === 1).length;
  const die = accounts.filter((item) => item.account_status === 2).length;
  return `Total: ${accounts.length} - Live: ${live} - Die: ${die}`;
}

export function mapAdAccountPatch(
  bmId: string,
  owned: AdAccountNode[],
  client: AdAccountNode[],
  groups: { bmAccount: boolean; share: boolean; limit: boolean }
): BmRowPatch {
  const patch: BmRowPatch = { bmId };
  if (groups.bmAccount) {
    patch.accountBm = summarizeAccounts(owned);
  }
  if (groups.share) {
    patch.accountShare = summarizeAccounts(client);
  }
  if (groups.limit) {
    if (owned.length === 0) {
      patch.limit = '';
      patch.currency = '';
    } else {
      const spend = owned
        .map((item) => Number(item.amount_spent))
        .filter((value) => Number.isFinite(value))
        .reduce((total, value) => total + value, 0);
      patch.spend = String(spend);

      const numericRows = owned
        .map((item) => ({ item, value: Number(item.adtrust_dsl) }))
        .filter(({ value }) => Number.isFinite(value));
      if (numericRows.length === 0) {
        patch.limit = 'No Limit';
        patch.currency = '';
      } else {
        const max = numericRows.reduce((best, current) => current.value > best.value ? current : best);
        patch.limit = String(max.value);
        patch.currency = max.item.currency ?? '';
      }
    }
  }
  return patch;
}

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error || 'Unknown error'));
}
