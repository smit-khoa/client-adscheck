import { graph } from '../fb-graph';
import { extFetch } from '../smit-connect';
import { isGraphError, type GraphResult } from '../types';

const UID_RE = /^\d{6,}$/;

export interface AccountUser {
  id: string;
  name?: string;
  is_active?: boolean;
}

interface UserPermission {
  user?: { id?: string };
  business?: { id?: string };
}

export interface AccountAdminContext {
  owner?: string | null;
  owner_business?: { id?: string } | null;
  users?: { data?: AccountUser[] };
  userpermissions?: { data?: UserPermission[] };
}

interface BatchGraphItem {
  code?: number;
  body?: string;
}

export function parseUids(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return Array.from(new Set(value.split(/\r?\n/).map((s) => s.trim()).filter((s) => UID_RE.test(s))));
}

export function bareAccountId(accountId: string): string {
  return accountId.startsWith('act_') ? accountId.slice(4) : accountId;
}

export function getBmIdForCurrentUser(ctx: AccountAdminContext, currentUserId: string): string | null {
  return ctx.userpermissions?.data?.find((p) => p.user?.id === currentUserId)?.business?.id ?? null;
}

export async function loadAccountAdminContext(adId: string): Promise<GraphResult<AccountAdminContext>> {
  return graph<AccountAdminContext>(`/act_${adId}`, {
    params: {
      fields:
        'account_id,owner,owner_business{id},users{id,name,is_active,permissions,role,tasks,roles},userpermissions.limit(500){user{id},business{id}}',
    },
  });
}

export async function loadSelfRemoveContext(adId: string): Promise<GraphResult<AccountAdminContext>> {
  return graph<AccountAdminContext>(`/act_${adId}`, {
    params: {
      fields: 'account_id,owner,owner_business{id},userpermissions.limit(500){user{id},business{id}}',
    },
  });
}

export async function shouldScrapeHiddenAdmins(
  normalUsers: AccountUser[],
  permissionCount: number
): Promise<{ scrape: boolean; fallback: boolean }> {
  if (normalUsers.length === 0) return { scrape: false, fallback: false };

  const batch = normalUsers.map((u) => ({ method: 'GET', relative_url: `/${u.id}` }));
  const res = await graph<BatchGraphItem[]>('/', {
    method: 'POST',
    body: { batch: JSON.stringify(batch), include_headers: false },
  });

  if (isGraphError(res) || !Array.isArray(res)) return { scrape: true, fallback: true };

  const resolvedCount = res.filter((item) => {
    if (item.code && item.code >= 400) return false;
    if (!item.body) return false;
    try {
      const body = JSON.parse(item.body) as { error?: unknown; id?: string };
      return Boolean(body.id && !body.error);
    } catch {
      return false;
    }
  }).length;

  return { scrape: resolvedCount !== permissionCount, fallback: false };
}

function stripEscapedRedirect(value: string): string | null {
  return value.match(/window\.location\.replace\("(.*?)"\)/)?.[1]?.replace(/\\/g, '') ?? null;
}

function parseHiddenIdsFromHtml(html: string): string[] {
  const hidden = new Set<string>();
  const block = html.match(/"bootstrapAccountAndTimezoneInfo"(.*?)(\[{.*?}\])/s)?.[2];

  if (block) {
    const idMatches = Array.from(block.matchAll(/id:(\d+)/g));
    const nameMatches = Array.from(block.matchAll(/name:(null|".*?")/g));
    for (let i = 0; i < idMatches.length; i += 1) {
      const id = idMatches[i]?.[1];
    if (id && nameMatches[i]?.[1] === 'null') hidden.add(id);
    }
  }

  for (const match of html.matchAll(/(?:\{|,)id:(\d+),name:null/g)) {
    const id = match[1];
    if (id) hidden.add(id);
  }
  for (const match of html.matchAll(/(?:^|[{,\s])id:(\d+),name:null/g)) {
    const id = match[1];
    if (id) hidden.add(id);
  }

  return Array.from(hidden);
}

export async function scrapeHiddenAdmins(adId: string, ownerBusinessId: string | null): Promise<string[]> {
  const url = ownerBusinessId
    ? `https://business.facebook.com/ads/manager/account_settings/information/?act=${adId}&pid=p1&business_id=${ownerBusinessId}&page=account_settings&tab=account_information`
    : `https://adsmanager.facebook.com/ads/manager/account_settings/information/?act=${adId}`;

  let html = await extFetch(url);
  const redirect = stripEscapedRedirect(html);
  if (redirect?.startsWith('https')) html = await extFetch(redirect);

  return parseHiddenIdsFromHtml(html);
}

export interface RemoveAttempt {
  method: 'users_delete' | 'userpermissions_delete';
  ok: boolean;
  reason?: string;
}

export interface RemoveOneResult {
  ok: boolean;
  message: string;
  methodUsed: RemoveAttempt['method'] | null;
  attempts: RemoveAttempt[];
}

export async function removeOneAdmin(adId: string, uid: string, bmId: string | null): Promise<RemoveOneResult> {
  const primary = await graph<Record<string, unknown>>(`/act_${adId}/users/${uid}`, {
    params: { method: 'DELETE' },
  });
  const primaryReason = graphMessage(primary) || 'Xóa quyền qua /users thất bại';
  const attempts: RemoveAttempt[] = [
    { method: 'users_delete', ok: !isGraphError(primary) && isRemoveSuccess(primary), reason: graphMessage(primary) ?? undefined },
  ];
  if (attempts[0]?.ok) return { ok: true, message: 'OK', methodUsed: 'users_delete', attempts };

  if (bmId) {
    const fallback = await graph<Record<string, unknown>>(`/act_${adId}/userpermissions`, {
      params: { user: uid, method: 'DELETE', business: bmId },
    });
    const fallbackReason = graphMessage(fallback) || 'Xóa quyền qua /userpermissions thất bại';
    attempts.push({
      method: 'userpermissions_delete',
      ok: !isGraphError(fallback) && isRemoveSuccess(fallback),
      reason: graphMessage(fallback) ?? undefined,
    });
    if (attempts[1]?.ok) return { ok: true, message: 'OK', methodUsed: 'userpermissions_delete', attempts };
    return { ok: false, message: fallbackReason || primaryReason, methodUsed: null, attempts };
  }

  return { ok: false, message: primaryReason, methodUsed: null, attempts };
}

function isRemoveSuccess(res: Record<string, unknown>): boolean {
  const errors = Array.isArray(res.errors) ? res.errors : null;
  if (res.success === false || res.error || (errors && errors.length > 0) || res.message) return false;
  return res.success === true || (!res.message && !res.error && (!errors || errors.length === 0));
}

function graphMessage(res: unknown): string | null {
  if (isGraphError(res)) return res.message;
  if (typeof res !== 'object' || res === null) return null;
  const value = res as { message?: unknown; error?: { message?: unknown }; errors?: Array<{ message?: unknown }> };
  return String(value.message || value.error?.message || value.errors?.[0]?.message || '') || null;
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
