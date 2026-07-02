import type { AdAccount } from '../features/adaccounts';
import type { RowResult } from './types';

interface RunBatchOptions {
  /** Max accounts processed concurrently ("Luồng"). */
  threads: number;
  /** Delay in ms between launching each worker ("Delay"). */
  delayMs: number;
}

type Worker = (
  account: AdAccount,
  index: number
) => Promise<{ ok: boolean; message: string; patch?: Partial<AdAccount> }>;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run `worker` over `accounts` with bounded concurrency and a delay between
 * launches (mirrors the reference tools' anti-rate-limit behaviour). Never
 * rejects — every account yields a RowResult, errors included.
 */
export async function runBatch(
  accounts: AdAccount[],
  worker: Worker,
  { threads, delayMs }: RunBatchOptions
): Promise<RowResult[]> {
  const concurrency = Math.max(1, Math.floor(threads) || 1);
  const delay = Math.max(0, Math.floor(delayMs) || 0);
  const results: RowResult[] = new Array(accounts.length);
  let next = 0;

  async function runOne(index: number): Promise<void> {
    const account = accounts[index];
    if (!account) return;
    try {
      // index = position in the selected list (stable), so sequential tools can
      // number accounts deterministically regardless of concurrent completion.
      const { ok, message, patch } = await worker(account, index);
      results[index] = { accountId: account.id, ok, message, patch };
    } catch (err) {
      results[index] = {
        accountId: account.id,
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Each lane pulls the next index, optionally waiting `delay` before launching
  // so requests are spread out rather than fired all at once.
  async function lane(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= accounts.length) return;
      if (delay > 0 && index >= concurrency) await wait(delay);
      await runOne(index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, accounts.length) }, lane));
  return results;
}
