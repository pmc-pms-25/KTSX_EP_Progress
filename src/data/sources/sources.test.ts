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

  it('classifies network failures, timeouts and caller aborts', async () => {
    const failing = createHttpXlsxSource({
      label: 'T',
      url: 'u',
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(await codeOf(failing.load())).toBe('NETWORK');

    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    expect(await codeOf(createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: hanging, timeoutMs: 10 }).load())).toBe('TIMEOUT');

    const controller = new AbortController();
    const pending = createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: hanging }).load(controller.signal);
    controller.abort();
    expect(await codeOf(pending)).toBe('ABORTED');
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
