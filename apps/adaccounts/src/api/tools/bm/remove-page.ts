import { graph, graphql, isGraphError } from '../../fb';

export type RemovePageMode = 'all' | 'id';

interface BmPage {
  id: string;
  name?: string;
}

// FB rate-limits page removals; the doc calls for ~1s between mutations.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Strip whitespace so user-typed ids match the edge ids.
function normId(id: string): string {
  return id.trim();
}

// Remove Pages from one BM. Lists owned_pages + client_pages, filters by mode
// (`all` = every page, `id` = matching ids), then RemovePageMutation per target
// with a ~1s delay between calls. 1 call set per BM. Payload from doc, not
// verified live → test-live. Never throws.
export async function removePage(
  bmId: string,
  mode: RemovePageMode,
  ids: string[]
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List owned + client pages. Query each edge directly with an explicit limit:
  // the combined `/${bmId}?fields=owned_pages,client_pages` form caps nested edges
  // at FB's default (~25), so a BM with many pages would silently drop targets and
  // mode 'all' would report "removed N/N" while leaving pages behind.
  const [owned, client] = await Promise.all([
    graph<{ data?: BmPage[] }>(`/${bmId}/owned_pages`, {
      params: { fields: 'id,name', limit: 500 },
      version: 'v24.0',
    }),
    graph<{ data?: BmPage[] }>(`/${bmId}/client_pages`, {
      params: { fields: 'id,name', limit: 500 },
      version: 'v24.0',
    }),
  ]);
  if (isGraphError(owned)) return { ok: false, message: owned.message };
  if (isGraphError(client)) return { ok: false, message: client.message };

  // Dedup by id: a page that is both owned and client must not be removed twice
  // (the second RemovePageMutation would fail and falsely mark the run as errored).
  const byId = new Map<string, BmPage>();
  for (const p of [...(owned.data ?? []), ...(client.data ?? [])]) byId.set(normId(p.id), p);
  const pages = [...byId.values()];

  // 2) Filter by mode.
  const wanted = new Set(ids.map(normId));
  const targets = mode === 'all' ? pages : pages.filter((p) => wanted.has(normId(p.id)));

  if (targets.length === 0) {
    return mode === 'id'
      ? { ok: false, warn: true, message: 'Không tìm thấy Page khớp id đã nhập' }
      : { ok: true, message: `BM ${bmId}: không có Page để xóa` };
  }

  // 3) Remove each via RemovePageMutation, ~1s apart.
  let removed = 0;
  const errors: string[] = [];
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i]!;
    const res = await graphql(
      {
        fb_api_req_friendly_name: 'BizKitSettingsRemovePageMutation',
        doc_id: '9410980655690803',
        variables: JSON.stringify({
          // test-live: RemovePageMutation variables shape.
          input: { client_mutation_id: '1', business_id: bmId, page_id: p.id },
        }),
      },
      'business'
    );
    if (isGraphError(res)) errors.push(`${p.id}: ${res.message}`);
    else removed += 1;
    if (i < targets.length - 1) await sleep(1000);
  }

  const ok = errors.length === 0;
  return {
    ok,
    message: ok
      ? `Đã xóa ${removed}/${targets.length} Page`
      : `Xóa ${removed}/${targets.length}; lỗi: ${errors.join(' | ')}`,
  };
}
