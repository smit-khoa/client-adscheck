import { graph } from '../../../api/fb-graph';
import { getToken } from '../../../api/fb-token';
import type { TokenPolicyOptions } from '../../../api/fb-token-policy';
import { isGraphError, type GraphResult } from '../../../api/types';
import type { AdAccount, LoadAdAccountsConfig } from '../types/account-list.types';
import { runAccountBatch } from './adaccount-batch';
import { runHiddenLimitQueue } from './adaccount-hidden-limit';
import { runCheckHoldQueue, type CheckHoldResult } from './adaccount-check-hold';
import { buildDetailFields, buildPaymentFields, normalizeLoadConfig } from './adaccount-field-groups';
import {
  mapAdAccountRow,
  matchesAccountType,
  normalizeAccountId,
  parseIdsText,
  type AdAccountSeed,
} from './adaccount-mappers';

interface FbAdAccountsPage {
  data?: AdAccountSeed[];
  paging?: { next?: string };
}

interface FbBusinessesPage {
  data?: Array<{ id?: string; name?: string }>;
  paging?: { next?: string };
}

interface FbBmAccountsResponse {
  id?: string;
  name?: string;
  owned_ad_accounts?: { data?: AdAccountSeed[] };
  client_ad_accounts?: { data?: AdAccountSeed[] };
}

type PushSeed = (seed: AdAccountSeed) => void;

const LIST_FIELDS = 'name,account_id,account_status,owner_business';
const BM_ACCOUNT_FIELDS = 'name,owned_ad_accounts.limit(5000){account_id,name,account_status},client_ad_accounts.limit(5000){account_id,name,account_status}';
const AUTO_READ_POLICY: TokenPolicyOptions = { readPreference: 'auto', autoFallbackSlots: ['token_b'] };

async function fetchAdAccountPages(path: string): Promise<AdAccountSeed[]> {
  const seeds: AdAccountSeed[] = [];
  let next: string | null = path;

  while (next) {
    const res: GraphResult<FbAdAccountsPage> = await graph<FbAdAccountsPage>(
      next,
      next.startsWith('https')
        ? { tokenPolicy: AUTO_READ_POLICY }
        : {
            params: { limit: 1000, fields: LIST_FIELDS },
            tokenPolicy: AUTO_READ_POLICY,
          }
    );
    if (isGraphError(res)) throw new Error(res.message);
    seeds.push(...(res.data ?? []));
    next = res.paging?.next ?? null;
  }

  return seeds;
}

async function fetchBusinesses(): Promise<Array<{ id: string; name?: string }>> {
  const businesses: Array<{ id: string; name?: string }> = [];
  let next: string | null = '/me/businesses';

  while (next) {
    const res: GraphResult<FbBusinessesPage> = await graph<FbBusinessesPage>(
      next,
      next.startsWith('https')
        ? { tokenPolicy: AUTO_READ_POLICY }
        : { params: { limit: 200, fields: 'id,name' }, tokenPolicy: AUTO_READ_POLICY }
    );
    if (isGraphError(res)) throw new Error(res.message);
    for (const item of res.data ?? []) {
      if (item.id) businesses.push({ id: item.id, name: item.name });
    }
    next = res.paging?.next ?? null;
  }

  return businesses;
}

async function fetchBmAccounts(bmId: string): Promise<AdAccountSeed[]> {
  const res: GraphResult<FbBmAccountsResponse> = await graph<FbBmAccountsResponse>(`/${bmId}`, {
    params: { fields: BM_ACCOUNT_FIELDS },
  });
  if (isGraphError(res)) throw new Error(res.message);

  const owner_business = { id: bmId, name: res.name };
  return [
    ...(res.owned_ad_accounts?.data ?? []),
    ...(res.client_ad_accounts?.data ?? []),
  ].map((account) => ({ ...account, owner_business: account.owner_business ?? owner_business }));
}

async function pushBmAccountSeeds(bmIds: string[], pushSeed: PushSeed, concurrency: number): Promise<void> {
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), bmIds.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const bmId = bmIds[next++];
      if (!bmId) return;
      try {
        const accounts = await fetchBmAccounts(bmId);
        accounts.forEach(pushSeed);
      } catch {
        // A single inaccessible BM must not fail the whole account discovery flow.
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
}

async function loadSeedsBySource(config: LoadAdAccountsConfig, uid: string, pushSeed: PushSeed): Promise<void> {
  if (config.source === 'tkqcIds') {
    parseIdsText(config.bmIds).forEach((id) => pushSeed({ account_id: id, name: '' }));
    return;
  }

  if (config.source === 'bmIds') {
    await pushBmAccountSeeds(parseIdsText(config.bmIds), pushSeed, config.pageLimit);
    return;
  }

  if (config.permission === 'hasRole') {
    const accounts = await fetchAdAccountPages(`/${uid}/adaccounts`);
    accounts.filter((account) => matchesAccountType(account, config.accountType)).forEach(pushSeed);
    return;
  }

  if (config.accountType === 'personal') {
    const accounts = await fetchAdAccountPages('/me/adaccounts');
    accounts.filter((account) => matchesAccountType(account, 'personal')).forEach(pushSeed);
    return;
  }

  if (config.accountType === 'bm') {
    const businesses = await fetchBusinesses();
    await pushBmAccountSeeds(businesses.map((business) => business.id), pushSeed, config.pageLimit);
    return;
  }

  const [directAccounts, businesses] = await Promise.all([
    fetchAdAccountPages('/me/adaccounts'),
    fetchBusinesses(),
  ]);
  directAccounts.forEach(pushSeed);
  await pushBmAccountSeeds(businesses.map((business) => business.id), pushSeed, config.pageLimit);
}

export async function loadAdAccountsFlow(
  partialConfig: Partial<LoadAdAccountsConfig> = {}
): Promise<AdAccount[]> {
  const config = normalizeLoadConfig(partialConfig);
  const { user_id } = await getToken();
  const seeds: AdAccountSeed[] = [];
  const seen = new Set<string>();

  const pushSeed: PushSeed = (seed) => {
    const account_id = normalizeAccountId(seed.account_id);
    if (!account_id || seen.has(account_id)) return;
    seen.add(account_id);
    seeds.push({ ...seed, account_id });
  };

  await loadSeedsBySource(config, user_id, pushSeed);

  const detailFields = buildDetailFields(config, user_id);
  const paymentFields = buildPaymentFields(config);

  const shouldLoadHiddenLimit = config.advanced && config.options.finance;
  const shouldLoadCheckHold = config.advanced && config.options.checkHold;

  // detail and payment can still run in parallel
  const [detailResult, paymentResult] = await Promise.allSettled([
    runAccountBatch({ seeds, fields: detailFields, concurrency: config.pageLimit }),
    runAccountBatch({ seeds, fields: paymentFields, concurrency: config.pageLimit, payment: true }),
  ]);

  // Hidden limit must run to get legacyId for Check Hold, or if finance is enabled
  const hiddenLimitMap = shouldLoadHiddenLimit || shouldLoadCheckHold
    ? await runHiddenLimitQueue(seeds, config.pageLimit)
    : new Map<string, { limit?: number; legacyId?: string } | undefined>();

  // Check Hold uses the legacyId from hiddenLimitMap
  const checkHoldMap = shouldLoadCheckHold
    ? await runCheckHoldQueue(seeds, config.pageLimit, hiddenLimitMap)
    : new Map<string, CheckHoldResult | undefined>();

  const detailMap = detailResult.status === 'fulfilled' ? detailResult.value : new Map<string, unknown>();
  const paymentMap = paymentResult.status === 'fulfilled' ? paymentResult.value : new Map<string, unknown>();

  return seeds.map((seed) => {
    const hl = hiddenLimitMap.get(seed.account_id);
    return mapAdAccountRow(
      seed,
      detailMap.get(seed.account_id),
      paymentMap.get(seed.account_id),
      hl?.limit,
      checkHoldMap.get(seed.account_id)
    );
  });
}
