import { graphql } from '../../../api/fb-graph';
import { isGraphError } from '../../../api/types';
import { normalizeAccountId, type AdAccountSeed } from './adaccount-mappers';

export interface CheckHoldResult {
  priskRestrictions?: unknown[];
  billingFlags?: string[];
  requiredWizardName?: string;
  billingAccountStatus?: string;
  isReauthRestricted?: boolean;
  isSdcRestricted?: boolean;
  holdNeed?: string;
}

interface CheckHoldResponse {
  data?: {
    billable_account_by_payment_account?: {
      prisk_restrictions?: unknown[];
      billing_flags?: string[];
      required_wizard_name?: string | null;
      account_status?: string;
      is_reauth_restricted?: boolean;
      is_sdc_restricted?: boolean;
    };
  };
}

const MAX_RETRIES = 2;
const MAX_BACKOFF_MS = 5_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildHoldNeed(data: NonNullable<CheckHoldResponse['data']>['billable_account_by_payment_account']): string {
  if (!data) return '';

  const hasHardRestriction = Boolean(
    data.prisk_restrictions?.length || data.is_reauth_restricted || data.is_sdc_restricted
  );

  return hasHardRestriction ? 'HOLD' : 'OK';
}

async function fetchCheckHold(accountId: string): Promise<CheckHoldResult | undefined> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await graphql<CheckHoldResponse>({
        doc_id: '6975887429148122',
        variables: JSON.stringify({ paymentAccountID: accountId }),
      });

      if (isGraphError(res)) throw new Error(res.message);
      const data = res.data?.billable_account_by_payment_account;
      if (!data) return undefined;

      return {
        priskRestrictions: data.prisk_restrictions,
        billingFlags: data.billing_flags,
        requiredWizardName: data.required_wizard_name ?? undefined,
        billingAccountStatus: data.account_status,
        isReauthRestricted: data.is_reauth_restricted,
        isSdcRestricted: data.is_sdc_restricted,
        holdNeed: buildHoldNeed(data),
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

export async function runCheckHoldQueue(
  seeds: AdAccountSeed[],
  concurrency: number,
  hiddenLimitMap: Map<string, { legacyId?: string } | undefined>
): Promise<Map<string, CheckHoldResult | undefined>> {
  const output = new Map<string, CheckHoldResult | undefined>();
  if (seeds.length === 0) return output;

  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), seeds.length, 10);
  let next = 0;
  let consecutiveErrors = 0;

  async function worker(): Promise<void> {
    while (consecutiveErrors < 8) {
      const seed = seeds[next++];
      if (!seed) return;
      const key = normalizeAccountId(seed.account_id);
      const hl = hiddenLimitMap.get(key);
      const paymentId = hl?.legacyId || key;

      try {
        output.set(key, await fetchCheckHold(paymentId));
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
