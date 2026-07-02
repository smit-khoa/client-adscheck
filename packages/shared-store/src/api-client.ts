/** Default per-request timeout. Callers can override via `timeout_ms`. */
const DEFAULT_TIMEOUT_MS = 15_000;

interface ApiOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
  params?: Record<string, string>;
  /** Caller-owned signal (e.g. cancel on business switch). Composed with the timeout signal. */
  signal?: AbortSignal;
  /** Per-request timeout in ms. Pass 0 to disable. Defaults to DEFAULT_TIMEOUT_MS. */
  timeout_ms?: number;
  /** Skip the registered 401 side effect for endpoints that model logged-out as data. */
  suppress_unauthorized_handler?: boolean;
}

/** Why a request failed — lets callers distinguish a transient outage from a real auth/HTTP failure. */
export type ApiErrorKind = "http" | "auth" | "network" | "timeout" | "aborted";

/**
 * 401 is centralized here: a single registered handler runs once per 401 so a burst of
 * concurrent expired-session requests triggers exactly one logout/redirect, not N.
 * api-client must NOT import auth-store (would create an import cycle) — auth-store
 * registers its handler at module init instead.
 */
type UnauthorizedHandler = () => void;
let unauthorized_handler: UnauthorizedHandler | null = null;
let unauthorized_in_flight = false;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorized_handler = handler;
  // Registering a fresh handler re-arms the one-shot guard. Without this, an HMR reload
  // or store re-instantiation would leave the flag stuck and silently swallow all 401s.
  unauthorized_in_flight = false;
}

function triggerUnauthorized() {
  if (unauthorized_in_flight || !unauthorized_handler) return;
  unauthorized_in_flight = true;
  unauthorized_handler();
}

function resolveApiUrl(hostname?: string): string {
  const current = hostname ?? globalThis.location?.hostname ?? "";
  const suffix = current.split(".").slice(-2).join(".");
  return `https://gateway.${suffix}`;
}

export async function api<T = unknown>(options: ApiOptions): Promise<T> {
  const { url, method = "GET", data, params, signal } = options;
  const timeout_ms = options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const api_url = resolveApiUrl();

  const query_string = params
    ? "?" + new URLSearchParams(params).toString()
    : "";

  // Compose the caller signal with an internal timeout signal so either can abort the fetch.
  const timeout_signal =
    timeout_ms > 0 ? AbortSignal.timeout(timeout_ms) : undefined;
  const composed_signal = composeSignals(signal, timeout_signal);

  let response: Response;
  try {
    response = await fetch(`${api_url}${url}${query_string}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
      signal: composed_signal,
    });
  } catch (err) {
    // fetch only rejects for non-HTTP reasons: abort (caller cancel or timeout) or network down.
    if (isAbortError(err)) {
      // A timeout aborts via the internal signal; a caller cancel aborts via theirs.
      const kind: ApiErrorKind =
        timeout_signal?.aborted && !signal?.aborted ? "timeout" : "aborted";
      throw new ApiError(0, kind === "timeout" ? "Request timed out" : "Request aborted", null, kind);
    }
    throw new ApiError(0, "Network error", null, "network");
  }

  if (!response.ok) {
    const error_body = await response.json().catch(() => null);
    if (response.status === 401 && !options.suppress_unauthorized_handler) triggerUnauthorized();
    throw new ApiError(
      response.status,
      error_body?.message || response.statusText,
      error_body,
      response.status === 401 ? "auth" : "http"
    );
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
    /** Failure category — defaults to "http" for backward compatibility. */
    public kind: ApiErrorKind = "http"
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True for transient failures (network/timeout) where the caller should NOT treat the user as logged out. */
  get is_transient(): boolean {
    return this.kind === "network" || this.kind === "timeout";
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Merge multiple AbortSignals into one that fires when any input fires. */
function composeSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => s != null);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  // AbortSignal.any is supported in evergreen browsers + Node 20 (engines: >=20).
  return AbortSignal.any(present);
}

export { resolveApiUrl };
export type { ApiOptions };

// Shorthand helpers
export const api_get = <T>(url: string, params?: Record<string, string>) =>
  api<T>({ url, params });

export const api_post = <T>(url: string, data?: unknown) =>
  api<T>({ url, method: "POST", data });
