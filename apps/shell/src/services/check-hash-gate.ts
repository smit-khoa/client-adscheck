import { md5 } from 'js-md5';
import { api } from '@mf2/shared-store';
import { detectExtension, executeExtension, fetchExtensionFile } from './smit-connect-extension';

export type CheckHashGateStatus =
  | 'valid'
  | 'extension_missing'
  | 'api_error'
  | 'extension_error'
  | 'hash_mismatch';

export interface CheckHashGateMismatch {
  path: string;
  expected: string;
  actual: string;
}

export interface CheckHashGateResult {
  status: CheckHashGateStatus;
  message?: string;
  mismatches?: CheckHashGateMismatch[];
}

interface ExtensionManifest {
  manifest_version?: number | string;
  name?: string;
  version?: string;
}

interface CheckHashResponse {
  success?: boolean;
  fileHash?: Array<{ path?: string; hash?: string }>;
  message?: string;
}

interface CheckHashManifestPayload {
  manifest_version?: number | string;
  name: string;
  version?: string;
}

const LOG_PREFIX = '[CheckHashGate]';

export function normalizeHashPath(path: string): string {
  return path.includes('dist/') ? path.replace('dist/', '') : path;
}

export function md5Content(content: string): string {
  return md5(content);
}

function toCheckHashManifestPayload(manifest: ExtensionManifest): CheckHashManifestPayload | null {
  const { manifest_version, name, version } = manifest;
  if (!name) return null;
  return {
    ...(manifest_version != null && manifest_version !== '' ? { manifest_version } : {}),
    name,
    ...(version ? { version } : {}),
  };
}

export async function verifySmitConnectHashGate(): Promise<CheckHashGateResult> {
  const extension = await detectExtension(true);
  if (!extension) {
    return {
      status: 'extension_missing',
      message: 'Không tìm thấy extension SMIT Connect. Hãy cài, bật extension rồi thử lại.',
    };
  }

  const manifest = await executeExtension<ExtensionManifest>('chrome.runtime.getManifest');
  if (!manifest) {
    return {
      status: 'extension_error',
      message: 'Không đọc được thông tin extension SMIT Connect. Hãy tải lại extension rồi thử lại.',
    };
  }
  const manifestPayload = toCheckHashManifestPayload(manifest);
  if (!manifestPayload) {
    return {
      status: 'extension_error',
      message: 'Thông tin extension SMIT Connect không hợp lệ. Hãy tải lại extension rồi thử lại.',
    };
  }

  let response: CheckHashResponse;
  try {
    response = await api<CheckHashResponse>({
      url: '/public/tools/check-hash',
      method: 'POST',
      data: manifestPayload,
    });
  } catch (error) {
    return {
      status: 'api_error',
      message: 'Không kiểm tra được phiên bản SMIT Connect với máy chủ. Hãy thử lại.',
    };
  }

  if (!response.success || !Array.isArray(response.fileHash)) {
    return {
      status: 'api_error',
      message: response.message || 'Máy chủ chưa trả về danh sách file cần kiểm tra.',
    };
  }

  const mismatches: CheckHashGateMismatch[] = [];
  try {
    await Promise.all(
      response.fileHash.map(async (item) => {
        if (!item.path || !item.hash) throw new Error('Invalid hash entry');
        const path = normalizeHashPath(item.path);
        const url = await executeExtension<string>('chrome.runtime.getURL', path);
        if (!url) throw new Error('Extension URL unavailable');
        const content = await fetchExtensionFile(url);
        const actual = md5Content(content);
        if (actual !== item.hash) {
          mismatches.push({ path, expected: item.hash, actual });
          return;
        }
      })
    );
  } catch (error) {
    return {
      status: 'extension_error',
      message: 'Không đọc được file trong extension SMIT Connect. Hãy tải lại extension rồi thử lại.',
    };
  }

  if (mismatches.length > 0) {
    return {
      status: 'hash_mismatch',
      message: 'Extension SMIT Connect không khớp phiên bản máy chủ. Hãy cập nhật hoặc cài lại extension.',
      mismatches,
    };
  }

  return { status: 'valid' };
}
