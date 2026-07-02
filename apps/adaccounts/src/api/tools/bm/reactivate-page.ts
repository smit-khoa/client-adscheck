import { graph, graphql, isGraphError } from '../../fb';

interface OwnedPage {
  id: string;
  name?: string;
  is_deactivated?: boolean;
}

// Reactivate every deactivated Page inside one BM. Lists owned_pages, filters
// is_deactivated, then ReactivateProfileMutation per page. 1 call set per BM
// (runner gives one job/BM). Payload from doc, not verified live → test-live.
// Never throws.
export async function reactivatePage(
  bmId: string
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List owned pages with deactivation flag.
  const list = await graph<{ data?: OwnedPage[] }>(`/${bmId}/owned_pages`, {
    params: { fields: 'id,name,is_deactivated', limit: 500 },
    version: 'v17.0',
  });
  if (isGraphError(list)) return { ok: false, message: list.message };

  // 2) Keep only deactivated pages.
  const deactivated = (list.data ?? []).filter((p) => p.is_deactivated === true);
  if (deactivated.length === 0) {
    return { ok: true, message: `BM ${bmId}: không có Page bị vô hiệu` };
  }

  // 3) Reactivate each via ReactivateProfileMutation (host business).
  let reactivated = 0;
  const errors: string[] = [];
  for (const page of deactivated) {
    const res = await graphql<{ data?: { profile?: { name?: string } } }>(
      {
        // test-live: real friendly_name (doc only has doc_id) + variables shape.
        fb_api_req_friendly_name: 'ReactivateProfileMutation',
        doc_id: '5931430166980261',
        variables: JSON.stringify({ profile_id: null, delegate_page_id: page.id }),
      },
      'business'
    );
    if (isGraphError(res)) errors.push(`${page.id}: ${res.message}`);
    else reactivated += 1; // test-live: success marker (doc says response contains name)
  }

  const ok = errors.length === 0;
  return {
    ok,
    message: ok
      ? `Đã kích ${reactivated}/${deactivated.length} Page`
      : `Kích ${reactivated}/${deactivated.length}; lỗi: ${errors.join(' | ')}`,
  };
}
