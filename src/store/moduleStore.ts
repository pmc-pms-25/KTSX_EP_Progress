import { createStore, type StoreApi } from 'zustand/vanilla';
import type { AppConfig, ConfigError, DataSourceConfig, ModuleId } from '../config/config';
import { SourceError } from '../data/sources/sources';
import type { DataWarning } from '../data/types';
import { msg, type Message } from '../i18n/message';

export type LoadStep = 'config' | 'fetch' | 'parse' | 'analyze' | 'done';

export interface LoadError {
  title: Message;
  detail: Message;
  code: string;
}

/** Thrown by a loader when the bytes arrived but do not have the expected structure. */
export class ParseFailure extends Error {
  readonly code: string;
  readonly detail: Message;
  constructor(code: string, detail: Message, message: string = code) {
    super(message);
    this.name = 'ParseFailure';
    this.code = code;
    this.detail = detail;
  }
}

export function toLoadError(error: unknown): LoadError {
  if (error instanceof ParseFailure) return { title: msg('error.title.parse'), detail: error.detail, code: error.code };
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
export const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface LoadContext {
  signal: AbortSignal;
  now: Date;
  config: AppConfig;
  onStep(step: LoadStep, detail?: Message): void;
}

/** Turns a module's configured source into its data. Throws SourceError / ParseFailure / anything else. */
export type ModuleLoader<T> = (source: DataSourceConfig, ctx: LoadContext) => Promise<{ data: T; warnings: DataWarning[] }>;

export type ModuleStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

export interface ModuleState<T> {
  status: ModuleStatus;
  /** True while reloading on top of data that is already shown. */
  refreshing: boolean;
  step: LoadStep;
  /** Extra detail for the current step, e.g. "573 lines". */
  stepDetail?: Message;
  data?: T;
  warnings: DataWarning[];
  lastSync?: Date;
  /** Set when there is nothing to show. */
  error?: LoadError;
  /** Set when a refresh failed but older data is still shown. */
  refreshError?: LoadError;
  load(): Promise<void>;
}

export type ModuleStore<T> = StoreApi<ModuleState<T>>;

export interface ModuleStoreDeps<T> {
  moduleId: ModuleId;
  loader: ModuleLoader<T>;
  getConfig: () => AppConfig | undefined;
  now: () => Date;
}

/** One store per module: loads its own source on demand, keeps old data when a refresh fails. */
export function createModuleStore<T>(deps: ModuleStoreDeps<T>): ModuleStore<T> {
  let inFlight: AbortController | undefined;

  return createStore<ModuleState<T>>()((set, get) => ({
    status: 'idle',
    refreshing: false,
    step: 'fetch',
    warnings: [],

    async load() {
      const config = deps.getConfig();
      if (!config) return;

      const source = config.dataSources[deps.moduleId];
      if (!source) {
        set({ status: 'unconfigured' });
        return;
      }

      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const hadData = get().data !== undefined;
      set({ status: hadData ? 'ready' : 'loading', refreshing: hadData, step: 'fetch', stepDetail: undefined, refreshError: undefined });

      try {
        const { data, warnings } = await deps.loader(source, {
          signal: controller.signal,
          now: deps.now(),
          config,
          onStep: (step, detail) => {
            if (!controller.signal.aborted) set({ step, stepDetail: detail });
          },
        });
        if (controller.signal.aborted) return;
        set({ data, warnings, lastSync: deps.now(), status: 'ready', refreshing: false, step: 'done', error: undefined });
      } catch (error) {
        if (controller.signal.aborted) return;
        const loadError = toLoadError(error);
        if (get().data !== undefined) set({ status: 'ready', refreshing: false, refreshError: loadError, step: 'done' });
        else set({ status: 'error', refreshing: false, error: loadError });
      }
    },
  }));
}
