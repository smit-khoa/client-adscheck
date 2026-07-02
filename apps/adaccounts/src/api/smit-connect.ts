import type { ExtFetchOptions } from './types';

// Proxy layer to the SMIT Connect browser extension. Ported from the adscheck
// Adscheck.js reference. All FB calls go through the extension's background
// `fetch` (credentials:include) so cookies are borrowed and CORS is bypassed —
// the page never calls graph.facebook.com directly.

interface ExtensionConfig {
  id: string;
  key: string;
}

// Known SMIT Connect extension ids + their message keys. Hardcoded to match the
// existing SMIT apps (global.js / Adscheck.js). Detection picks whichever is
// installed.
const EXTENSIONS: ExtensionConfig[] = [
  { id: 'nmnnilimjhkbdmnpojpbihmnphkneckf', key: 'TxcaKt4q*yTFF3AP2wHpkGaGVqPf5#%RGW9C' },
  { id: 'pbopgcieknieefieonimgmbahalnnjnl', key: 'oHjOcejCIXMUDYnE3Ru4kjdpG2mUSs2GDSLaoqDDiPU=' },
  { id: 'mkioennpdihocmahmgaeekhpoacfilcn', key: 'oHjOcejCIXMUDYnE3Ru4kjdpG2mUSs2GDSLaoqDDiPU=' },
];

// Minimal shape of the Chrome extension messaging API we rely on.
interface ChromeRuntime {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ) => void;
  lastError?: { message?: string } | undefined;
}

function getChromeRuntime(): ChromeRuntime | null {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  return typeof runtime?.sendMessage === 'function' ? runtime : null;
}

let currentExtension: ExtensionConfig | null = null;

// Probe one extension by asking for its manifest; resolves false on timeout or error.
function testExtension(runtime: ChromeRuntime, ext: ExtensionConfig): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 200);
    try {
      runtime.sendMessage(
        ext.id,
        { key: ext.key, cmd: 'execute', function: 'chrome.runtime.getManifest', parameter: false },
        (response) => {
          clearTimeout(timeout);
          if (runtime.lastError) return resolve(false);
          const r = response as { name?: string; version?: string } | null;
          resolve(Boolean(r && (r.name || r.version)));
        }
      );
    } catch {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

async function detectExtension(forceRedetect = false): Promise<ExtensionConfig | null> {
  if (currentExtension && !forceRedetect) return currentExtension;
  currentExtension = null;
  const runtime = getChromeRuntime();
  if (!runtime) return null;
  for (const ext of EXTENSIONS) {
    if (await testExtension(runtime, ext)) {
      currentExtension = ext;
      break;
    }
  }
  return currentExtension;
}

// Run an extension `execute` command (calls a function inside the extension,
// e.g. chrome.storage.local.get/set). Resolves null on any failure so callers
// can treat the extension store as best-effort. Mirrors the v6 adscheck
// smitConnectSend({ cmd: 'execute', function, args }) shape.
function extExecute<T>(fnName: string, args: unknown): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    void detectExtension().then((ext) => {
      const runtime = getChromeRuntime();
      if (!runtime || !ext) return resolve(null);
      try {
        runtime.sendMessage(
          ext.id,
          { key: ext.key, cmd: 'execute', function: fnName, args },
          (response) => {
            if (runtime.lastError) return resolve(null);
            resolve((response as T) ?? null);
          }
        );
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Read one key from the extension's chrome.storage.local. The extension returns
 * a `{ [key]: value }` object (chrome.storage semantics); we unwrap to the value.
 * Returns null when missing or the extension is unavailable.
 */
export async function extStorageGet<T>(key: string): Promise<T | null> {
  const res = await extExecute<Record<string, T>>('chrome.storage.local.get', key);
  return res && key in res ? (res[key] ?? null) : null;
}

/** Write key/value pairs into the extension's chrome.storage.local. */
export async function extStorageSet(items: Record<string, unknown>): Promise<void> {
  await extExecute<unknown>('chrome.storage.local.set', items);
}

/** Remove keys from the extension's chrome.storage.local. */
export async function extStorageRemove(keys: string | string[]): Promise<void> {
  await extExecute<unknown>('chrome.storage.local.remove', keys);
}

/**
 * Fetch a URL through the extension's background `fetch`. Returns the response
 * body as a string (caller parses). Throws a clear Error when no extension is
 * available so batch runners can surface "extension not installed" per row.
 */
export async function extFetch(url: string, options: ExtFetchOptions = {}): Promise<string> {
  const runtime = getChromeRuntime();
  const ext = await detectExtension();
  if (!runtime || !ext) {
    throw new Error('Không tìm thấy extension SMIT Connect. Hãy cài và bật extension.');
  }

  // Move params into the query string (the extension fetch reads url only).
  let finalUrl = url;
  const opts: ExtFetchOptions = { ...options };
  if (opts.params) {
    const qs = new URLSearchParams(
      Object.entries(opts.params).map(([k, v]) => [k, String(v)])
    ).toString();
    finalUrl = url + (url.includes('?') ? '&' : '?') + qs;
    delete opts.params;
  }
  if (opts.method === 'GET') delete opts.body;

  return new Promise<string>((resolve, reject) => {
    runtime.sendMessage(
      ext.id,
      { cmd: 'fetch', url: finalUrl, options: opts, key: ext.key },
      (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message || 'Extension error'));
          return;
        }
        // Background returns the body as text; some error paths return an object.
        if (typeof response === 'string') return resolve(response);
        if (response && typeof response === 'object') {
          const r = response as { error?: boolean; message?: string };
          if (r.error) return reject(new Error(r.message || 'Extension fetch failed'));
        }
        resolve(String(response ?? ''));
      }
    );
  });
}
