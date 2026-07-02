import { loadAdAccountsFlow } from './load-adaccounts-flow';
import type { AdAccount, LoadAdAccountsConfig } from '../types/account-list.types';

/**
 * Load ad accounts through the resilient BM/TKQC flow: lightweight seeds first,
 * detail/admin in Graph batch, and payment in a separate queue.
 */
export async function fetchAdAccounts(
  config: Partial<LoadAdAccountsConfig> = {}
): Promise<AdAccount[]> {
  return loadAdAccountsFlow(config);
}
