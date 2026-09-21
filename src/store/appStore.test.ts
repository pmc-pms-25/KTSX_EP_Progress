import { ConfigError, type AppConfig } from '../config/config';
import { msg } from '../i18n/message';
import { translate } from '../i18n/translate';
import { dayFromISO } from '../lib/day';
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

const blocked = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

function deps(overrides: Partial<StoreDeps> = {}): StoreDeps {
  return { loadConfig: async () => CONFIG, now: () => new Date(2026, 8, 18), storage: memoryStorage(), ...overrides };
}

describe('appStore', () => {
  it('loads the config once', async () => {
    const loadConfig = vi.fn(async () => CONFIG);
    const store = createAppStore(deps({ loadConfig }));
    expect(store.getState().configStatus).toBe('idle');
    await store.getState().loadConfig();
    await store.getState().loadConfig();
    expect(store.getState()).toMatchObject({ configStatus: 'ready', config: CONFIG });
    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(store.getState().cutOff).toBe(dayFromISO('2026-09-18'));
  });

  it('reports config errors and can retry', async () => {
    let fail = true;
    const store = createAppStore(
      deps({
        loadConfig: async () => {
          if (fail) throw new ConfigError(msg('error.config.notObject'));
          return CONFIG;
        },
      }),
    );
    await store.getState().loadConfig();
    const { configStatus, configError } = store.getState();
    expect(configStatus).toBe('error');
    expect(configError?.code).toBe('CONFIG');
    expect(translate('vi', configError!.title)).toBe('Lỗi cấu hình');
    fail = false;
    await store.getState().loadConfig();
    expect(store.getState().configStatus).toBe('ready');
  });

  it('sets the cut-off', () => {
    const store = createAppStore(deps());
    store.getState().setCutOff(dayFromISO('2030-01-01')!);
    expect(store.getState().cutOff).toBe(dayFromISO('2030-01-01'));
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

  it('defaults the language to English and persists a choice', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    expect(store.getState().lang).toBe('en');
    store.getState().setLang('vi');
    expect(storage.data['pms-peiw-lang']).toBe('vi');
    expect(createAppStore(deps({ storage })).getState().lang).toBe('vi');
    expect(createAppStore(deps({ storage: memoryStorage({ 'pms-peiw-lang': 'fr' }) })).getState().lang).toBe('en');
  });

  it('toggles and persists the sidebar (expanded by default)', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    expect(store.getState().sidebarCollapsed).toBe(false);
    store.getState().toggleSidebar();
    expect(store.getState().sidebarCollapsed).toBe(true);
    expect(storage.data['pms-peiw-sidebar']).toBe('collapsed');
    expect(createAppStore(deps({ storage })).getState().sidebarCollapsed).toBe(true);
  });

  it('remembers the last filter query per module', () => {
    const store = createAppStore(deps());
    store.getState().setLastQuery('procurement', '?discipline=A');
    store.getState().setLastQuery('engineering', '');
    expect(store.getState().lastQuery).toEqual({ procurement: '?discipline=A', engineering: '' });
  });

  it('survives blocked storage', () => {
    const store = createAppStore(deps({ storage: blocked }));
    expect(store.getState()).toMatchObject({ theme: 'dark', lang: 'en', sidebarCollapsed: false });
    expect(() => {
      store.getState().toggleTheme();
      store.getState().setLang('vi');
      store.getState().toggleSidebar();
    }).not.toThrow();
  });
});
