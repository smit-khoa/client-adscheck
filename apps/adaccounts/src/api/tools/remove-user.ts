import { getToken } from '../fb-token';
import { isGraphError } from '../types';
import type { ToolRunner } from './index';
import {
  bareAccountId,
  getBmIdForCurrentUser,
  loadAccountAdminContext,
  loadSelfRemoveContext,
  parseUids,
  removeOneAdmin,
  scrapeHiddenAdmins,
  shouldScrapeHiddenAdmins,
  wait,
} from './remove-user-helpers';

function buildProtectedIds(currentUserId: string, ownerId?: string | null): Set<string> {
  return new Set([currentUserId, ownerId].filter((id): id is string => Boolean(id)));
}

function unique(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

export const removeUser: ToolRunner = async (account, values, _index, ctx) => {
  const adId = bareAccountId(account.id);
  const mode = typeof values.mode === 'string' ? values.mode : 'allExceptMe';
  const token = await getToken();
  const accountCtx = mode === 'selfRemove'
    ? await loadSelfRemoveContext(adId)
    : await loadAccountAdminContext(adId);

  if (isGraphError(accountCtx)) return { ok: false, message: accountCtx.message };

  const normalUsers = accountCtx.users?.data ?? [];
  const userpermissions = accountCtx.userpermissions?.data ?? [];
  const bmId = getBmIdForCurrentUser(accountCtx, token.user_id);
  const ownerBusinessId = accountCtx.owner_business?.id ?? null;
  const protectedIds = buildProtectedIds(token.user_id, accountCtx.owner);
  let detectMethod: 'none' | 'batch_diff_then_html' | 'html_fallback' = 'none';

  const hiddenCheck = mode === 'selfRemove'
    ? { scrape: false, fallback: false }
    : await shouldScrapeHiddenAdmins(normalUsers, userpermissions.length);
  const hiddenUserIds = hiddenCheck.scrape ? await scrapeHiddenAdmins(adId, ownerBusinessId) : [];
  if (hiddenCheck.scrape) detectMethod = hiddenCheck.fallback ? 'html_fallback' : 'batch_diff_then_html';

  const inputUids = parseUids(values.uidList);
  const keepUids = parseUids(values.uidListKeep);
  const normalUserIds = normalUsers.map((u) => u.id);

  let targetIds: string[];
  if (mode === 'selfRemove') {
    if (accountCtx.owner === token.user_id) {
      return {
        ok: false,
        message: 'Không thể tự xóa khỏi TKQC này vì bạn là owner. Meta không cho sửa/xóa quyền của owner TKQC.',
      };
    }
    targetIds = [token.user_id];
  } else if (mode === 'byIdExceptMe') {
    targetIds = inputUids;
  } else if (mode === 'allExceptIdsAndMe') {
    keepUids.forEach((uid) => protectedIds.add(uid));
    targetIds = normalUserIds.concat(hiddenUserIds);
  } else if (mode === 'hiddenOnly') {
    targetIds = hiddenUserIds;
  } else {
    targetIds = normalUserIds.concat(hiddenUserIds);
  }

  const skippedUids = mode === 'selfRemove' ? [] : unique(targetIds).filter((uid) => protectedIds.has(uid));
  const removableUids = mode === 'selfRemove'
    ? unique(targetIds)
    : unique(targetIds).filter((uid) => !protectedIds.has(uid));

  if (removableUids.length === 0) {
    return {
      ok: true,
      message: `Không có UID cần xóa · ẩn ${hiddenUserIds.length} · bỏ qua ${skippedUids.length}`,
    };
  }

  const successUids: string[] = [];
  const failedUids: Array<{ uid: string; reason: string }> = [];
  const methodCounts = new Map<string, number>();
  const delay = Math.max(0, Math.floor(ctx?.delayMs ?? 0) || 0);

  for (const uid of removableUids) {
    const res = await removeOneAdmin(adId, uid, bmId);
    if (res.ok) {
      successUids.push(uid);
      if (res.methodUsed) methodCounts.set(res.methodUsed, (methodCounts.get(res.methodUsed) ?? 0) + 1);
    }
    else failedUids.push({ uid, reason: res.message });
    if (delay > 0) await wait(delay);
  }

  const parts = [
    `Xóa ${successUids.length}/${removableUids.length} UID`,
    `ẩn ${hiddenUserIds.length}`,
    `bỏ qua ${skippedUids.length}`,
    `detect ${detectMethod}`,
    `method ${Array.from(methodCounts.entries()).map(([method, count]) => `${method}:${count}`).join(',') || 'none'}`,
  ];
  if (failedUids.length > 0) {
    parts.push(`lỗi: ${failedUids.map((f) => `${f.uid}: ${f.reason}`).join('; ')}`);
  }

  return { ok: failedUids.length === 0, message: parts.join(' · ') };
};
