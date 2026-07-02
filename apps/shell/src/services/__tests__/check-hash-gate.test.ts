import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.fn();
vi.mock('@mf2/shared-store', () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import { md5Content, normalizeHashPath, verifySmitConnectHashGate } from '../check-hash-gate';

type RuntimeMessage = {
  cmd?: string;
  function?: string;
  parameter?: unknown;
  args?: unknown;
  url?: string;
};

function installRuntime(handler: (message: RuntimeMessage) => unknown): void {
  const runtime = {
    lastError: undefined as { message?: string } | undefined,
    sendMessage: (_extensionId: string, message: unknown, callback: (response: unknown) => void) => {
      runtime.lastError = undefined;
      callback(handler(message as RuntimeMessage));
    },
  };
  vi.stubGlobal('chrome', { runtime });
}

beforeEach(() => {
  apiMock.mockReset();
  vi.unstubAllGlobals();
});

describe('normalizeHashPath', () => {
  it('removes the legacy dist prefix only when present', () => {
    expect(normalizeHashPath('dist/background.js')).toBe('background.js');
    expect(normalizeHashPath('icons/logo.png')).toBe('icons/logo.png');
  });
});

describe('verifySmitConnectHashGate', () => {
  it('returns extension_missing when chrome runtime is unavailable', async () => {
    const result = await verifySmitConnectHashGate();

    expect(result.status).toBe('extension_missing');
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('returns api_error when the gateway check fails', async () => {
    const messages: RuntimeMessage[] = [];
    installRuntime((message) => {
      messages.push(message);
      if (message.function === 'chrome.runtime.getManifest') {
        return { manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' };
      }
      return null;
    });
    apiMock.mockRejectedValueOnce(new Error('network'));

    const result = await verifySmitConnectHashGate();

    expect(result.status).toBe('api_error');
    expect(apiMock).toHaveBeenCalledWith({
      url: '/public/tools/check-hash',
      method: 'POST',
      data: { manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' },
    });
    expect(messages).toContainEqual(
      expect.objectContaining({
        cmd: 'execute',
        function: 'chrome.runtime.getManifest',
        parameter: false,
      })
    );
    expect(messages.find((message) => message.function === 'chrome.runtime.getManifest' && 'args' in message)).toBeUndefined();
  });

  it('posts the manifest when manifest_version is missing', async () => {
    installRuntime((message) => {
      if (message.function === 'chrome.runtime.getManifest') {
        return { name: 'SMIT Connect', version: '1.0.0' };
      }
      return null;
    });
    apiMock.mockResolvedValueOnce({ success: true, fileHash: [] });

    const result = await verifySmitConnectHashGate();

    expect(result).toEqual({ status: 'valid' });
    expect(apiMock).toHaveBeenCalledWith({
      url: '/public/tools/check-hash',
      method: 'POST',
      data: { name: 'SMIT Connect', version: '1.0.0' },
    });
  });

  it('posts the manifest when manifest_version is returned as a string', async () => {
    installRuntime((message) => {
      if (message.function === 'chrome.runtime.getManifest') {
        return { manifest_version: '3', name: 'SMIT Connect', version: '1.0.0' };
      }
      return null;
    });
    apiMock.mockResolvedValueOnce({ success: true, fileHash: [] });

    const result = await verifySmitConnectHashGate();

    expect(result).toEqual({ status: 'valid' });
    expect(apiMock).toHaveBeenCalledWith({
      url: '/public/tools/check-hash',
      method: 'POST',
      data: { manifest_version: '3', name: 'SMIT Connect', version: '1.0.0' },
    });
  });

  it('returns extension_error when extension file reads fail', async () => {
    installRuntime((message) => {
      if (message.function === 'chrome.runtime.getManifest') {
        return { manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' };
      }
      if (message.function === 'chrome.runtime.getURL') return 'chrome-extension://ext/background.js';
      if (message.cmd === 'fetch') return { error: true, message: 'missing' };
      return null;
    });
    apiMock.mockResolvedValueOnce({
      success: true,
      fileHash: [{ path: 'dist/background.js', hash: md5Content('content') }],
    });

    const result = await verifySmitConnectHashGate();

    expect(result.status).toBe('extension_error');
  });

  it('returns hash_mismatch with mismatched paths', async () => {
    installRuntime((message) => {
      if (message.function === 'chrome.runtime.getManifest') {
        return { manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' };
      }
      if (message.function === 'chrome.runtime.getURL') return `chrome-extension://ext/${message.args}`;
      if (message.cmd === 'fetch') return 'actual content';
      return null;
    });
    apiMock.mockResolvedValueOnce({
      success: true,
      fileHash: [{ path: 'dist/background.js', hash: md5Content('expected content') }],
    });

    const result = await verifySmitConnectHashGate();

    expect(result.status).toBe('hash_mismatch');
    expect(result.mismatches).toEqual([
      {
        path: 'background.js',
        expected: md5Content('expected content'),
        actual: md5Content('actual content'),
      },
    ]);
  });

  it('returns valid when all file hashes match', async () => {
    installRuntime((message) => {
      if (message.function === 'chrome.runtime.getManifest') {
        return { manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' };
      }
      if (message.function === 'chrome.runtime.getURL') return `chrome-extension://ext/${message.args}`;
      if (message.cmd === 'fetch') return 'file content';
      return null;
    });
    apiMock.mockResolvedValueOnce({
      success: true,
      fileHash: [{ path: 'dist/background.js', hash: md5Content('file content') }],
    });

    const result = await verifySmitConnectHashGate();

    expect(result).toEqual({ status: 'valid' });
  });

  it('returns valid through the Firefox $endMessage extension bridge', async () => {
    const messages: RuntimeMessage[] = [];
    vi.stubGlobal('$endMessage', (...args: unknown[]) => {
      if (typeof args[0] === 'string') {
        const message = args[1] as RuntimeMessage;
        const callback = args[2] as (response: unknown) => void;
        messages.push(message);
        callback({ manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' });
        return undefined;
      }

      const message = args[0] as RuntimeMessage;
      messages.push(message);
      if (message.function === 'chrome.runtime.getManifest') {
        return Promise.resolve({ manifest_version: 3, name: 'SMIT Connect', version: '1.0.0' });
      }
      if (message.function === 'chrome.runtime.getURL') {
        return Promise.resolve(`moz-extension://ext/${message.args}`);
      }
      if (message.cmd === 'fetch') return Promise.resolve('file content');
      return Promise.resolve(null);
    });
    apiMock.mockResolvedValueOnce({
      success: true,
      fileHash: [{ path: 'dist/background.js', hash: md5Content('file content') }],
    });

    const result = await verifySmitConnectHashGate();

    expect(result).toEqual({ status: 'valid' });
    expect(messages).toContainEqual(
      expect.objectContaining({
        cmd: 'execute',
        function: 'chrome.runtime.getManifest',
        parameter: false,
      })
    );
    expect(messages.find((message) => message.function === 'chrome.runtime.getManifest' && 'args' in message)).toBeUndefined();
    expect(messages).toContainEqual(
      expect.objectContaining({
        cmd: 'fetch',
        url: 'moz-extension://ext/background.js',
      })
    );
  });
});
