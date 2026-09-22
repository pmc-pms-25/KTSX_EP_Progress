import { translate } from '../i18n/translate';
import { ConfigError, loadConfig, parseConfig } from './config';

const VALID = {
  appName: 'PMS - PEIW',
  projectName: 'Maydan Mahzam',
  dataSources: {
    procurement: { type: 'google-sheet', url: 'https://example.com/export?format=xlsx', sheetName: 'ALL' },
    engineering: { type: 'server', url: 'data/engineering.xlsx', sheetName: undefined },
  },
  dueSoonDays: 30,
};

describe('parseConfig', () => {
  it('accepts a valid config', () => {
    expect(parseConfig(VALID)).toEqual(VALID);
  });

  it('applies defaults for optional fields', () => {
    expect(parseConfig({ dataSources: { procurement: { type: 'server', url: '/api/data' } } })).toEqual({
      appName: 'PMS - PEIW',
      projectName: 'Procurement Plan',
      dataSources: { procurement: { type: 'server', url: '/api/data', sheetName: undefined } },
      dueSoonDays: 30,
    });
  });

  it('reads a default facility for a source', () => {
    const cfg = parseConfig({ dataSources: { procurement: { type: 'server', url: '/p', defaultFacility: ' MMI06C ' } } });
    expect(cfg.dataSources.procurement?.defaultFacility).toBe('MMI06C');
    const blank = parseConfig({ dataSources: { procurement: { type: 'server', url: '/p', defaultFacility: 3 } } });
    expect(blank.dataSources.procurement?.defaultFacility).toBeUndefined();
  });

  it('reads the legacy single "dataSource" as the procurement source', () => {
    expect(parseConfig({ dataSource: { type: 'server', url: '/api/data' } }).dataSources).toEqual({
      procurement: { type: 'server', url: '/api/data', sheetName: undefined },
    });
  });

  it('prefers dataSources.procurement over the legacy key', () => {
    const cfg = parseConfig({ dataSource: { type: 'server', url: '/old' }, dataSources: { procurement: { type: 'server', url: '/new' } } });
    expect(cfg.dataSources.procurement?.url).toBe('/new');
  });

  it('ignores unknown module keys and allows a module without a source', () => {
    const cfg = parseConfig({ dataSources: { procurement: { type: 'server', url: '/p' }, weird: { type: 'server', url: '/w' } } });
    expect(cfg.dataSources).toEqual({ procurement: { type: 'server', url: '/p', sheetName: undefined } });
  });

  it('rejects invalid configs with readable messages naming the module', () => {
    expect(() => parseConfig(null)).toThrow(ConfigError);
    expect(() => parseConfig({})).toThrow('dataSources');
    expect(() => parseConfig({ dataSources: {} })).toThrow('dataSources');
    expect(() => parseConfig({ dataSources: { engineering: 'x' } })).toThrow('dataSources.engineering');
    expect(() => parseConfig({ dataSources: { engineering: { type: 'ftp', url: 'x' } } })).toThrow('dataSources.engineering.type');
    expect(() => parseConfig({ dataSource: { type: 'server', url: ' ' } })).toThrow('dataSources.procurement.url');
    expect(() => parseConfig({ ...VALID, dueSoonDays: 0 })).toThrow('dueSoonDays');
  });

  it('translates source errors in Vietnamese', () => {
    try {
      parseConfig({ dataSources: { engineering: { type: 'server', url: '' } } });
    } catch (e) {
      expect(translate('vi', (e as ConfigError).detail)).toBe('Thiếu "dataSources.engineering.url" trong config.json.');
    }
    expect.assertions(1);
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

    async function captureError(fetchImpl: typeof fetch): Promise<ConfigError> {
      try {
        await loadConfig(fetchImpl);
        throw new Error('expected loadConfig to throw');
      } catch (e) {
        if (e instanceof ConfigError) return e;
        throw e;
      }
    }

    const networkError = await captureError(async () => {
      throw new TypeError('offline');
    });
    expect(translate('vi', networkError.detail)).toBe('Không tải được config.json từ server.');
    const jsonError = await captureError(async () => new Response('{oops'));
    expect(translate('vi', jsonError.detail)).toBe('config.json không phải JSON hợp lệ.');
  });
});
