import { graph, isGraphError } from '../../fb';

export type RenameBmMode = 'meofb' | 'xmeta';

// Rename one BM. REST POST /<bm> with name= (no error = success). meofb v18.0 /
// xmeta v17.0 differ only by graph version (z-p3 host in xmeta doc is just a CDN
// mirror of the same API → plain graph.facebook.com; switch to extFetch if
// test-live needs the z-p3 host). Payload from doc, not verified live. Never throws.
export async function renameBm(
  bmId: string,
  name: string,
  mode: RenameBmMode = 'meofb'
): Promise<{ ok: boolean; message: string }> {
  const version = mode === 'meofb' ? 'v18.0' : 'v17.0';
  const res = await graph(`/${bmId}`, { method: 'POST', body: { name }, version });
  if (isGraphError(res)) return { ok: false, message: res.message };
  return { ok: true, message: `Đã đổi tên BM ${bmId} → ${name}` };
}
