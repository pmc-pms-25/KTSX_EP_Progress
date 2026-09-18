import type { DataSourceConfig } from '../../config/config';

/** Anything that can hand back the workbook bytes. The rest of the app never knows where they came from. */
export interface DataSource {
  readonly label: string;
  load(signal?: AbortSignal): Promise<ArrayBuffer>;
}

export type SourceErrorCode = 'NETWORK' | 'TIMEOUT' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'NOT_XLSX' | 'HTTP' | 'ABORTED';

export class SourceError extends Error {
  readonly code: SourceErrorCode;
  readonly status?: number;
  constructor(code: SourceErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SourceError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/** Turn a Google Sheets edit/share link into its XLSX export URL; other URLs pass through. */
export function toGoogleExportUrl(url: string): string {
  const match = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  if (!match || /\/export\?/.test(url) || /\/pub\?/.test(url)) return url;
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
}

interface HttpSourceOptions {
  label: string;
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Fetch an XLSX over HTTP with timeout, abort and clear error classification. */
export function createHttpXlsxSource({ label, url, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: HttpSourceOptions): DataSource {
  return {
    label,
    async load(signal) {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);
      try {
        let response: Response;
        try {
          response = await fetchImpl(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
        } catch {
          if (timedOut) throw new SourceError('TIMEOUT', `Hết thời gian chờ (${timeoutMs / 1000}s) khi tải dữ liệu.`);
          if (signal?.aborted) throw new SourceError('ABORTED', 'Đã hủy tải dữ liệu.');
          throw new SourceError('NETWORK', 'Không kết nối được tới nguồn dữ liệu. Kiểm tra kết nối internet của máy bạn.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new SourceError('ACCESS_DENIED', 'Nguồn dữ liệu từ chối truy cập. Sheet có thể không còn được chia sẻ công khai.', response.status);
        }
        if (response.status === 404) {
          throw new SourceError('NOT_FOUND', 'Không tìm thấy nguồn dữ liệu (HTTP 404). Kiểm tra lại URL trong config.json.', 404);
        }
        if (!response.ok) {
          throw new SourceError('HTTP', `Nguồn dữ liệu trả lỗi HTTP ${response.status}.`, response.status);
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('text/html')) {
          throw new SourceError('ACCESS_DENIED', 'Nguồn dữ liệu trả về trang web thay vì file Excel. Sheet có thể yêu cầu đăng nhập.');
        }
        let buf: ArrayBuffer;
        try {
          buf = await response.arrayBuffer();
        } catch {
          if (timedOut) throw new SourceError('TIMEOUT', `Hết thời gian chờ (${timeoutMs / 1000}s) khi tải dữ liệu.`);
          if (signal?.aborted) throw new SourceError('ABORTED', 'Đã hủy tải dữ liệu.');
          throw new SourceError('NETWORK', 'Mất kết nối khi đang tải dữ liệu.');
        }
        const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
        if (head.length < 2 || head[0] !== 0x50 || head[1] !== 0x4b) {
          throw new SourceError('NOT_XLSX', 'Dữ liệu tải về không phải file Excel (XLSX).');
        }
        return buf;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}

export function createDataSource(config: DataSourceConfig, fetchImpl?: typeof fetch): DataSource {
  if (config.type === 'google-sheet') {
    return createHttpXlsxSource({ label: 'Google Sheet', url: toGoogleExportUrl(config.url), fetchImpl });
  }
  return createHttpXlsxSource({ label: 'Server', url: config.url, fetchImpl });
}
