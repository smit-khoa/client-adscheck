import { computed, ref } from 'vue';
import { checkFacebookSession } from '../../../api/fb-session';
import { getToken } from '../../../api/fb-token';
import { extStorageGet, extStorageSet } from '../../../api/smit-connect';
import { fetchBmAdAccounts } from '../api/fetch-bm-ad-accounts';
import { fetchBmAdmins } from '../api/fetch-bm-admins';
import { fetchBmAssets } from '../api/fetch-bm-assets';
import { fetchBmBaseRows } from '../api/fetch-bm-base';
import { fetchBmLegacyQuality, fetchBmLegacyType } from '../api/fetch-bm-legacy';
import { fetchBmStatus } from '../api/fetch-bm-status';
import { runWithConcurrency } from '../utils/concurrency';
import { normalizeError } from '../utils/bm-row-mappers';
import {
  DEFAULT_BM_LOAD_CONFIG,
  type BmAdvancedGroup,
  type BmLoadConfig,
  type BmPatchGroup,
  type BmRow,
  type BmRowPatch,
} from '../types/bm-data-loading.types';

const sessionCache = new Map<string, BmRowPatch>();
const rows = ref<BmRow[]>([]);
const isLoadingBase = ref(false);
const isLoadingAdvanced = ref(false);
const baseError = ref('');
const activeConfig = ref<BmLoadConfig | null>(null);
let loadedOnce = false;

const DATA_KEY = 'v8_bm_rows_cached';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface BmCachePayload {
  rows: BmRow[];
  activeConfig: BmLoadConfig | null;
}

interface UserScopedCache<T> {
  user_id?: string;
  saved_at: number;
  data: T;
}

function isUserScopedCache(value: unknown): value is UserScopedCache<BmCachePayload> {
  return typeof value === 'object' && value !== null && 'data' in value && 'saved_at' in value;
}

async function getCurrentUserId(): Promise<string | undefined> {
  try {
    return (await getToken()).user_id;
  } catch {
    return undefined;
  }
}

async function readCacheIfFresh(): Promise<BmCachePayload | null> {
  const cachedRows = await extStorageGet<unknown>(DATA_KEY);
  const currentUserId = await getCurrentUserId();

  if (isUserScopedCache(cachedRows)) {
    if (!cachedRows.saved_at || Date.now() - cachedRows.saved_at >= CACHE_TTL_MS) return null;
    if (currentUserId && cachedRows.user_id !== currentUserId) return null;
    return cachedRows.data;
  }

  // Legacy row cache has no FB owner and no saved_at. Trust it only when the current
  // FB user cannot be resolved; otherwise avoid showing another user's BM rows.
  if (Array.isArray(cachedRows) && !currentUserId) {
    return { rows: cachedRows as BmRow[], activeConfig: null };
  }
  return null;
}

async function writeCache(list: BmRow[], config: BmLoadConfig | null): Promise<void> {
  await extStorageSet({
    [DATA_KEY]: {
      user_id: await getCurrentUserId(),
      saved_at: Date.now(),
      data: { rows: list, activeConfig: config },
    },
  });
}

function cacheKey(bmId: string, group: BmPatchGroup): string {
  return `bm:${bmId}:${group}`;
}

function parseBmIds(ids: string[] | string): string[] {
  const source = Array.isArray(ids) ? ids.join('\n') : ids;
  return [...new Set(source.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean))];
}

function patchRow(patch: BmRowPatch): void {
  rows.value = rows.value.map((row) => row.bmId === patch.bmId ? { ...row, ...patch } : row);
}

function setGroupLoading(bmId: string, groups: BmPatchGroup[], value: boolean): void {
  rows.value = rows.value.map((row) => {
    if (row.bmId !== bmId) return row;
    const loadingGroups = { ...row.loadingGroups };
    for (const group of groups) loadingGroups[group] = value;
    return { ...row, loadingGroups };
  });
}

function setGroupError(bmId: string, groups: BmPatchGroup[], message: string): void {
  rows.value = rows.value.map((row) => {
    if (row.bmId !== bmId) return row;
    const errorGroups = { ...row.errorGroups };
    for (const group of groups) errorGroups[group] = message;
    return { ...row, errorGroups };
  });
}

function mergeCached(bmId: string, groups: BmPatchGroup[]): BmPatchGroup[] {
  const missing: BmPatchGroup[] = [];
  for (const group of groups) {
    const cached = sessionCache.get(cacheKey(bmId, group));
    if (cached) patchRow(cached);
    else missing.push(group);
  }
  return missing;
}

function rememberPatch(bmId: string, groups: BmPatchGroup[], patch: BmRowPatch): void {
  for (const group of groups) sessionCache.set(cacheKey(bmId, group), patch);
}

async function runFamily(
  bmId: string,
  groups: BmPatchGroup[],
  fetcher: () => Promise<BmRowPatch>
): Promise<void> {
  const missing = mergeCached(bmId, groups);
  if (missing.length === 0) return;
  setGroupLoading(bmId, missing, true);
  setGroupError(bmId, missing, '');
  try {
    const patch = await fetcher();
    patchRow(patch);
    rememberPatch(bmId, missing, patch);
  } catch (error) {
    setGroupError(bmId, missing, normalizeError(error).message);
  } finally {
    setGroupLoading(bmId, missing, false);
  }
}

async function runBmDetails(row: BmRow, config: BmLoadConfig): Promise<void> {
  const assetGroups = (['page', 'instagram', 'whatsapp'] as BmAdvancedGroup[]).filter((group) => config.adv[group]);
  if (assetGroups.length > 0) {
    await runFamily(row.bmId, assetGroups, () => fetchBmAssets(row.bmId, {
      page: config.adv.page,
      instagram: config.adv.instagram,
      whatsapp: config.adv.whatsapp,
    }));
  }

  const accountGroups = (['bmAccount', 'share', 'limit'] as BmAdvancedGroup[]).filter((group) => config.adv[group]);
  if (accountGroups.length > 0) {
    await runFamily(row.bmId, accountGroups, () => fetchBmAdAccounts(row.bmId, {
      bmAccount: config.adv.bmAccount,
      share: config.adv.share,
      limit: config.adv.limit,
    }));
  }

  if (config.adv.admin) {
    await runFamily(row.bmId, ['admin'], () => fetchBmAdmins(row.bmId));
  }

  if (config.adv.legacyType) {
    await runFamily(row.bmId, ['legacyType'], () => fetchBmLegacyType(row.bmId));
  }

  if (config.adv.legacyQuality) {
    await runFamily(row.bmId, ['legacyQuality'], () => fetchBmLegacyQuality(row.bmId));
  }
}

async function runStatus(rowsToPatch: BmRow[]): Promise<void> {
  const groups: BmPatchGroup[] = ['status'];
  for (const row of rowsToPatch) setGroupLoading(row.bmId, groups, true);
  try {
    const patches = await fetchBmStatus(rowsToPatch);
    for (const patch of patches) {
      patchRow(patch);
      rememberPatch(patch.bmId, groups, patch);
      setGroupError(patch.bmId, groups, '');
    }
  } catch (error) {
    const message = normalizeError(error).message;
    for (const row of rowsToPatch) setGroupError(row.bmId, groups, message);
  } finally {
    for (const row of rowsToPatch) setGroupLoading(row.bmId, groups, false);
  }
}

export function useBmDataLoader() {
  const isLoading = computed(() => isLoadingBase.value || isLoadingAdvanced.value);

  async function load(config: BmLoadConfig): Promise<void> {
    if (isLoading.value) return;

    const concurrency = Math.max(1, Math.floor(config.concurrency || 50));
    const ids = parseBmIds(config.ids);
    const includePartner = !config.advEnabled || config.adv.partner;
    activeConfig.value = { ...config, ids, concurrency };
    baseError.value = '';
    isLoadingBase.value = true;

    if (config.source === 'byId' && ids.length === 0) {
      rows.value = [];
      baseError.value = 'Vui lòng nhập ít nhất một BM ID.';
      isLoadingBase.value = false;
      return;
    }

    try {
      const session = await checkFacebookSession();
      if (session.status === 'not_logged_in') {
        rows.value = [];
        sessionCache.clear();
        baseError.value = session.message ?? 'Bạn chưa đăng nhập Facebook trên trình duyệt.';
        loadedOnce = false;
        return;
      }
      if (session.status === 'switched') {
        rows.value = [];
        sessionCache.clear();
        loadedOnce = false;
      }

      rows.value = await fetchBmBaseRows({
        source: config.source,
        ids,
        includePartner,
        pageSize: concurrency,
      });
      await writeCache(rows.value, activeConfig.value);
      loadedOnce = true;
    } catch (error) {
      rows.value = [];
      baseError.value = normalizeError(error).message;
      return;
    } finally {
      isLoadingBase.value = false;
    }

    if (!config.advEnabled) return;

    isLoadingAdvanced.value = true;
    try {
      // Session cache intentionally survives repeated loads in this browser session;
      // the loading guard below prevents an older advanced pass patching new rows.
      if (config.adv.status) await runStatus(rows.value);
      await runWithConcurrency(rows.value, concurrency, (row) => runBmDetails(row, activeConfig.value!));
      await writeCache(rows.value, activeConfig.value);
    } finally {
      isLoadingAdvanced.value = false;
    }
  }

  async function ensureLoaded(): Promise<void> {
    if (isLoading.value) return;

    const session = await checkFacebookSession();
    if (session.status === 'not_logged_in') {
      baseError.value = session.message ?? 'Bạn chưa đăng nhập Facebook trên trình duyệt.';
      rows.value = [];
      sessionCache.clear();
      loadedOnce = false;
      return;
    }
    if (session.status === 'switched') {
      baseError.value = '';
      rows.value = [];
      sessionCache.clear();
      loadedOnce = false;
    }

    if (loadedOnce || rows.value.length > 0) return;

    let cached: BmCachePayload | null = null;
    isLoadingBase.value = true;
    try {
      cached = await readCacheIfFresh();
      if (cached) {
        rows.value = cached.rows;
        activeConfig.value = cached.activeConfig;
        loadedOnce = true;
      }
    } catch {
      // Cache hydration is best-effort; an unavailable extension store should leave the table empty.
    } finally {
      isLoadingBase.value = false;
    }

    if (!cached) {
      await load(DEFAULT_BM_LOAD_CONFIG);
    }
  }

  async function refresh(): Promise<void> {
    if (isLoading.value) return;
    if (activeConfig.value) await load(activeConfig.value);
  }

  function clearSessionCache(): void {
    sessionCache.clear();
  }

  async function hydrateFromCache(): Promise<void> {
    if (loadedOnce || rows.value.length > 0 || isLoading.value) return;
    try {
      const cached = await readCacheIfFresh();
      if (cached) {
        rows.value = cached.rows;
        activeConfig.value = cached.activeConfig;
        loadedOnce = true;
      }
    } catch {
      // Cache hydration is best-effort; ignore storage failures.
    }
  }

  return {
    rows,
    isLoadingBase,
    isLoadingAdvanced,
    isLoading,
    baseError,
    activeConfig,
    ensureLoaded,
    hydrateFromCache,
    load,
    refresh,
    clearSessionCache,
  };
}
