import { ConfigError, type AppConfig } from '../config/config';
import { SourceError } from '../data/sources/sources';
import { msg } from '../i18n/message';
import { translate } from '../i18n/translate';
import { createModuleStore, ParseFailure, type ModuleLoader } from './moduleStore';

const CONFIG: AppConfig = {
  appName: 'PMS - PEIW',
  projectName: 'Test',
  dataSources: { procurement: { type: 'server', url: '/p.xlsx' } },
  dueSoonDays: 30,
};
const NOW = new Date(2026, 8, 21, 9, 0);

function make<T>(loader: ModuleLoader<T>, config: AppConfig = CONFIG, moduleId: 'procurement' | 'engineering' = 'procurement') {
  return createModuleStore<T>({ moduleId, loader, getConfig: () => config, now: () => NOW });
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('createModuleStore', () => {
  it('loads data and warnings through the loader, reporting steps', async () => {
    const steps: string[] = [];
    const store = make(async (source, ctx) => {
      expect(source.url).toBe('/p.xlsx');
      expect(ctx.config).toBe(CONFIG);
      ctx.onStep('parse');
      steps.push(store.getState().step);
      return { data: 'plan', warnings: [] };
    });
    expect(store.getState().status).toBe('idle');
    await store.getState().load();
    const s = store.getState();
    expect(steps).toEqual(['parse']);
    expect(s).toMatchObject({ status: 'ready', step: 'done', data: 'plan', warnings: [], refreshing: false });
    expect(s.lastSync).toEqual(NOW);
  });

  it('is unconfigured without a source and never calls the loader', async () => {
    const loader = vi.fn();
    const store = make(loader, CONFIG, 'engineering');
    await store.getState().load();
    expect(store.getState().status).toBe('unconfigured');
    expect(loader).not.toHaveBeenCalled();
  });

  it('does nothing before the config is loaded', async () => {
    const loader = vi.fn();
    const store = createModuleStore({ moduleId: 'procurement', loader, getConfig: () => undefined, now: () => NOW });
    await store.getState().load();
    expect(store.getState().status).toBe('idle');
    expect(loader).not.toHaveBeenCalled();
  });

  it('reports source errors when nothing is loaded yet', async () => {
    const store = make(async () => {
      throw new SourceError('ACCESS_DENIED', msg('error.source.accessDenied'), 403);
    });
    await store.getState().load();
    const { status, error } = store.getState();
    expect(status).toBe('error');
    expect(error?.code).toBe('ACCESS_DENIED');
    expect(translate('vi', error!.title)).toBe('Không tải được dữ liệu');
  });

  it('reports parse failures', async () => {
    const store = make(async () => {
      throw new ParseFailure('NOT_XLSX', msg('error.parse.notXlsx'));
    });
    await store.getState().load();
    const { error } = store.getState();
    expect(error?.code).toBe('NOT_XLSX');
    expect(translate('vi', error!.title)).toBe('Dữ liệu không đúng cấu trúc');
  });

  it('reports config errors', async () => {
    const store = make(async () => {
      throw new ConfigError(msg('error.config.notObject'));
    });
    await store.getState().load();
    expect(store.getState().error?.code).toBe('CONFIG');
  });

  it('keeps the previous data when a refresh fails', async () => {
    let fail = false;
    const store = make(async () => {
      if (fail) throw new SourceError('NETWORK', msg('error.source.network'));
      return { data: 'plan', warnings: [] };
    });
    await store.getState().load();
    fail = true;
    const pending = store.getState().load();
    expect(store.getState().refreshing).toBe(true);
    await pending;
    const s = store.getState();
    expect(s).toMatchObject({ status: 'ready', refreshing: false, data: 'plan' });
    expect(s.refreshError?.code).toBe('NETWORK');
  });

  it('lets the latest load win when two overlap', async () => {
    const first = deferred<{ data: string; warnings: [] }>();
    const second = deferred<{ data: string; warnings: [] }>();
    const results = [first, second];
    const store = make(async () => results.shift()!.promise);
    const a = store.getState().load();
    const b = store.getState().load();
    second.resolve({ data: 'new', warnings: [] });
    await b;
    first.resolve({ data: 'old', warnings: [] });
    await a;
    expect(store.getState().data).toBe('new');
  });
});
