import { ConfigError } from '../config/config';
import type { AppConfig } from '../config/config';
import { parsePlan } from '../data/parser/parsePlan';
import { SourceError, type DataSource } from '../data/sources/sources';
import { msg } from '../i18n/message';
import { translate } from '../i18n/translate';
import { dayFromISO } from '../lib/day';
import { sampleWorkbook } from '../test/fixtures';
import { createAppStore, type StoreDeps } from './appStore';

const CONFIG: AppConfig = {
  appName: 'PMS - PEIW',
  projectName: 'Test Project',
  dataSources: { procurement: { type: 'google-sheet', url: 'https://x' } },
  dueSoonDays: 30,
};

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

function deps(overrides: Partial<StoreDeps> = {}, load: DataSource['load'] = async () => sampleWorkbook()): StoreDeps {
  return {
    loadConfig: async () => CONFIG,
    createDataSource: () => ({ label: 'Test', load }),
    parsePlan,
    now: () => new Date(2026, 8, 18),
    storage: memoryStorage(),
    ...overrides,
  };
}

describe('appStore', () => {
  it('loads config, fetches, parses and computes metrics', async () => {
    const store = createAppStore(deps());
    expect(store.getState().status).toBe('idle');
    await store.getState().load();
    const s = store.getState();
    expect(s.status).toBe('ready');
    expect(s.step).toBe('done');
    expect(s.stepDetail).toEqual(msg('status.linesLoaded', { count: 6 }));
    expect(translate('vi', s.stepDetail!)).toBe('6 dòng');
    expect(s.plan?.lines).toHaveLength(6);
    expect(s.metrics).toHaveLength(6);
    expect(s.cutOff).toBe(dayFromISO('2026-09-18'));
  });

  it('reports source errors when nothing is loaded yet', async () => {
    const store = createAppStore(
      deps({}, async () => {
        throw new SourceError('ACCESS_DENIED', msg('error.source.accessDenied'), 403);
      }),
    );
    await store.getState().load();
    const { error } = store.getState();
    expect(store.getState().status).toBe('error');
    expect(error).toMatchObject({ code: 'ACCESS_DENIED' });
    expect(translate('vi', error!.title)).toBe('Không tải được dữ liệu');
    expect(translate('vi', error!.detail)).toBe('Nguồn dữ liệu từ chối truy cập. Sheet có thể không còn được chia sẻ công khai.');
  });

  it('reports parse errors', async () => {
    const store = createAppStore(deps({}, async () => new TextEncoder().encode('nope').buffer as ArrayBuffer));
    await store.getState().load();
    const { error } = store.getState();
    expect(store.getState().status).toBe('error');
    expect(error).toMatchObject({ code: 'NOT_XLSX' });
    expect(translate('vi', error!.title)).toBe('Dữ liệu không đúng cấu trúc');
    expect(translate('vi', error!.detail)).toBe('Dữ liệu tải về không phải file Excel (XLSX).');
  });

  it('reports config errors', async () => {
    const configError = new ConfigError(msg('error.config.notObject'));
    const store = createAppStore(
      deps({
        loadConfig: async () => {
          throw configError;
        },
      }),
    );
    await store.getState().load();
    const { error } = store.getState();
    expect(error).toMatchObject({ code: 'CONFIG' });
    expect(translate('vi', error!.title)).toBe('Lỗi cấu hình');
    expect(translate('vi', error!.detail)).toBe('config.json phải là một object JSON.');
  });

  it('keeps the previous plan when a refresh fails', async () => {
    let fail = false;
    const store = createAppStore(
      deps({}, async () => {
        if (fail) throw new SourceError('NETWORK', msg('error.source.network'));
        return sampleWorkbook();
      }),
    );
    await store.getState().load();
    fail = true;
    const pending = store.getState().load();
    expect(store.getState().refreshing).toBe(true);
    await pending;
    const s = store.getState();
    expect(s.status).toBe('ready');
    expect(s.refreshing).toBe(false);
    expect(s.plan?.lines).toHaveLength(6);
    expect(s.refreshError?.code).toBe('NETWORK');
  });

  it('recomputes metrics when the cut-off changes', async () => {
    const store = createAppStore(deps());
    await store.getState().load();
    const before = store.getState().metrics.reduce((n, m) => n + m.overdueCount, 0);
    store.getState().setCutOff(dayFromISO('2030-01-01')!);
    const after = store.getState().metrics.reduce((n, m) => n + m.overdueCount, 0);
    expect(after).toBeGreaterThan(before);
  });

  it('toggles and persists the theme (dark by default)', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    expect(store.getState().theme).toBe('dark');
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('light');
    expect(storage.data['pms-peiw-theme']).toBe('light');
    expect(createAppStore(deps({ storage })).getState().theme).toBe('light');
  });

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createAppStore(deps({ storage: blocked }));
    expect(store.getState().theme).toBe('dark');
    expect(() => store.getState().toggleTheme()).not.toThrow();
  });

  it('defaults the language to English', () => {
    const store = createAppStore(deps({ storage: memoryStorage() }));
    expect(store.getState().lang).toBe('en');
  });

  it('restores a persisted Vietnamese language choice', () => {
    const storage = memoryStorage({ 'pms-peiw-lang': 'vi' });
    expect(createAppStore(deps({ storage })).getState().lang).toBe('vi');
  });

  it('falls back to English for an unrecognized stored value', () => {
    const storage = memoryStorage({ 'pms-peiw-lang': 'fr' });
    expect(createAppStore(deps({ storage })).getState().lang).toBe('en');
  });

  it('sets and persists the language', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    store.getState().setLang('vi');
    expect(store.getState().lang).toBe('vi');
    expect(storage.data['pms-peiw-lang']).toBe('vi');
    expect(createAppStore(deps({ storage })).getState().lang).toBe('vi');
  });

  it('survives blocked storage when reading or setting the language', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createAppStore(deps({ storage: blocked }));
    expect(store.getState().lang).toBe('en');
    expect(() => store.getState().setLang('vi')).not.toThrow();
  });
});
