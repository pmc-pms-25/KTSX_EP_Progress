import { msg, type Message } from '../i18n/message';
import { translate } from '../i18n/translate';

export type DataSourceType = 'google-sheet' | 'server';

export interface DataSourceConfig {
  type: DataSourceType;
  url: string;
  sheetName?: string;
}

export interface AppConfig {
  appName: string;
  projectName: string;
  dataSource: DataSourceConfig;
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

/** Validate raw JSON and apply defaults. Throws ConfigError with a readable message. */
export function parseConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) throw new ConfigError(msg('error.config.notObject'));
  const ds = raw.dataSource;
  if (!isRecord(ds)) throw new ConfigError(msg('error.config.missingDataSource'));
  if (ds.type !== 'google-sheet' && ds.type !== 'server') {
    throw new ConfigError(msg('error.config.badType'));
  }
  if (typeof ds.url !== 'string' || ds.url.trim() === '') {
    throw new ConfigError(msg('error.config.missingUrl'));
  }
  const dueSoonDays = raw.dueSoonDays ?? DEFAULTS.dueSoonDays;
  if (typeof dueSoonDays !== 'number' || !Number.isInteger(dueSoonDays) || dueSoonDays < 1) {
    throw new ConfigError(msg('error.config.badDueSoon'));
  }
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    appName: str(raw.appName, DEFAULTS.appName),
    projectName: str(raw.projectName, DEFAULTS.projectName),
    dataSource: {
      type: ds.type,
      url: ds.url.trim(),
      sheetName: typeof ds.sheetName === 'string' && ds.sheetName.trim() ? ds.sheetName.trim() : undefined,
    },
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
