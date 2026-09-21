import { createStore } from 'zustand/vanilla';
import { loadConfig as defaultLoadConfig, type AppConfig, type ModuleId } from '../config/config';
import type { Lang } from '../i18n/message';
import { todayDay, type Day } from '../lib/day';
import { toLoadError, type LoadError } from './moduleStore';

export type { LoadError, LoadStep } from './moduleStore';
export type Theme = 'dark' | 'light';

/** App-wide state shared by every module. Module data lives in each module's own store. */
export interface AppState {
  configStatus: 'idle' | 'loading' | 'ready' | 'error';
  config?: AppConfig;
  configError?: LoadError;
  cutOff: Day;
  theme: Theme;
  lang: Lang;
  sidebarCollapsed: boolean;
  /** Last filter query string (e.g. "?discipline=A") per module, so the sidebar can restore it. */
  lastQuery: Partial<Record<ModuleId, string>>;
  loadConfig(): Promise<void>;
  setCutOff(day: Day): void;
  toggleTheme(): void;
  setLang(lang: Lang): void;
  toggleSidebar(): void;
  setLastQuery(id: ModuleId, query: string): void;
}

export interface StoreDeps {
  loadConfig: typeof defaultLoadConfig;
  now: () => Date;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

const THEME_KEY = 'pms-peiw-theme';
const LANG_KEY = 'pms-peiw-lang';
const SIDEBAR_KEY = 'pms-peiw-sidebar';

function safeStorage(): StoreDeps['storage'] {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function read(storage: StoreDeps['storage'], key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: StoreDeps['storage'], key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be blocked; the choice still applies for this session.
  }
}

export function createAppStore(deps: StoreDeps) {
  const storage = deps.storage;

  return createStore<AppState>()((set, get) => ({
    configStatus: 'idle',
    cutOff: todayDay(deps.now()),
    theme: read(storage, THEME_KEY) === 'light' ? 'light' : 'dark',
    lang: read(storage, LANG_KEY) === 'vi' ? 'vi' : 'en',
    sidebarCollapsed: read(storage, SIDEBAR_KEY) === 'collapsed',
    lastQuery: {},

    async loadConfig() {
      const { configStatus } = get();
      if (configStatus === 'loading' || configStatus === 'ready') return;
      set({ configStatus: 'loading', configError: undefined });
      try {
        set({ config: await deps.loadConfig(), configStatus: 'ready' });
      } catch (error) {
        set({ configStatus: 'error', configError: toLoadError(error) });
      }
    },

    setCutOff(day) {
      set({ cutOff: day });
    },

    toggleTheme() {
      const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
      write(storage, THEME_KEY, theme);
      set({ theme });
    },

    setLang(lang) {
      write(storage, LANG_KEY, lang);
      set({ lang });
    },

    toggleSidebar() {
      const sidebarCollapsed = !get().sidebarCollapsed;
      write(storage, SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'expanded');
      set({ sidebarCollapsed });
    },

    setLastQuery(id, query) {
      if (get().lastQuery[id] === query) return;
      set({ lastQuery: { ...get().lastQuery, [id]: query } });
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;

export const appStore: AppStore = createAppStore({
  loadConfig: defaultLoadConfig,
  now: () => new Date(),
  storage: safeStorage(),
});
