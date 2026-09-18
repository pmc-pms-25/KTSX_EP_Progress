import { ConfigError, loadConfig, parseConfig } from './config';

const VALID = {
  appName: 'PMS - PEIW',
  projectName: 'Maydan Mahzam',
  dataSource: { type: 'google-sheet', url: 'https://example.com/export?format=xlsx', sheetName: 'ALL' },
  dueSoonDays: 30,
};

describe('parseConfig', () => {
  it('accepts a valid config', () => {
    expect(parseConfig(VALID)).toEqual(VALID);
  });

  it('applies defaults for optional fields', () => {
    expect(parseConfig({ dataSource: { type: 'server', url: '/api/data' } })).toEqual({
      appName: 'PMS - PEIW',
      projectName: 'Procurement Plan',
      dataSource: { type: 'server', url: '/api/data', sheetName: undefined },
      dueSoonDays: 30,
    });
  });

  it('rejects invalid configs with readable messages', () => {
    expect(() => parseConfig(null)).toThrow(ConfigError);
    expect(() => parseConfig({})).toThrow('dataSource');
    expect(() => parseConfig({ dataSource: { type: 'ftp', url: 'x' } })).toThrow('dataSource.type');
    expect(() => parseConfig({ dataSource: { type: 'server', url: ' ' } })).toThrow('dataSource.url');
    expect(() => parseConfig({ ...VALID, dueSoonDays: 0 })).toThrow('dueSoonDays');
  });
});

describe('loadConfig', () => {
  it('fetches config.json without caching', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(VALID)));
    await expect(loadConfig(fetchImpl)).resolves.toEqual(VALID);
    expect(fetchImpl).toHaveBeenCalledWith('config.json', { cache: 'no-store' });
  });

  it('reports HTTP, network and JSON errors', async () => {
    await expect(loadConfig(async () => new Response('', { status: 404 }))).rejects.toThrow('HTTP 404');
    await expect(
      loadConfig(async () => {
        throw new TypeError('offline');
      }),
    ).rejects.toThrow('Không tải được config.json');
    await expect(loadConfig(async () => new Response('{oops'))).rejects.toThrow('JSON');
  });
});
