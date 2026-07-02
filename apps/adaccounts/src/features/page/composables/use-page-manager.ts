import { reactive, ref } from 'vue';
import { checkFacebookSession } from '../../../api/fb-session';
import { getToken } from '../../../api/fb-token';
import { extStorageGet, extStorageSet } from '../../../api/smit-connect';
import {
  applyMonetizationDetails,
  applyStatusDetails,
  clampPageLimit,
  createDefaultPageFetchConfig,
  createPendingPageRows,
  fetchPageDetails,
  preloadPageTokens,
  resolvePageRefs,
} from '../api/page-fetch';
import type { PageFetchConfig, PageLoadProgress, PageRow } from '../types/page-manager.types';

const config = reactive<PageFetchConfig>(createDefaultPageFetchConfig());
const rows = ref<PageRow[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const progress = ref<PageLoadProgress>({ total: 0, loaded: 0, step: '' });
let loadedOnce = false;

const DATA_KEY = 'v8_page_rows_cached';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface PageCachePayload {
  rows: PageRow[];
  config: PageFetchConfig | null;
  progress: PageLoadProgress | null;
}

interface UserScopedCache<T> {
  user_id?: string;
  saved_at: number;
  data: T;
}

function isUserScopedCache(value: unknown): value is UserScopedCache<PageCachePayload> {
  return typeof value === 'object' && value !== null && 'data' in value && 'saved_at' in value;
}

function assignConfig(next: PageFetchConfig): void {
  config.source = next.source;
  config.ids = next.ids;
  config.pageLimit = next.pageLimit;
  config.options = { ...next.options };
}

async function readCacheIfFresh(currentUserId?: string): Promise<PageCachePayload | null> {
  const cachedRows = await extStorageGet<unknown>(DATA_KEY);

  if (isUserScopedCache(cachedRows)) {
    if (!cachedRows.saved_at || Date.now() - cachedRows.saved_at >= CACHE_TTL_MS) return null;
    if (currentUserId && cachedRows.user_id !== currentUserId) return null;
    return cachedRows.data;
  }

  // Legacy raw-array cache has no FB owner and no saved_at. Trust it only when the
  // current FB user cannot be resolved; otherwise avoid showing another user's rows.
  if (Array.isArray(cachedRows) && !currentUserId) {
    return { rows: cachedRows, config: null, progress: null };
  }
  return null;
}

async function writeCache(userId?: string): Promise<void> {
  await extStorageSet({
    [DATA_KEY]: {
      user_id: userId,
      saved_at: Date.now(),
      data: {
        rows: rows.value,
        config: { ...config, options: { ...config.options } },
        progress: progress.value,
      },
    },
  });
}

async function loadPages(): Promise<void> {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;
  rows.value = [];
  progress.value = { total: 0, loaded: 0, step: 'Đang chuẩn bị token và resolve Page ID...' };

  try {
    config.pageLimit = clampPageLimit(config.pageLimit);
    const session = await checkFacebookSession();
    if (session.status === 'not_logged_in') {
      error.value = session.message ?? 'Bạn chưa đăng nhập Facebook trên trình duyệt.';
      loadedOnce = false;
      return;
    }
    if (session.status === 'switched') {
      loadedOnce = false;
    }

    const tokenTask = preloadPageTokens();
    const refs = await resolvePageRefs(config);
    if (refs.length === 0) throw new Error('Không tìm thấy Page nào theo nguồn đã chọn.');

    const nextRows = createPendingPageRows(refs);
    rows.value = [...nextRows];
    progress.value = { total: refs.length, loaded: 0, step: 'Đã hiện Page ID, đang tải detail bằng batch...' };

    await tokenTask;
    const detailRows = await fetchPageDetails(refs, config.options.post);
    nextRows.splice(0, nextRows.length, ...detailRows);
    rows.value = [...nextRows];
    progress.value = { total: refs.length, loaded: nextRows.length, step: 'Đã tải detail Page' };

    if (config.options.status) {
      progress.value = { total: refs.length, loaded: nextRows.length, step: 'Đang check trạng thái...' };
      await applyStatusDetails(nextRows);
      rows.value = [...nextRows];
    }

    if (config.options.monetize) {
      progress.value = { total: refs.length, loaded: nextRows.length, step: 'Đang check kiếm tiền...' };
      const monetizeWarning = await applyMonetizationDetails(nextRows);
      if (monetizeWarning) error.value = monetizeWarning;
      rows.value = [...nextRows];
    }

    progress.value = { total: refs.length, loaded: rows.value.length, step: 'Hoàn tất' };
    await writeCache((await checkFacebookSession()).user_id);
    loadedOnce = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
}

async function ensureLoaded(): Promise<void> {
  if (isLoading.value) return;

  const session = await checkFacebookSession();
  if (session.status === 'not_logged_in') {
    error.value = session.message ?? 'Bạn chưa đăng nhập Facebook trên trình duyệt.';
    rows.value = [];
    loadedOnce = false;
    return;
  }
  if (session.status === 'switched') {
    error.value = null;
    rows.value = [];
    loadedOnce = false;
  }

  if (loadedOnce || rows.value.length > 0) return;

  let cached: PageCachePayload | null = null;
  isLoading.value = true;
  try {
    cached = await readCacheIfFresh(session.user_id);
    if (cached) {
      rows.value = cached.rows;
      if (cached.config) assignConfig(cached.config);
      if (cached.progress) progress.value = cached.progress;
      loadedOnce = true;
    }
  } catch {
    // Cache hydration is best-effort; an unavailable extension store should leave the table empty.
  } finally {
    isLoading.value = false;
  }

  if (!cached) {
    await loadPages();
  }
}

async function getCurrentUserId(): Promise<string | undefined> {
  try {
    return (await getToken()).user_id;
  } catch {
    return undefined;
  }
}

async function hydrateFromCache(): Promise<void> {
  if (loadedOnce || rows.value.length > 0 || isLoading.value) return;
  try {
    const cached = await readCacheIfFresh(await getCurrentUserId());
    if (cached) {
      rows.value = cached.rows;
      if (cached.config) assignConfig(cached.config);
      if (cached.progress) progress.value = cached.progress;
      loadedOnce = true;
    }
  } catch {
    // Cache hydration is best-effort; ignore storage failures.
  }
}

export function usePageManager() {
  return {
    config,
    rows,
    isLoading,
    error,
    progress,
    ensureLoaded,
    hydrateFromCache,
    loadPages,
  };
}
