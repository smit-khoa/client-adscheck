import { extFetch } from '../../../api/smit-connect';
import { getToken } from '../../../api/fb-token';
import { getBmToken } from '../../../api/fb-bm-token';
import { graph } from '../../../api/fb-graph';
import { isGraphError, type GraphResult } from '../../../api/types';
import type { PageFetchConfig, PageRow, ResolvedPageRef } from '../types/page-manager.types';

const DETAIL_BATCH_SIZE = 50;
const GRAPH_VERSION = 'v24.0';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

interface FbPaging<T> {
  data?: T[];
  paging?: { next?: string };
}

interface FbPageRef {
  id?: string;
  perms?: string[];
  roles?: { data?: FbRole[] } | FbRole[];
}

interface FbBusinessPages {
  owned_pages?: FbPaging<FbPageRef>;
  client_pages?: FbPaging<FbPageRef>;
}

interface FbPicture {
  data?: { url?: string };
  url?: string;
}

interface FbBusiness {
  id?: string;
  name?: string;
}

interface FbRole {
  id?: string;
  name?: string;
}

interface FbPageDetail {
  id?: string;
  name?: string;
  picture?: FbPicture;
  is_published?: boolean;
  business?: FbBusiness | null;
  fan_count?: number;
  followers_count?: number;
  verification_status?: string;
  is_verified?: boolean;
  is_eligible_for_live_boosting?: boolean;
  additional_profile_id?: string;
  page_created_time?: string;
  roles?: { data?: FbRole[] } | FbRole[];
  posts?: { data?: Array<{ id?: string }> };
}

interface BatchItemResponse {
  code?: number;
  body?: string;
}

interface MonetizationPayloadItem {
  basicInfo?: { id?: string };
  eligibilityBucket?: string;
  monetizationToolsEligibilityStatus?: Record<string, MonetizationToolStatus>;
}

type MonetizationToolStatus = string | { is_eligible?: boolean; eligibility_status?: string };

interface MonetizationResponse {
  payload?: MonetizationPayloadItem[];
}

export function createDefaultPageFetchConfig(): PageFetchConfig {
  return {
    source: 'all',
    ids: '',
    pageLimit: DEFAULT_LIMIT,
    options: {
      status: true,
      tick: true,
      follow: true,
      post: true,
      pageLive: true,
      monetize: true,
    },
  };
}

export function clampPageLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

function formEncode(obj: Record<string, string | number | boolean>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

function parseNumericIds(value: string): string[] {
  const ids = value
    .split(/[\s,;]+/)
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
  return [...new Set(ids)];
}

function roleFromRef(page: FbPageRef): string {
  if (page.perms?.includes('ADMINISTER') || page.perms?.includes('CREATE_CONTENT')) return 'ADMIN';
  return page.perms?.length ? page.perms.join(', ') : '';
}

function dedupePageRefs(items: ResolvedPageRef[]): ResolvedPageRef[] {
  const seen = new Map<string, ResolvedPageRef>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}

async function fetchAllPagesFromPath(path: string, limit: number, fields = 'id'): Promise<ResolvedPageRef[]> {
  const pages: ResolvedPageRef[] = [];
  let next: string | null = path;

  while (next) {
    const res: GraphResult<FbPaging<FbPageRef>> = await graph<FbPaging<FbPageRef>>(
      next,
      next.startsWith('https') ? {} : { params: { fields, limit } }
    );
    if (isGraphError(res)) throw new Error(res.message);

    for (const page of res.data ?? []) {
      if (page.id) pages.push({ id: page.id, role: roleFromRef(page) });
    }
    next = res.paging?.next ?? null;
  }

  return pages;
}

async function resolveMinePages(limit: number): Promise<ResolvedPageRef[]> {
  return fetchAllPagesFromPath('/me/accounts', limit, 'id,perms,roles');
}

async function resolveBusinessPages(ids: string[], limit: number): Promise<ResolvedPageRef[]> {
  const pages: ResolvedPageRef[] = [];
  for (const bmId of ids) {
    const [owned, client] = await Promise.all([
      fetchAllPagesFromPath(`/${bmId}/owned_pages`, limit),
      fetchAllPagesFromPath(`/${bmId}/client_pages`, limit),
    ]);
    pages.push(...owned, ...client);
  }
  return dedupePageRefs(pages);
}

async function resolveAllPages(limit: number): Promise<ResolvedPageRef[]> {
  const pages = await resolveMinePages(limit);
  const businesses = await graph<FbPaging<FbBusinessPages>>('/me/businesses', {
    params: {
      fields: `owned_pages.limit(${limit}){id},client_pages.limit(${limit}){id}`,
      limit: MAX_LIMIT,
    },
  });
  if (isGraphError(businesses)) throw new Error(businesses.message);

  for (const bm of businesses.data ?? []) {
    for (const page of bm.owned_pages?.data ?? []) if (page.id) pages.push({ id: page.id });
    for (const page of bm.client_pages?.data ?? []) if (page.id) pages.push({ id: page.id });
  }

  return dedupePageRefs(pages);
}

export async function resolvePageRefs(config: PageFetchConfig): Promise<ResolvedPageRef[]> {
  const limit = clampPageLimit(config.pageLimit);
  if (config.source === 'pageIds') return parseNumericIds(config.ids).map((id) => ({ id }));
  if (config.source === 'bmIds') return resolveBusinessPages(parseNumericIds(config.ids), limit);
  if (config.source === 'mine') return resolveMinePages(limit);
  return resolveAllPages(limit);
}

function buildDetailFields(includePosts: boolean): string {
  const fields = [
    'id',
    'name',
    'picture{url}',
    'is_published',
    'business{id,name}',
    'fan_count',
    'followers_count',
    'verification_status',
    'is_verified',
    'is_eligible_for_live_boosting',
    'additional_profile_id',
    'page_created_time',
    'roles.limit(50){id,name}',
  ];
  if (includePosts) fields.push('posts.limit(100){id}');
  return fields.join(',');
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

function rolesToArray(roles?: { data?: FbRole[] } | FbRole[]): FbRole[] {
  if (Array.isArray(roles)) return roles;
  return roles?.data ?? [];
}

function countAdmins(detail: FbPageDetail): number {
  return rolesToArray(detail.roles).length;
}

function mapPageTick(detail: FbPageDetail): string {
  if (detail.is_verified === true) return 'Có';
  if (/^(blue|gray)_verified$/i.test(detail.verification_status ?? '')) return 'Có';
  return 'Chưa có';
}

function mapPageDetail(detail: FbPageDetail, ref?: ResolvedPageRef): PageRow {
  const id = detail.id || ref?.id || '';
  const isLive = detail.is_published !== false;
  return {
    id,
    rowKey: id,
    pageId: id,
    name: detail.name || id,
    avatar: detail.picture?.data?.url || detail.picture?.url || '',
    status: isLive ? 'Live' : 'Unknown',
    live: isLive,
    role: ref?.role || '',
    bm: detail.business?.id || '',
    bmName: detail.business?.name || '',
    adminCount: countAdmins(detail),
    createdDate: formatDate(detail.page_created_time),
    likes: detail.fan_count ?? null,
    follows: detail.followers_count ?? null,
    type: detail.business ? 'Doanh nghiệp' : 'Cá nhân',
    postCount: detail.posts?.data?.length ?? null,
    pageTick: mapPageTick(detail),
    pageLive: detail.is_eligible_for_live_boosting ? 'Đạt' : 'Chưa đạt',
    monetize: '',
    profileId: detail.additional_profile_id || '',
    error: '',
  };
}

async function fetchPageDetailChunk(chunk: ResolvedPageRef[], fields: string, accessToken: string): Promise<BatchItemResponse[]> {
  const batch = chunk.map((ref) => ({
    method: 'GET',
    relative_url: `${ref.id}?fields=${encodeURIComponent(fields)}`,
  }));

  const text = await extFetch(`https://graph.facebook.com/${GRAPH_VERSION}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formEncode({
      access_token: accessToken,
      include_headers: false,
      batch: JSON.stringify(batch),
      suppress_http_code: 1,
      locale: 'en_US',
    }),
  });

  const batchResult = JSON.parse(text) as BatchItemResponse[];
  if (!Array.isArray(batchResult)) throw new Error('Batch lỗi hoặc phản hồi không hợp lệ');
  return batchResult;
}

function mapBatchItem(item: BatchItemResponse, ref: ResolvedPageRef, refById: Map<string, ResolvedPageRef>): PageRow {
  if (!item.body || (item.code && item.code >= 400)) {
    return { ...emptyRow(ref), error: parseGraphErrorMessage(item.body, `Batch lỗi ${item.code ?? ''}`.trim()) };
  }
  try {
    const detail = JSON.parse(item.body) as FbPageDetail & { error?: { message?: string; code?: number } };
    if (detail.error) {
      return { ...emptyRow(ref), error: detail.error.message || `Graph lỗi ${detail.error.code ?? ''}`.trim() };
    }
    return mapPageDetail(detail, refById.get(ref.id));
  } catch {
    return { ...emptyRow(ref), error: 'Parse lỗi' };
  }
}

export function preloadPageTokens(): Promise<void> {
  return Promise.all([getToken(), getBmToken()]).then(() => undefined);
}

export function createPendingPageRows(refs: ResolvedPageRef[]): PageRow[] {
  return refs.map((ref) => emptyRow(ref));
}

export async function fetchPageDetails(refs: ResolvedPageRef[], includePosts: boolean): Promise<PageRow[]> {
  const tokenG = await getBmToken();
  const fields = buildDetailFields(includePosts);
  const refById = new Map(refs.map((ref) => [ref.id, ref]));
  const rows: PageRow[] = [];

  for (let i = 0; i < refs.length; i += DETAIL_BATCH_SIZE) {
    const chunk = refs.slice(i, i + DETAIL_BATCH_SIZE);
    const batchResult = await fetchPageDetailChunk(chunk, fields, tokenG);
    const pairCount = Math.min(batchResult.length, chunk.length);
    for (let index = 0; index < pairCount; index += 1) {
      rows.push(mapBatchItem(batchResult[index] as BatchItemResponse, chunk[index] as ResolvedPageRef, refById));
    }
  }

  return rows;
}

function parseGraphErrorMessage(body?: string, fallback = 'Graph lỗi'): string {
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: number } };
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.error?.code) return `${fallback} ${parsed.error.code}`;
  } catch {
    // Keep the caller's fallback when Facebook returns HTML/empty text.
  }
  return fallback;
}

function emptyRow(ref: ResolvedPageRef): PageRow {
  return {
    id: ref.id,
    rowKey: ref.id,
    pageId: ref.id,
    name: ref.id,
    avatar: '',
    status: '',
    live: null,
    role: ref.role || '',
    bm: '',
    bmName: '',
    adminCount: null,
    createdDate: '',
    likes: null,
    follows: null,
    type: '',
    postCount: null,
    pageTick: '',
    pageLive: '',
    monetize: '',
    profileId: '',
    error: '',
  };
}

interface AccountQualityResponse {
  data?: unknown;
}

function isRestrictedQuality(value: unknown): boolean | null {
  const text = JSON.stringify(value);
  if (text.includes('NOT_RESTRICTED') && !text.includes('is_restricted":true')) return false;
  if (/RESTRICTED|restricted/i.test(text)) return true;
  return null;
}

export async function applyStatusDetails(rows: PageRow[]): Promise<void> {
  const { user_id } = await getToken();
  for (const row of rows) {
    if (!row.pageId || row.error) continue;
    const variables = JSON.stringify({ assetOwnerId: row.bm || user_id, assetId: row.pageId });
    const text = await extFetch('https://www.facebook.com/api/graphql/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({
        __a: 1,
        fb_api_req_friendly_name: 'AccountQualityHubAssetViewV2Query',
        doc_id: '6228297077225495',
        variables,
        ...(await getGraphqlAuthBody()),
      }),
    });
    const json = text.startsWith('for (;;);') ? text.slice(9) : text;
    const parsed = JSON.parse(json) as AccountQualityResponse;
    const restricted = isRestrictedQuality(parsed.data ?? parsed);
    if (restricted === false) {
      row.status = 'Live';
      row.live = true;
    } else if (restricted === true) {
      row.status = 'Hạn chế';
      row.live = false;
    }
  }
}

async function getGraphqlAuthBody(): Promise<Record<string, string>> {
  const { fb_dtsg, lsd } = await getToken();
  return { fb_dtsg, lsd, locale: 'en_US' };
}

function isEligibleTool(status?: MonetizationToolStatus): boolean {
  if (typeof status === 'string') return status === 'eligible';
  return status?.is_eligible === true || status?.eligibility_status === 'eligible';
}

function mapMonetizationTools(item: MonetizationPayloadItem): string {
  const status = item.monetizationToolsEligibilityStatus ?? {};
  const labels: Record<string, string> = {
    ad_breaks_open_program: 'In-stream',
    reels_ads: 'Reels',
    live_ad_breaks: 'Live ads',
    stars: 'Stars',
    fan_funding: 'Fan subs',
  };
  const enabled = Object.entries(labels)
    .filter(([key]) => isEligibleTool(status[key]))
    .map(([, label]) => label);
  return enabled.length > 0 ? enabled.join(', ') : 'Chưa bật';
}

export async function applyMonetizationDetails(rows: PageRow[]): Promise<string | null> {
  const { user_id, fb_dtsg, lsd } = await getToken();
  let text = '';
  try {
    text = await extFetch(
      'https://www.facebook.com/creator_monetization/eligibility_widget/?surface=facebook_partner_program_fb4c',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-fb-lsd': lsd,
        },
        body: formEncode({
          av: user_id,
          __user: user_id,
          __a: 1,
          __req: 2,
          dpr: 1,
          __ccg: 'EXCELLENT',
          fb_dtsg,
          jazoest: '2',
          lsd,
        }),
      }
    );
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }

  const json = text.startsWith('for (;;);') ? text.slice(9) : text;
  if (!json.trim()) return 'Creator monetization không trả dữ liệu.';

  let parsed: MonetizationResponse;
  try {
    parsed = JSON.parse(json) as MonetizationResponse;
  } catch {
    return 'Creator monetization trả phản hồi không phải JSON.';
  }

  const byId = new Map<string, string>();
  for (const item of parsed.payload ?? []) {
    const id = item.basicInfo?.id;
    if (id) byId.set(id, mapMonetizationTools(item));
  }
  for (const row of rows) row.monetize = byId.get(row.pageId) ?? 'Không có dữ liệu';
  return null;
}
