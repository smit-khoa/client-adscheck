import { getTokenForPurpose, resetTokenForSlot, type TokenSlot } from '../../../api/fb-token-policy';
import { extFetch } from '../../../api/smit-connect';
import type { GraphError } from '../../../api/types';
import { normalizeAccountId, toActId, type AdAccountSeed } from './adaccount-mappers';

interface BatchCall {
  method: 'GET';
  relative_url: string;
}

interface BatchResponse {
  code?: number;
  body?: string;
}

interface RunAccountBatchOptions {
  seeds: AdAccountSeed[];
  fields: string[];
  concurrency: number;
  payment?: boolean;
}

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 5_000;
const AUTH_ERROR_CODES = new Set([190, 102, 463, 467]);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRetryableStatus(code?: number): boolean {
  return code === undefined || code === 4 || code === 17 || code === 32 || code === 613 || code >= 500;
}

function parseBatchBody(body: string | undefined): unknown {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as { error?: GraphError };
    return parsed.error ? { error: true, message: parsed.error.message, code: parsed.error.code } : parsed;
  } catch {
    return { error: true, message: 'Phản hồi batch không hợp lệ' };
  }
}

function isAuthErrorMessage(message: string): boolean {
  return /oauth|access token|session|login|đăng nhập/i.test(message);
}

function isOAuthStaleResponse(response: BatchResponse): boolean {
  const parsed = parseBatchBody(response.body);
  if (typeof parsed !== 'object' || parsed === null || !('error' in parsed)) return false;

  const error = parsed as { message?: string; code?: number };
  if (error.code !== undefined && AUTH_ERROR_CODES.has(error.code)) return true;
  return isAuthErrorMessage(error.message ?? '');
}

async function postBatch(calls: BatchCall[]): Promise<{ responses: BatchResponse[]; slot: TokenSlot }> {
  const resolution = await getTokenForPurpose('readGraph', {
    readPreference: 'auto',
    autoFallbackSlots: ['token_b'],
  });
  const access_token = resolution.access_token;
  if (!access_token) throw new Error('Token policy không trả access token');

  const body = new URLSearchParams({
    access_token,
    include_headers: 'false',
    batch: JSON.stringify(calls),
  }).toString();

  const text = await extFetch('https://graph.facebook.com/v24.0', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const parsed = JSON.parse(text) as BatchResponse[];
  if (!Array.isArray(parsed)) throw new Error('Phản hồi batch không phải mảng');
  return { responses: parsed, slot: resolution.slot };
}

function shouldRetryBatch(responses: BatchResponse[]): boolean {
  return responses.some((response) => response.code && response.code >= 500);
}

async function postBatchWithRetry(calls: BatchCall[]): Promise<BatchResponse[]> {
  let lastError: unknown;
  let authRetried = false;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let batch = await postBatch(calls);
      if (!authRetried && batch.responses.some(isOAuthStaleResponse)) {
        authRetried = true;
        await resetTokenForSlot(batch.slot);
        batch = await postBatch(calls);
      }

      if (!shouldRetryBatch(batch.responses)) return batch.responses;
      lastError = new Error('Facebook batch tạm thời lỗi');
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_RETRIES) {
      await wait(Math.min(MAX_BACKOFF_MS, 800 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function chunkSeeds(seeds: AdAccountSeed[]): AdAccountSeed[][] {
  const chunks: AdAccountSeed[][] = [];
  for (let index = 0; index < seeds.length; index += BATCH_SIZE) {
    chunks.push(seeds.slice(index, index + BATCH_SIZE));
  }
  return chunks;
}

function buildCalls(seeds: AdAccountSeed[], fields: string[]): BatchCall[] {
  const fieldText = fields.join(',');
  return seeds.map((seed) => ({
    method: 'GET',
    relative_url: `${toActId(seed.account_id)}?fields=${encodeURIComponent(fieldText)}`,
  }));
}

export async function runAccountBatch({
  seeds,
  fields,
  concurrency,
  payment = false,
}: RunAccountBatchOptions): Promise<Map<string, unknown>> {
  const output = new Map<string, unknown>();
  if (seeds.length === 0 || fields.length === 0) return output;

  const chunks = chunkSeeds(seeds);
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), chunks.length);
  let next = 0;

  async function worker(): Promise<void> {
    let consecutiveErrors = 0;
    while (consecutiveErrors < 8) {
      const index = next++;
      const chunk = chunks[index];
      if (!chunk) return;

      try {
        const responses = await postBatchWithRetry(buildCalls(chunk, fields));
        consecutiveErrors = 0;
        responses.forEach((response, responseIndex) => {
          const seed = chunk[responseIndex];
          if (!seed) return;
          const key = normalizeAccountId(seed.account_id);
          const parsed = parseBatchBody(response.body);
          if (response.code && response.code >= 400 && isRetryableStatus(response.code)) {
            output.set(key, payment ? { paymentError: `Batch error ${response.code}` } : parsed);
            return;
          }
          output.set(key, parsed);
        });
      } catch (error) {
        consecutiveErrors += 1;
        chunk.forEach((seed) => {
          output.set(
            normalizeAccountId(seed.account_id),
            payment ? { paymentError: error instanceof Error ? error.message : String(error) } : undefined
          );
        });
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return output;
}
