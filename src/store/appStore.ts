import { createStore } from 'zustand/vanilla';
import { computeAllMetrics, type LineMetrics } from '../analytics/lineMetrics';
import { ConfigError, loadConfig as defaultLoadConfig, type AppConfig } from '../config/config';
import { parsePlan as defaultParsePlan } from '../data/parser/parsePlan';
import { createDataSource as defaultCreateDataSource, SourceError } from '../data/sources/sources';
import type { Plan } from '../data/types';
import { msg, type Lang, type Message } from '../i18n/message';
import { todayDay, type Day } from '../lib/day';

export type LoadStep = 'config' | 'fetch' | 'parse' | 'analyze' | 'done';
export type Theme = 'dark' | 'light';

export interface LoadError {
  title: Message;
  detail: Message;
  code: string;
}

export interface AppState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** True while reloading on top of data that is already shown. */
  refreshing: boolean;
  step: LoadStep;
  /** Extra detail for the current step, e.g. "573 lines". */
  stepDetail?: Message;
  config?: AppConfig;
  plan?: Plan;
  metrics: LineMetrics[];
  /** Set when a refresh failed but older data is still shown. */
  refreshError?: LoadError;
  /** Set when there is nothing to show. */
  error?: LoadError;
  cutOff: Day;
  theme: Theme;
  lang: Lang;
  load(): Promise<void>;
  setCutOff(day: Day): void;
  toggleTheme(): void;
  setLang(lang: Lang): void;
}

export interface StoreDeps {
  loadConfig: typeof defaultLoadConfig;
  createDataSource: typeof defaultCreateDataSource;
  parsePlan: typeof defaultParsePlan;
  now: () => Date;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

const THEME_KEY = 'pms-peiw-theme';
const LANG_KEY = 'pms-peiw-lang';

function safeStorage(): StoreDeps['storage'] {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function readTheme(storage: StoreDeps['storage']): Theme {
  try {
    return storage?.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function readLang(storage: StoreDeps['storage']): Lang {
  try {
    return storage?.getItem(LANG_KEY) === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

function toLoadError(error: unknown): LoadError {
  if (error instanceof SourceError) return { title: msg('error.title.source'), detail: error.detail, code: error.code };
  if (error instanceof Error && error.name === 'ConfigError') {
    return { title: msg('error.title.config'), detail: (error as ConfigError).detail, code: 'CONFIG' };
  }
  return {
    title: msg('error.title.unknown'),
    detail: msg('error.unknown', { text: error instanceof Error ? error.message : String(error) }),
    code: 'UNKNOWN',
  };
}

/** Yield to the browser so each loading step can paint. */
const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function createAppStore(deps: StoreDeps) {
  const storage = deps.storage;
  let inFlight: AbortController | undefined;

  return createStore<AppState>()((set, get) => ({
    status: 'idle',
    refreshing: false,
    step: 'config',
    metrics: [],
    cutOff: todayDay(deps.now()),
    theme: readTheme(storage),
    lang: readLang(storage),

    async load() {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const hadPlan = get().plan !== undefined;
      set({ status: hadPlan ? 'ready' : 'loading', refreshing: hadPlan, step: 'config', stepDetail: undefined, refreshError: undefined });
      try {
        const config = get().config ?? (await deps.loadConfig());
        if (controller.signal.aborted) return;
        set({ config, step: 'fetch', stepDetail: undefined });
        const source = config.dataSources.procurement;
        if (!source) throw new ConfigError(msg('error.config.missingDataSource'));
        const buf = await deps.createDataSource(source).load(controller.signal);
        if (controller.signal.aborted) return;
        set({ step: 'parse' });
        await nextFrame();
        const parsed = deps.parsePlan(buf, { projectName: config.projectName, sheetName: source.sheetName, now: deps.now() });
        if (!parsed.ok) {
          throw Object.assign(new Error(parsed.error.message), { name: 'ParseError', code: parsed.error.code, detail: parsed.error.detail });
        }
        set({ step: 'analyze', stepDetail: msg('status.linesLoaded', { count: parsed.plan.lines.length }) });
        await nextFrame();
        const metrics = computeAllMetrics(parsed.plan.lines, { cutOff: get().cutOff, dueSoonDays: config.dueSoonDays });
        if (controller.signal.aborted) return;
        set({ plan: parsed.plan, metrics, status: 'ready', refreshing: false, step: 'done', error: undefined });
      } catch (error) {
        if (controller.signal.aborted) return;
        const loadError: LoadError =
          error instanceof Error && error.name === 'ParseError'
            ? {
                title: msg('error.title.parse'),
                detail: (error as Error & { code: string; detail: Message }).detail,
                code: (error as Error & { code: string }).code,
              }
            : toLoadError(error);
        if (get().plan) set({ status: 'ready', refreshing: false, refreshError: loadError, step: 'done' });
        else set({ status: 'error', refreshing: false, error: loadError });
      }
    },

    setCutOff(day) {
      const { plan, config } = get();
      set({
        cutOff: day,
        metrics: plan && config ? computeAllMetrics(plan.lines, { cutOff: day, dueSoonDays: config.dueSoonDays }) : [],
      });
    },

    toggleTheme() {
      const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
      try {
        storage?.setItem(THEME_KEY, theme);
      } catch {
        // Storage can be blocked; the theme still applies for this session.
      }
      set({ theme });
    },

    setLang(lang) {
      try {
        storage?.setItem(LANG_KEY, lang);
      } catch {
        // Storage can be blocked; the language still applies for this session.
      }
      set({ lang });
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;

export const appStore: AppStore = createAppStore({
  loadConfig: defaultLoadConfig,
  createDataSource: defaultCreateDataSource,
  parsePlan: defaultParsePlan,
  now: () => new Date(),
  storage: safeStorage(),
});
