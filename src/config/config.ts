import { msg, type Message } from '../i18n/message';
import { translate } from '../i18n/translate';

export type DataSourceType = 'google-sheet' | 'server';

export interface DataSourceConfig {
  type: DataSourceType;
  url: string;
  sheetName?: string;
}

/** Every module that can have its own data source. Order does not matter here. */
export const MODULE_IDS = ['procurement', 'engineering'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface AppConfig {
  appName: string;
  projectName: string;
  /** A module without an entry shows the "source not configured" screen. */
  dataSources: Partial<Record<ModuleId, DataSourceConfig>>;
  dueSoonDays: number;
}

export class ConfigError extends Error {
  readonly detail: Message;
  constructor(detail: Message) {
    super(translate('en', detail));
    this.name = 'ConfigError';
    this.detail = detail;
  }
}

const DEFAULTS = { appName: 'PMS - PEIW', projectName: 'Procurement Plan', dueSoonDays: 30 };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseSource(module: ModuleId, ds: unknown): DataSourceConfig {
  if (!isRecord(ds)) throw new ConfigError(msg('error.config.badSource', { module }));
  if (ds.type !== 'google-sheet' && ds.type !== 'server') {
    throw new ConfigError(msg('error.config.badType', { module }));
  }
  if (typeof ds.url !== 'string' || ds.url.trim() === '') {
    throw new ConfigError(msg('error.config.missingUrl', { module }));
  }
  return {
    type: ds.type,
    url: ds.url.trim(),
    sheetName: typeof ds.sheetName === 'string' && ds.sheetName.trim() ? ds.sheetName.trim() : undefined,
  };
}

/** Validate raw JSON and apply defaults. Throws ConfigError with a readable message. */
export function parseConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) throw new ConfigError(msg('error.config.notObject'));
  // The single `dataSource` key predates modules; it still means the procurement source.
  const entries: Record<string, unknown> = isRecord(raw.dataSources) ? { ...raw.dataSources } : {};
  if (entries.procurement === undefined && raw.dataSource !== undefined) entries.procurement = raw.dataSource;
  if (!MODULE_IDS.some((id) => entries[id] !== undefined)) throw new ConfigError(msg('error.config.missingDataSource'));
  const dataSources: AppConfig['dataSources'] = {};
  for (const id of MODULE_IDS) {
    if (entries[id] !== undefined) dataSources[id] = parseSource(id, entries[id]);
  }
  const dueSoonDays = raw.dueSoonDays ?? DEFAULTS.dueSoonDays;
  if (typeof dueSoonDays !== 'number' || !Number.isInteger(dueSoonDays) || dueSoonDays < 1) {
    throw new ConfigError(msg('error.config.badDueSoon'));
  }
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    appName: str(raw.appName, DEFAULTS.appName),
    projectName: str(raw.projectName, DEFAULTS.projectName),
    dataSources,
    dueSoonDays,
  };
}

/** Load `config.json` next to index.html; never cached. */
export async function loadConfig(fetchImpl: typeof fetch = fetch): Promise<AppConfig> {
  let response: Response;
  try {
    response = await fetchImpl('config.json', { cache: 'no-store' });
  } catch {
    throw new ConfigError(msg('error.config.fetchFailed'));
  }
  if (!response.ok) throw new ConfigError(msg('error.config.http', { status: response.status }));
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ConfigError(msg('error.config.badJson'));
  }
  return parseConfig(raw);
}
