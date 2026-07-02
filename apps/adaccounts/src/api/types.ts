// Shared types for the FB-over-extension API layer (ported from the adscheck
// Facebook.js reference). Local to the adaccounts remote.

import type { AdAccount } from '../features/adaccounts';

/** Token bundle for the FB user currently logged in on the browser. */
export interface FbTokenBundle {
  access_token: string;
  fb_dtsg: string;
  fb_dtsg_ag?: string;
  lsd: string;
  user_id: string;
}

/** Options forwarded to the extension's `fetch` proxy. */
export interface ExtFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  params?: Record<string, string | number | boolean>;
}

/** A FB call either returns the parsed payload T or a normalized error. */
export type GraphResult<T = unknown> = T | GraphError;

export interface GraphError {
  error: true;
  message: string;
  code?: number;
}

export function isGraphError(value: unknown): value is GraphError {
  return typeof value === 'object' && value !== null && (value as GraphError).error === true;
}

/** One account's outcome from a batch run. */
export interface RowResult {
  accountId: string;
  ok: boolean;
  message: string;
  /**
   * Fields the action changed on this account (e.g. { name } after rename,
   * { status } after open/close). Lets the list + cache update locally without
   * a re-fetch. Only present on success; only the action knows what it changed.
   */
  patch?: Partial<AdAccount>;
}
