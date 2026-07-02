import { graphql } from '../../../api/fb-graph';
import { isGraphError } from '../../../api/types';
import { normalizeAccountId, type AdAccountSeed } from './adaccount-mappers';

interface HiddenLimitResponse {
  data?: {
    billable_account_by_asset_id?: {
      formatted_dsl?: string;
      legacy_account_id?: string;
    };
  };
}

const MAX_RETRIES = 2;
const MAX_BACKOFF_MS = 5_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function parseHiddenLimit(value?: string): number | undefined {
  if (!value) return undefined;
  const numeric = value.replace(/[^\d,.]/g, '').replace(/,/g, '');
  if (!numeric) return undefined;
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchHiddenLimit(accountId: string): Promise<{ limit?: number; legacyId?: string } | undefined> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await graphql<HiddenLimitResponse>({
        doc_id: '6401661393282937',
        variables: JSON.stringify({ assetID: accountId }),
      });

      if (isGraphError(res)) throw new Error(res.message);
      const data = res.data?.billable_account_by_asset_id;
      return {
        limit: parseHiddenLimit(data?.formatted_dsl),
        legacyId: data?.legacy_account_id,
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await wait(Math.min(MAX_BACKOFF_MS, 800 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function runHiddenLimitQueue(
  seeds: AdAccountSeed[],
  concurrency: number
): Promise<Map<string, { limit?: number; legacyId?: string } | undefined>> {
  const output = new Map<string, { limit?: number; legacyId?: string } | undefined>();
  if (seeds.length === 0) return output;

  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), seeds.length, 10);
  let next = 0;
  let consecutiveErrors = 0;

  async function worker(): Promise<void> {
    while (consecutiveErrors < 8) {
      const seed = seeds[next++];
      if (!seed) return;
      const key = normalizeAccountId(seed.account_id);

      try {
        output.set(key, await fetchHiddenLimit(key));
        consecutiveErrors = 0;
      } catch {
        consecutiveErrors += 1;
        output.set(key, undefined);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return output;
}
