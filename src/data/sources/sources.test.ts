import { translate } from '../../i18n/translate';
import { createDataSource, createHttpXlsxSource, SourceError, toGoogleExportUrl } from './sources';

const XLSX_BYTES = new Uint8Array([0x50, 0x4b, 3, 4]);
const xlsxResponse = () => new Response(XLSX_BYTES, { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (e) {
    return e instanceof SourceError ? e.code : 'OTHER';
  }
  return undefined;
}

async function errorOf(promise: Promise<unknown>): Promise<SourceError> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof SourceError) return e;
  }
  throw new Error('expected a SourceError');
}

describe('toGoogleExportUrl', () => {
  it('converts edit links to the XLSX export URL', () => {
    expect(toGoogleExportUrl('https://docs.google.com/spreadsheets/d/abc_123-X/edit?gid=0#gid=0')).toBe(
      'https://docs.google.com/spreadsheets/d/abc_123-X/export?format=xlsx',
    );
  });

  it('leaves export, publish and non-Google URLs unchanged', () => {
    const exportUrl = 'https://docs.google.com/spreadsheets/d/abc/export?format=xlsx';
    expect(toGoogleExportUrl(exportUrl)).toBe(exportUrl);
    expect(toGoogleExportUrl('https://docs.google.com/spreadsheets/d/e/abc/pub?output=xlsx')).toContain('/pub?');
    expect(toGoogleExportUrl('/api/data')).toBe('/api/data');
  });
});

describe('createHttpXlsxSource', () => {
  it('returns the workbook bytes', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => xlsxResponse());
    const source = createHttpXlsxSource({ label: 'T', url: 'https://x/file', fetchImpl });
    const buf = await source.load();
    expect(new Uint8Array(buf)).toEqual(XLSX_BYTES);
    expect(fetchImpl).toHaveBeenCalledWith('https://x/file', expect.objectContaining({ cache: 'no-store', credentials: 'omit' }));
  });

  it('classifies HTTP and content failures', async () => {
    const make = (response: Response) => createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: async () => response }).load();
    expect(await codeOf(make(new Response('', { status: 401 })))).toBe('ACCESS_DENIED');
    expect(await codeOf(make(new Response('', { status: 404 })))).toBe('NOT_FOUND');
    expect(await codeOf(make(new Response('', { status: 500 })))).toBe('HTTP');
    expect(await codeOf(make(new Response('<html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })))).toBe(
      'ACCESS_DENIED',
    );
    expect(await codeOf(make(new Response('a,b,c', { headers: { 'content-type': 'text/csv' } })))).toBe('NOT_XLSX');
  });

  it('keeps the Vietnamese wording for each error condition', async () => {
    const make = (response: Response) => createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: async () => response }).load();
    const accessDenied = await errorOf(make(new Response('', { status: 401 })));
    expect(translate('vi', accessDenied.detail)).toBe('Nguồn dữ liệu từ chối truy cập. Sheet có thể không còn được chia sẻ công khai.');
    const notFound = await errorOf(make(new Response('', { status: 404 })));
    expect(translate('vi', notFound.detail)).toBe('Không tìm thấy nguồn dữ liệu (HTTP 404). Kiểm tra lại URL trong config.json.');
    const http = await errorOf(make(new Response('', { status: 500 })));
    expect(translate('vi', http.detail)).toBe('Nguồn dữ liệu trả lỗi HTTP 500.');
    const htmlBody = await errorOf(make(new Response('<html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })));
    expect(translate('vi', htmlBody.detail)).toBe('Nguồn dữ liệu trả về trang web thay vì file Excel. Sheet có thể yêu cầu đăng nhập.');
    const notXlsx = await errorOf(make(new Response('a,b,c', { headers: { 'content-type': 'text/csv' } })));
    expect(translate('vi', notXlsx.detail)).toBe('Dữ liệu tải về không phải file Excel (XLSX).');
  });

  it('classifies network failures, timeouts and caller aborts', async () => {
    const failing = createHttpXlsxSource({
      label: 'T',
      url: 'u',
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(await codeOf(failing.load())).toBe('NETWORK');
    expect(translate('vi', (await errorOf(failing.load())).detail)).toBe(
      'Không kết nối được tới nguồn dữ liệu. Kiểm tra kết nối internet của máy bạn.',
    );

    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    const timeout = await errorOf(createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: hanging, timeoutMs: 10 }).load());
    expect(timeout.code).toBe('TIMEOUT');
    expect(translate('vi', timeout.detail)).toBe(`Hết thời gian chờ (${(10 / 1000).toLocaleString('vi-VN')}s) khi tải dữ liệu.`);

    const controller = new AbortController();
    const pending = createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: hanging }).load(controller.signal);
    controller.abort();
    const aborted = await errorOf(pending);
    expect(aborted.code).toBe('ABORTED');
    expect(translate('vi', aborted.detail)).toBe('Đã hủy tải dữ liệu.');
  });

  it('classifies a timeout while still reading the response body', async () => {
    // The response headers resolve fine, but arrayBuffer() hangs until the caller's signal aborts —
    // a ReadableStream that never enqueues would do the same but is awkward to build in jsdom.
    const fetchImpl: typeof fetch = async (_url, init) =>
      ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      }) as unknown as Response;
    expect(await codeOf(createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl, timeoutMs: 10 }).load())).toBe('TIMEOUT');
  });

  it('classifies a lost connection while reading the response body', async () => {
    const fetchImpl: typeof fetch = async () =>
      ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: () => Promise.reject(new TypeError('network error')),
      }) as unknown as Response;
    const error = await errorOf(createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl }).load());
    expect(error.code).toBe('NETWORK');
    expect(translate('vi', error.detail)).toBe('Mất kết nối khi đang tải dữ liệu.');
  });
});

describe('createDataSource', () => {
  it('builds a Google Sheet source from an edit link', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => xlsxResponse());
    const source = createDataSource({ type: 'google-sheet', url: 'https://docs.google.com/spreadsheets/d/ID/edit' }, fetchImpl);
    expect(source.label).toBe('Google Sheet');
    await source.load();
    expect(fetchImpl.mock.calls[0][0]).toBe('https://docs.google.com/spreadsheets/d/ID/export?format=xlsx');
  });

  it('builds a server source', () => {
    expect(createDataSource({ type: 'server', url: '/api/data' }).label).toBe('Server');
  });
});
