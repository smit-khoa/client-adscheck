import { graph } from '../../fb';
import { isGraphError } from '../../fb';

// Cancel pending invitations in one Business Manager. `all` clears every pending
// user; `by-email` only cancels invites whose email is in the provided set. REST
// is the only path here: GET the pending list, then POST method=delete per match.
// Pure logic — no UI imports. Never throws; aggregates per-BM into { ok, message }.

export type CancelMode = 'all' | 'by-email';

interface PendingUser {
  id: string;
  email?: string;
}

// Normalize for matching: lowercase, trim, and strip a `+tag` before the `@`.
// Share adds a random `+tag` per invite (super-share trick), so FB stores the
// pending email tagged (e.g. 123+sz6@x.cc) while the user types the plain address
// (123@x.cc). Stripping the tag on BOTH sides lets the plain input match every
// tagged invite to that inbox — which is the intended "cancel by email" behavior.
function norm(email: string): string {
  return email.trim().toLowerCase().replace(/\+[^@]*(?=@)/, '');
}

/**
 * Cancel pending invites in one BM. Returns a per-BM outcome (the runner calls
 * this once per selected BM). Never throws.
 */
export async function cancelPendingInvites(
  bmId: string,
  mode: CancelMode,
  emails: string[]
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List pending users. `fields=id,email` is required — without it the edge
  // returns only the default field set (no email), so by-email matching gets
  // nothing to compare. v17.0: returns { data: [{ id, email, ... }] }.
  const list = await graph<{ data?: PendingUser[] }>(`/${bmId}/pending_users`, {
    params: { fields: 'id,email', limit: 9999 },
    version: 'v17.0',
  });
  if (isGraphError(list)) return { ok: false, message: list.message };

  const pending = list.data ?? [];
  const wanted = new Set(emails.map(norm));
  const targets =
    mode === 'by-email'
      ? pending.filter((p) => p.email && wanted.has(norm(p.email)))
      : pending;

  if (targets.length === 0) {
    // by-email found no matching invite → warn (likely a typo or already-cancelled),
    // not a silent success. `all` on an empty BM is a genuine no-op success.
    return mode === 'by-email'
      ? { ok: false, warn: true, message: 'Không tìm thấy lời mời khớp email đã nhập' }
      : { ok: true, message: 'Không có lời mời đang chờ' };
  }

  // 2) Delete each pending request: POST /<requestId> with method=delete.
  let removed = 0;
  const errors: string[] = [];
  for (const p of targets) {
    const res = await graph(`/${p.id}`, {
      method: 'POST',
      body: { method: 'delete' },
      version: 'v17.0',
    });
    if (isGraphError(res)) errors.push(`${p.email ?? p.id}: ${res.message}`);
    else removed += 1;
  }

  const ok = errors.length === 0;
  const message = ok
    ? `Đã hủy ${removed}/${targets.length} lời mời`
    : `Hủy ${removed}/${targets.length}; lỗi: ${errors.join(' | ')}`;
  return { ok, message };
}
