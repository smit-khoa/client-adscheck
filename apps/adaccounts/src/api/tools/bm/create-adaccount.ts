import { graph, isGraphError } from '../../fb';

export type CreateAdAccountMode = 'meofb' | 'xmeta';

interface CreateResult {
  account_id?: string;
  id?: string;
}

// Create one ad account inside a BM. Both modes are REST POST /<bm>/adaccount;
// they differ only in graph version (meofb v23.0 / xmeta v17.0). Body from the
// MeoFB trace: name + currency + timezone_id + partner/end_advertiser/media_agency.
// Payload from doc, not verified live → test-live.
export async function createAdAccount(
  bmId: string,
  opts: { name: string; currency: string; timezoneId: string; mode: CreateAdAccountMode }
): Promise<{ ok: boolean; message: string }> {
  const version = opts.mode === 'meofb' ? 'v23.0' : 'v17.0';
  const res = await graph<CreateResult>(`/${bmId}/adaccount`, {
    method: 'POST',
    version,
    body: {
      name: opts.name,
      currency: opts.currency,
      timezone_id: opts.timezoneId,
      partner: 'NONE',
      end_advertiser: bmId,
      media_agency: 'UNFOUND',
    },
  });
  if (isGraphError(res)) return { ok: false, message: res.message };
  const id = res.account_id || res.id;
  if (id) return { ok: true, message: `Đã tạo TKQC ${id} trong BM ${bmId}` };
  return { ok: false, message: `Không xác nhận được tạo TKQC trong BM ${bmId}` };
}
