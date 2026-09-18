import { createStore } from 'zustand/vanilla';
import { computeAllMetrics, type LineMetrics } from '../analytics/lineMetrics';
import { loadConfig as defaultLoadConfig, type AppConfig } from '../config/config';
import { parsePlan as defaultParsePlan } from '../data/parser/parsePlan';
import { createDataSource as defaultCreateDataSource, SourceError } from '../data/sources/sources';
import type { Plan } from '../data/types';
import { todayDay, type Day } from '../lib/day';

export type LoadStep = 'config' | 'fetch' | 'parse' | 'analyze' | 'done';
export type Theme = 'dark' | 'light';

export interface LoadError {
  title: string;
  message: string;
  code: string;
}

export interface AppState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** True while reloading on top of data that is already shown. */
  refreshing: boolean;
  step: LoadStep;
  /** Extra detail for the current step, e.g. "573 dòng". */
  stepDetail?: string;
  config?: AppConfig;
  plan?: Plan;
  metrics: LineMetrics[];
  /** Set when a refresh failed but older data is still shown. */
  refreshError?: LoadError;
  /** Set when there is nothing to show. */
  error?: LoadError;
  cutOff: Day;
  theme: Theme;
  load(): Promise<void>;
  setCutOff(day: Day): void;
  toggleTheme(): void;
}

export interface StoreDeps {
  loadConfig: typeof defaultLoadConfig;
  createDataSource: typeof defaultCreateDataSource;
  parsePlan: typeof defaultParsePlan;
  now: () => Date;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

const THEME_KEY = 'pms-peiw-theme';

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

function toLoadError(error: unknown): LoadError {
  if (error instanceof SourceError) return { title: 'Không tải được dữ liệu', message: error.message, code: error.code };
  if (error instanceof Error && error.name === 'ConfigError') return { title: 'Lỗi cấu hình', message: error.message, code: 'CONFIG' };
  return { title: 'Lỗi không xác định', message: error instanceof Error ? error.message : String(error), code: 'UNKNOWN' };
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

    async load() {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const hadPlan = get().plan !== undefined;
      set({ status: hadPlan ? 'ready' : 'loading', refreshing: hadPlan, step: 'config', stepDetail: undefined, refreshError: undefined });
      try {
        const config = get().config ?? (await deps.loadConfig());
        set({ config, step: 'fetch', stepDetail: undefined });
        const buf = await deps.createDataSource(config.dataSource).load(controller.signal);
        if (controller.signal.aborted) return;
        set({ step: 'parse' });
        await nextFrame();
        const parsed = deps.parsePlan(buf, { projectName: config.projectName, sheetName: config.dataSource.sheetName, now: deps.now() });
        if (!parsed.ok) throw Object.assign(new Error(parsed.error.message), { name: 'ParseError', code: parsed.error.code });
        set({ step: 'analyze', stepDetail: `${parsed.plan.lines.length} dòng` });
        await nextFrame();
        const metrics = computeAllMetrics(parsed.plan.lines, { cutOff: get().cutOff, dueSoonDays: config.dueSoonDays });
        if (controller.signal.aborted) return;
        set({ plan: parsed.plan, metrics, status: 'ready', refreshing: false, step: 'done', error: undefined });
      } catch (error) {
        if (controller.signal.aborted) return;
        const loadError =
          error instanceof Error && error.name === 'ParseError'
            ? { title: 'Dữ liệu không đúng cấu trúc', message: error.message, code: (error as Error & { code: string }).code }
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
