import { graph, graphql, isGraphError } from '../../fb';

export type RemovePartnerMode = 'all' | 'id';

interface PartnerRelationship {
  id: string;
  name?: string;
}

// Remove partner businesses from one BM. Lists partner_relationships, filters by
// mode, then RemoveBusinessPartnerMutation per target. 1 call per BM (runner gives
// one job/BM). partner_relationships is the primary edge that carries the partner
// `id` (unlike MeoFB's /partners). Payload from doc, not verified live → test-live.
// Never throws.
export async function removePartner(
  bmId: string,
  mode: RemovePartnerMode,
  ids: string[]
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List partners. fields=id,name; id is what the remove mutation needs.
  const list = await graph<{ data?: PartnerRelationship[] }>(`/${bmId}/partner_relationships`, {
    params: { fields: 'id,name', limit: 500 },
    version: 'v17.0',
  });
  if (isGraphError(list)) return { ok: false, message: list.message };

  const partners = list.data ?? [];
  const wanted = new Set(ids.map((id) => id.trim()));
  const targets = mode === 'all' ? partners : partners.filter((p) => wanted.has(p.id));

  if (targets.length === 0) {
    return mode === 'id'
      ? { ok: false, warn: true, message: 'Không tìm thấy đối tác khớp id đã nhập' }
      : { ok: true, message: 'Không có đối tác để xóa' };
  }

  // 2) Remove each via RemoveBusinessPartnerMutation. The partner id field name
  // (partner_business_id) is from doc → test-live.
  let removed = 0;
  const errors: string[] = [];
  for (const p of targets) {
    const res = await graphql(
      {
        fb_api_req_friendly_name: 'RemoveBusinessPartnerMutation',
        doc_id: '9742323712551273',
        variables: JSON.stringify({
          input: { client_mutation_id: '1', business_id: bmId, partner_business_id: p.id },
        }),
      },
      'business'
    );
    if (isGraphError(res)) errors.push(`${p.id}: ${res.message}`);
    else removed += 1;
  }

  const ok = errors.length === 0;
  return {
    ok,
    message: ok
      ? `Đã xóa ${removed}/${targets.length} đối tác`
      : `Xóa ${removed}/${targets.length}; lỗi: ${errors.join(' | ')}`,
  };
}
