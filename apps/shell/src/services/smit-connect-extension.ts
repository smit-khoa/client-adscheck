// Minimal shell-local SMIT Connect proxy for startup integrity checks.

interface ExtensionConfig {
  id: string;
  key: string;
}

interface ChromeRuntime {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ) => void;
  lastError?: { message?: string } | undefined;
}

interface FirefoxEndMessage {
  (extensionId: string, message: unknown, callback: (response: unknown) => void): void;
  (message: unknown): Promise<unknown>;
}

const EXTENSIONS: ExtensionConfig[] = [
  { id: 'nmnnilimjhkbdmnpojpbihmnphkneckf', key: 'TxcaKt4q*yTFF3AP2wHpkGaGVqPf5#%RGW9C' },
  { id: 'pbopgcieknieefieonimgmbahalnnjnl', key: 'oHjOcejCIXMUDYnE3Ru4kjdpG2mUSs2GDSLaoqDDiPU=' },
  { id: 'mkioennpdihocmahmgaeekhpoacfilcn', key: 'oHjOcejCIXMUDYnE3Ru4kjdpG2mUSs2GDSLaoqDDiPU=' },
];

let currentExtension: ExtensionConfig | null = null;

const LOG_PREFIX = '[SMIT Connect]';

function sanitizeMessage(message: unknown): unknown {
  if (!message || typeof message !== 'object') return message;
  return { ...(message as Record<string, unknown>), key: '[redacted]' };
}

function getChromeRuntime(): ChromeRuntime | null {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  const hasRuntime = typeof runtime?.sendMessage === 'function';
  return hasRuntime ? runtime : null;
}

function getFirefoxEndMessage(): FirefoxEndMessage | null {
  const endMessage = (globalThis as { $endMessage?: FirefoxEndMessage }).$endMessage;
  const available = typeof endMessage === 'function';
  return available ? endMessage : null;
}

function sendExtensionMessage<T>(
  runtime: ChromeRuntime,
  ext: ExtensionConfig,
  message: unknown,
  timeoutMs = 500
): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    try {
      runtime.sendMessage(ext.id, message, (response) => {
        clearTimeout(timeout);
        if (runtime.lastError) {
          return resolve(null);
        }
        resolve((response as T) ?? null);
      });
    } catch (error) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

function sendFirefoxProbeMessage<T>(
  endMessage: FirefoxEndMessage,
  ext: ExtensionConfig,
  message: unknown,
  timeoutMs = 200
): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    try {
      endMessage(ext.id, message, (response) => {
        clearTimeout(timeout);
        resolve((response as T) ?? null);
      });
    } catch (error) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

async function sendFirefoxMessage<T>(
  endMessage: FirefoxEndMessage,
  message: unknown
): Promise<T | null> {
  try {
    const response = await endMessage(message);
    return (response as T) ?? null;
  } catch (error) {
    return null;
  }
}

async function testExtension(ext: ExtensionConfig): Promise<boolean> {
  const message = { key: ext.key, cmd: 'execute', function: 'chrome.runtime.getManifest', parameter: false };
  const runtime = getChromeRuntime();
  const endMessage = runtime ? null : getFirefoxEndMessage();
  const manifest = runtime
    ? await sendExtensionMessage<{ name?: string; version?: string }>(runtime, ext, message, 200)
    : endMessage
      ? await sendFirefoxProbeMessage<{ name?: string; version?: string }>(endMessage, ext, message, 200)
      : null;
  const detected = Boolean(manifest && (manifest.name || manifest.version));
  return detected;
}

export async function detectExtension(forceRedetect = false): Promise<ExtensionConfig | null> {
  if (currentExtension && !forceRedetect) {
    return currentExtension;
  }
  currentExtension = null;
  const runtime = getChromeRuntime();
  const endMessage = runtime ? null : getFirefoxEndMessage();
  if (!runtime && !endMessage) {
    return null;
  }

  for (const ext of EXTENSIONS) {
    if (await testExtension(ext)) {
      currentExtension = ext;
      break;
    }
  }
  return currentExtension;
}

export async function executeExtension<T>(fnName: string, args?: unknown): Promise<T | null> {
  const runtime = getChromeRuntime();
  const endMessage = runtime ? null : getFirefoxEndMessage();
  const ext = await detectExtension();
  if ((!runtime && !endMessage) || !ext) {
    return null;
  }

  const message = {
    key: ext.key,
    cmd: 'execute',
    function: fnName,
    parameter: false,
    ...(args !== undefined ? { args } : {}),
  };
  const response = runtime
    ? await sendExtensionMessage<T>(runtime, ext, message)
    : await sendFirefoxMessage<T>(endMessage as FirefoxEndMessage, message);
  return response;
}

export async function fetchExtensionFile(url: string, options: RequestInit = {}): Promise<string> {
  const runtime = getChromeRuntime();
  const endMessage = runtime ? null : getFirefoxEndMessage();
  const ext = await detectExtension();
  if ((!runtime && !endMessage) || !ext) {
    throw new Error('Không tìm thấy extension SMIT Connect.');
  }

  if (!runtime) {
    const response = await sendFirefoxMessage<unknown>(endMessage as FirefoxEndMessage, {
      cmd: 'fetch',
      url,
      options,
      key: ext.key,
    });
    if (typeof response === 'string') return response;
    if (response && typeof response === 'object') {
      const body = response as { error?: boolean; message?: string };
      if (body.error) throw new Error(body.message || 'Extension fetch failed');
    }
    return String(response ?? '');
  }

  return new Promise((resolve, reject) => {
    runtime.sendMessage(
      ext.id,
      { cmd: 'fetch', url, options, key: ext.key },
      (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message || 'Extension error'));
          return;
        }
        if (typeof response === 'string') {
          return resolve(response);
        }
        if (response && typeof response === 'object') {
          const body = response as { error?: boolean; message?: string };
          if (body.error) {
            reject(new Error(body.message || 'Extension fetch failed'));
            return;
          }
        }
        const content = String(response ?? '');
        resolve(content);
      }
    );
  });
}
